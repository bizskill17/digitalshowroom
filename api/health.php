<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['status' => 'method_not_allowed']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $db = showroomDatabase();
    $db->query('SELECT 1');
    echo json_encode(['status' => 'ok']);
} catch (Throwable $exception) {
    // Never print database credentials, query text, or detailed exceptions.
    error_log('Digital Showroom database check failed: ' . $exception->getMessage());
    http_response_code(503);
    echo json_encode(['status' => 'unavailable']);
}
