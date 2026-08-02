/*
 * Voice Message Recording Widget for osTicket
 *
 * Features:
 * - Microphone recording via MediaRecorder API
 * - Preview playback before sending
 * - Delete and re-record
 * - Upload via existing osTicket AJAX endpoint
 * - Browser compatibility detection
 */
!function($) {
  "use strict";

  var VoiceRecorder = function(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, $.fn.voicerecorder.defaults, options);
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioBlob = null;
    this.audioUrl = null;
    this.stream = null;
    this.timerInterval = null;
    this.recordingSeconds = 0;
    this.fileId = null;
    this.isRecording = false;
    this.isPaused = false;
    this.isUploading = false;

    this.init();
  };

  VoiceRecorder.prototype = {
    init: function() {
      var that = this;
      this.$element.addClass('voice-recorder');

      if (!this.isSupported()) {
        this.renderUnsupported();
        return;
      }

      this.render();
      this.bindEvents();
    },

    isSupported: function() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    },

    render: function() {
      var html = '<div class="voice-recorder-toolbar">'
        + '<button type="button" class="voice-recorder-btn" title="' + this.options.labelRecord + '" aria-label="' + this.options.labelRecord + '">'
        + '<i class="icon-microphone"></i><span class="voice-recorder-label"> ' + this.options.labelRecord + '</span></button>'
        + '</div>'
        + '<div class="voice-recorder-panel" style="display:none;">'
        + '<div class="voice-recorder-status">'
        + '<span class="voice-recorder-timer">00:00</span>'
        + '<span class="voice-recorder-indicator"></span>'
        + '</div>'
        + '<div class="voice-recorder-preview" style="display:none;">'
        + '<audio controls style="width:100%;max-width:300px;"></audio>'
        + '</div>'
        + '<div class="voice-recorder-actions">'
        + '<button type="button" class="voice-recorder-stop" disabled>'
        + '<i class="icon-stop"></i> ' + this.options.labelStop + '</button>'
        + '<button type="button" class="voice-recorder-delete" disabled>'
        + '<i class="icon-trash"></i> ' + this.options.labelDelete + '</button>'
        + '<button type="button" class="voice-recorder-cancel">'
        + '<i class="icon-remove"></i> ' + this.options.labelCancel + '</button>'
        + '</div>'
        + '<div class="voice-recorder-error" style="display:none;"></div>'
        + '</div>';

      this.$element.append(html);
      this.$toolbar = this.$element.find('.voice-recorder-toolbar');
      this.$panel = this.$element.find('.voice-recorder-panel');
      this.$timer = this.$element.find('.voice-recorder-timer');
      this.$indicator = this.$element.find('.voice-recorder-indicator');
      this.$preview = this.$element.find('.voice-recorder-preview');
      this.$previewAudio = this.$preview.find('audio');
      this.$btnRecord = this.$element.find('.voice-recorder-btn');
      this.$btnStop = this.$element.find('.voice-recorder-stop');
      this.$btnDelete = this.$element.find('.voice-recorder-delete');
      this.$btnCancel = this.$element.find('.voice-recorder-cancel');
      this.$error = this.$element.find('.voice-recorder-error');
    },

    renderUnsupported: function() {
      this.$element.addClass('voice-recorder-unsupported');
      this.$element.append('<p class="error">' + this.options.labelUnsupported + '</p>');
    },

    bindEvents: function() {
      var that = this;
      this.$btnRecord.on('click.voicerecorder', function(e) {
        e.preventDefault();
        that.startRecording();
      });
      this.$btnStop.on('click.voicerecorder', function(e) {
        e.preventDefault();
        that.stopRecording();
      });
      this.$btnDelete.on('click.voicerecorder', function(e) {
        e.preventDefault();
        that.deleteRecording();
      });
      this.$btnCancel.on('click.voicerecorder', function(e) {
        e.preventDefault();
        that.cancelRecording();
      });
    },

    startRecording: function() {
      var that = this;
      this.resetError();

      if (this.isRecording) return;

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
          that.stream = stream;
          that.audioChunks = [];
          that.recordingSeconds = 0;
          that.updateTimer();

          var mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }

          try {
            that.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType: mimeType } : undefined);
          } catch (e) {
            that.showError(that.options.labelErrorInit);
            that.cleanup();
            return;
          }

          that.mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0)
              that.audioChunks.push(e.data);
          };

          that.mediaRecorder.onstop = function() {
            that.onRecordingComplete();
          };

          that.mediaRecorder.onerror = function(e) {
            that.showError(that.options.labelErrorRecord);
            that.cleanup();
          };

          that.mediaRecorder.start();
          that.isRecording = true;
          that.$element.closest('.message-composer').addClass('is-recording');
          that.$toolbar.hide();
          that.$panel.show();
          that.$indicator.addClass('recording');
          that.$btnStop.prop('disabled', false);
          that.startTimer();
        })
        .catch(function(err) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            that.showError(that.options.labelErrorPermission);
          } else if (err.name === 'NotFoundError') {
            that.showError(that.options.labelErrorNoMic);
          } else {
            that.showError(that.options.labelErrorInit);
          }
        });
    },

    stopRecording: function() {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.stopTimer();
        this.$indicator.removeClass('recording');
        this.$btnStop.prop('disabled', true);
      }
    },

    onRecordingComplete: function() {
      var that = this;
      var mimeType = 'audio/webm';
      if (this.mediaRecorder && this.mediaRecorder.mimeType) {
        mimeType = this.mediaRecorder.mimeType;
      }

      this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
      this.audioUrl = URL.createObjectURL(this.audioBlob);
      this.$previewAudio.attr('src', this.audioUrl);
      this.$preview.show();
      this.$btnDelete.prop('disabled', false);
      this.cleanupStream();

      if (this.options.autoUpload) {
        this.upload(
          function(json) {
            that.$element.trigger('voiceuploaded', [json]);
          },
          function() {
            that.showError(that.options.labelErrorUpload);
          }
        );
      } else if (this.options.filedropFileInputId) {
        this.uploadViaFiledrop(
          function(json) {
            that.$element.trigger('voiceuploaded', [json]);
          },
          function() {
            that.showError(that.options.labelErrorUpload);
          }
        );
      }
    },

    deleteRecording: function() {
      this.audioBlob = null;
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }
      this.$preview.hide();
      this.$previewAudio.removeAttr('src');
      this.$btnDelete.prop('disabled', true);
      this.resetTimer();
      this.showToolbar();
      this.fileId = null;
      this.$element.find('input[type=hidden]').remove();
      this.triggerChange();
    },

    cancelRecording: function() {
      this.deleteRecording();
      this.$panel.hide();
    },

    upload: function(onSuccess, onError) {
      var that = this;
      if (!this.audioBlob || !this.options.uploadUrl) {
        if (onError) onError();
        return;
      }

      if (this.options.maxFileSize && this.audioBlob.size > this.options.maxFileSize) {
        this.showError(this.options.labelErrorSize || 'Voice message exceeds maximum file size.');
        if (onError) onError();
        return;
      }

      var $submitBtn = this.$element.closest('form').find('input[type=submit]');
      $submitBtn.prop('disabled', true);
      this.isUploading = true;

      var formData = new FormData();
      formData.append('upload[]', this.audioBlob, this.getFileName());
      formData.append('__form', this.options.formId || '');

      if (this.options.uploadFieldId) {
        formData.append('__pid', this.options.uploadFieldId);
      }

      var csrfToken = $('meta[name=csrf_token]').attr('content') || '';
      if (!csrfToken) {
          csrfToken = this.$element.closest('form').find('input[name=__CSRFToken__]').val() || '';
      }
      if (csrfToken) {
          formData.append('__CSRFToken__', csrfToken);
      }

      var xhr = new XMLHttpRequest();
      xhr.open('POST', this.options.uploadUrl, true);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var json = JSON.parse(xhr.responseText);
          if (json.id) {
              that.fileId = json.id;
              that.$element.find('input[type=hidden]').remove();
              if (that.options.uploadFieldName) {
                  var $hidden = $('<input type="hidden">')
                    .attr('name', that.options.uploadFieldName)
                    .val(json.id + ',' + that.getFileName());
                  that.$element.append($hidden);
              }
              that.triggerChange();
              if (onSuccess) onSuccess(json);
          } else {
              that.showError(that.options.labelErrorUpload);
              if (onError) onError();
            }
          } catch (e) {
            that.showError(that.options.labelErrorUpload);
            if (onError) onError();
          }
        } else {
          that.showError(that.options.labelErrorUpload);
          if (onError) onError();
        }
        $submitBtn.prop('disabled', false);
        that.isUploading = false;
      };

      xhr.onerror = function() {
        that.showError(that.options.labelErrorUpload);
        if (onError) onError();
        $submitBtn.prop('disabled', false);
        that.isUploading = false;
      };

      xhr.send(formData);
    },

    getFileName: function() {
      var ext = 'webm';
      if (this.audioBlob && this.audioBlob.type) {
        var type = this.audioBlob.type.toLowerCase();
        if (type.indexOf('mp3') !== -1 || type.indexOf('mpeg') !== -1) ext = 'mp3';
        else if (type.indexOf('wav') !== -1) ext = 'wav';
        else if (type.indexOf('ogg') !== -1) ext = 'ogg';
        else if (type.indexOf('mp4') !== -1 || type.indexOf('m4a') !== -1) ext = 'm4a';
        else if (type.indexOf('webm') !== -1) ext = 'webm';
      }
      return 'voice-message-' + Date.now() + '.' + ext;
    },

    getFileId: function() {
      return this.fileId;
    },

    hasRecording: function() {
      return !!this.audioBlob;
    },

    startTimer: function() {
      var that = this;
      this.timerInterval = setInterval(function() {
        that.recordingSeconds++;
        if (that.recordingSeconds >= that.options.maxDuration) {
          that.stopRecording();
        }
        that.updateTimer();
      }, 1000);
    },

    stopTimer: function() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },

    resetTimer: function() {
      this.stopTimer();
      this.recordingSeconds = 0;
      this.updateTimer();
    },

    updateTimer: function() {
      var mins = Math.floor(this.recordingSeconds / 60);
      var secs = this.recordingSeconds % 60;
      this.$timer.text(
        (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs
      );
    },

    showError: function(msg) {
      this.$error.text(msg).show();
    },

    resetError: function() {
      this.$error.hide().text('');
    },

    showToolbar: function() {
      this.$element.closest('.message-composer').removeClass('is-recording');
      this.$toolbar.show();
      this.$panel.hide();
    },

    cleanup: function() {
      this.isRecording = false;
      this.stopTimer();
      this.cleanupStream();
      this.$indicator.removeClass('recording');
      this.$btnStop.prop('disabled', true);
    },

    cleanupStream: function() {
      if (this.stream) {
        this.stream.getTracks().forEach(function(track) {
          track.stop();
        });
        this.stream = null;
      }
    },

    reset: function() {
      this.deleteRecording();
      this.$panel.hide();
      this.showToolbar();
      this.fileId = null;
      this.$element.find('input[type=hidden]').remove();
    },

    triggerChange: function() {
      this.$element.trigger('voicechange', [this.hasRecording()]);
    },

    destroy: function() {
      this.cleanup();
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
      }
      this.$element.empty();
      this.$element.removeClass('voice-recorder');
      this.$element.removeData('voicerecorder');
    }
  };

  $.fn.voicerecorder = function(option, value) {
    return this.each(function() {
      var $this = $(this);
      var data = $this.data('voicerecorder');
      var options = typeof option === 'object' ? option : {};

      if (!data) {
        $this.data('voicerecorder', (data = new VoiceRecorder(this, options)));
      }

      if (typeof option === 'string') {
        data[option](value);
      }
    });
  };

  $.fn.voicerecorder.defaults = {
    uploadUrl: '',
    formId: '',
    uploadFieldId: '',
    uploadFieldName: '',
    maxDuration: 120,
    maxFileSize: 0,
    autoUpload: true,
    labelRecord: 'Record',
    labelStop: 'Stop',
    labelDelete: 'Delete',
    labelCancel: 'Cancel',
    labelUnsupported: 'Your browser does not support voice recording.',
    labelErrorInit: 'Unable to initialize voice recording.',
    labelErrorRecord: 'An error occurred during recording.',
    labelErrorPermission: 'Microphone permission denied.',
    labelErrorNoMic: 'No microphone found.',
    labelErrorUpload: 'Failed to upload voice message.',
    labelErrorDuration: 'Recording exceeds maximum duration.',
    labelErrorSize: 'Voice message exceeds maximum file size.'
  };

}(jQuery);
