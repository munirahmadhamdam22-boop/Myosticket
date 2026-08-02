<?php
require 'bootstrap.php';
echo "PATH_INFO: " . ($_SERVER['PATH_INFO'] ?? 'NOT SET') . "\n";
echo "ORIG_PATH_INFO: " . ($_SERVER['ORIG_PATH_INFO'] ?? 'NOT SET') . "\n";
echo "SCRIPT_NAME: " . $_SERVER['SCRIPT_NAME'] . "\n";
echo "REQUEST_URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "get_path_info(): " . Osticket::get_path_info() . "\n";
