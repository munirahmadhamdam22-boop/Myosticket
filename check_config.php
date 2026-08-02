<?php
require 'bootstrap.php';
$ost = $GLOBALS['ost'];
$cfg = $ost->getConfig();
echo "force_https: " . $cfg->get('force_https') . "\n";
