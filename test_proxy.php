<?php
echo "=== REQUEST DETAILS ===\n";
echo "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
echo "URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "Script Name: " . $_SERVER['SCRIPT_NAME'] . "\n";
echo "Path Info: " . ($_SERVER['PATH_INFO'] ?? 'NOT SET') . "\n";
echo "Query String: " . ($_SERVER['QUERY_STRING'] ?? 'NOT SET') . "\n";
echo "Content Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'NOT SET') . "\n";
echo "\n=== POST DATA ===\n";
print_r($_POST);
echo "\n=== FILES ===\n";
print_r($_FILES);
echo "\n=== HEADERS ===\n";
foreach (getallheaders() as $name => $value) {
    echo "$name: $value\n";
}
