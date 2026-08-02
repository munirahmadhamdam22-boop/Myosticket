<?php
require 'bootstrap.php';
require_once INCLUDE_DIR.'class.dispatcher.php';

$dispatcher = patterns('',
    url('^/config/', patterns('ajax.config.php:ConfigAjaxAPI',
        url_get('^client$', 'client')
    )),
    url('^/draft/', patterns('ajax.draft.php:DraftAjaxAPI',
        url_post('^(?P<id>\d+)$', 'updateDraftClient'),
        url_delete('^(?P<id>\d+)$', 'deleteDraftClient'),
        url_post('^(?P<id>\d+)/attach$', 'uploadInlineImageClient'),
        url_post('^(?P<namespace>[\w.]+)/attach$', 'uploadInlineImageEarlyClient'),
        url_get('^(?P<namespace>[\w.]+)$', 'getDraftClient'),
        url_post('^(?P<namespace>[\w.]+)$', 'createDraftClient')
    )),
    url('^/form/', patterns('ajax.forms.php:DynamicFormsAjaxAPI',
        url_post('^upload/(\d+)?$', 'upload'),
        url_post('^upload/(\w+)?$', 'attach'),
        url_post('^upload/(?P<object>ticket|task)/(\w+)$', 'attach')
    )),
    url('^/i18n/(?P<lang>[\w_]+)/', patterns('ajax.i18n.php:i18nAjaxAPI',
        url_get('(?P<tag>\w+)$', 'getLanguageFile')
    ))
);

$testUrls = [
    '/form/upload/ticket/attach',
    '/form/upload/task/attach',
    '/form/upload/123',
    '/form/upload/abc',
    '/form/upload/',
];

foreach ($testUrls as $url) {
    echo "Testing URL: $url\n";
    try {
        $result = $dispatcher->resolve($url);
        echo "  Result: SUCCESS\n";
    } catch (Exception $e) {
        echo "  Result: " . $e->getMessage() . "\n";
    } catch (Error $e) {
        echo "  Result: " . $e->getMessage() . "\n";
    }
    echo "\n";
}
