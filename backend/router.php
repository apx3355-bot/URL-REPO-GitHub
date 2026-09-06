<?php
declare(strict_types=1);

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (str_starts_with($requestPath, '/uploads/')) {
    $relativePath = str_replace('/', DIRECTORY_SEPARATOR, ltrim($requestPath, '/'));
    $file = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . $relativePath;
    if (is_file($file)) {
        $mime = mime_content_type($file) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        readfile($file);
        return true;
    }
    http_response_code(404);
    return true;
}

require __DIR__ . DIRECTORY_SEPARATOR . 'api.php';
