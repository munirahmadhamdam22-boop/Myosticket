<?php
/*********************************************************************
    class.voice.php

    Voice message helper for osTicket.

  
 **********************************************************************/

require_once INCLUDE_DIR . 'class.file.php';

class VoiceMessage {

    static $voiceMimeTypes = array(
        'audio/webm',
        'audio/mp3',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/x-m4a',
        'audio/mp4',
        'audio/aiff',
    );

    static function isVoiceMessage($file) {
        if (!$file || !($file instanceof AttachmentFile))
            return false;

        $type = strtolower($file->getType());
        foreach (self::$voiceMimeTypes as $mime) {
            if ($type === $mime)
                return true;
        }
        return false;
    }

    static function isVoiceMimeType($mime) {
        return in_array(strtolower($mime), self::$voiceMimeTypes);
    }

    static function getAllowedMimeTypes() {
        return self::$voiceMimeTypes;
    }

    static function getPlayerHtml($file, $options=array()) {
        if (!$file || !($file instanceof AttachmentFile))
            return '';

        $url = $file->getDownloadUrl();
        $name = Format::htmlchars(isset($options['sender'])
            ? $options['sender'] : $file->getName());
        $size = Format::file_size($file->getSize());

        $autoplay = isset($options['autoplay']) ? 'autoplay' : '';
        $id = 'voice-player-' . $file->getId();

        return sprintf(
            '<div class="voice-message-player" id="%s">'
            . '<div class="voice-message-info">'
            . '<span class="voice-message-icon" aria-hidden="true">🎤</span>'
            . '<span class="voice-message-name">%s</span>'
            . '<span class="voice-message-size faded">%s</span>'
            . '</div>'
            . '<audio controls preload="metadata" %s style="width:100%%;max-width:400px;">'
            . '<source src="%s" type="%s">'
            . 'Your browser does not support audio playback.'
            . '</audio>'
            . '<div class="voice-message-actions">'
            . '<a class="no-pjax" href="%s" download="%s">'
            . '<i class="icon-download-alt"></i> ' . 'Download' . '</a>'
            . '</div>'
            . '</div>',
            $id,
            $name,
            $size,
            $autoplay,
            $url,
            $file->getType(),
            $url,
            $name
        );
    }

    static function getInlinePlayerHtml($file) {
        return self::getPlayerHtml($file);
    }
}
