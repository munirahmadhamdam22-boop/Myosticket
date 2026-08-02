<?php
require_once 'client.inc.php';
echo '<pre>';
echo 'Session ID: ' . session_id() . "\n";
echo 'POST: '; print_r($_POST);
echo 'CSRF Token from POST: ' . ($_POST['__CSRFToken__'] ?? 'NOT SET') . "\n";
echo 'CSRF Token from session: ' . ($ost->getCSRFToken() ?? 'NOT SET') . "\n";
echo 'CSRF Valid: ' . ($ost->checkCSRFToken() ? 'YES' : 'NO') . "\n";
echo '</pre>';
