<?php
declare(strict_types=1);

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (str_starts_with($requestPath, '/uploads/')) {
    $relativePath = str_replace('/', DIRECTORY_SEPARATOR, ltrim($requestPath, '/'));
    $envUploadRoot = getenv('UPLOAD_PATH');
    $envUploadRoot = is_string($envUploadRoot) && trim($envUploadRoot) !== '' ? rtrim(trim($envUploadRoot), DIRECTORY_SEPARATOR) : null;
    $relativeUploads = preg_replace('#^uploads' . preg_quote(DIRECTORY_SEPARATOR, '#') . '#', '', $relativePath);
    $candidates = [];
    if ($envUploadRoot !== null) {
        $candidates[] = $envUploadRoot . DIRECTORY_SEPARATOR . $relativeUploads;
    }
    $candidates[] = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . $relativePath;
    $candidates[] = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . $relativePath;
    foreach (array_values(array_unique($candidates)) as $file) {
        if (is_file($file)) {
            $mime = 'application/octet-stream';
            if (function_exists('mime_content_type')) {
                $mime = mime_content_type($file) ?: $mime;
            } elseif (class_exists('finfo')) {
                $fi = new finfo(FILEINFO_MIME_TYPE);
                $mime = $fi->file($file) ?: $mime;
            } else {
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                $mimeMap = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
                    'webp' => 'image/webp', 'gif' => 'image/gif', 'svg' => 'image/svg+xml',
                    'pdf' => 'application/pdf', 'mp4' => 'video/mp4'];
                $mime = $mimeMap[$ext] ?? 'application/octet-stream';
            }
            header('Content-Type: ' . $mime);
            readfile($file);
            return true;
        }
    }
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'File upload tidak ditemukan']);
    return true;
}

// Normalisasi route API agar frontend /api/auth/* tetap jalan di PHP.
// php -S tidak punya rewrite, jadi petakan path menjadi $_GET['route'].
if (!isset($_GET['route']) || $_GET['route'] === '') {
    $apiPath = $requestPath;
    foreach (['/api/auth/', '/api/', '/auth/'] as $prefix) {
        if (str_starts_with($apiPath, $prefix)) {
            $apiPath = substr($apiPath, strlen($prefix));
            break;
        }
    }
    $apiPath = trim($apiPath, '/');
    // Hanya set untuk path API, biarkan router default untuk file statis lain.
    if ($apiPath !== '' && !str_contains($apiPath, '.')) {
        $_GET['route'] = $apiPath;
    }
}

require __DIR__ . DIRECTORY_SEPARATOR . 'api.php';
