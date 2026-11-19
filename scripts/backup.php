<?php
declare(strict_types=1);

/**
 * Digital Showroom backup (CLI only).
 * Run using Hostinger PHP CLI / cron; NEVER expose through a web URL.
 * Writes one ZIP with schema, rows, uploaded images and a manifest.
 * Does NOT delete any production records or existing backup archives.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once dirname(__DIR__) . '/api/db.php';

function failBackup(string $message): never {
    fwrite(STDERR, "Backup failed: " . $message . PHP_EOL);
    exit(1);
}
if (!class_exists(ZipArchive::class)) failBackup('PHP ZipArchive extension is required.');
if (!extension_loaded('pdo_mysql')) failBackup('PDO MySQL extension is required.');

$root = realpath(dirname(__DIR__));
if ($root === false) failBackup('Website root unavailable.');
$parent = realpath(dirname($root));
if ($parent === false) failBackup('Parent of website root unavailable.');
$requested = getenv('SHOWROOM_BACKUP_DIR');
$destination = $requested !== false && trim($requested) !== ''
    ? trim($requested)
    : $parent . DIRECTORY_SEPARATOR . 'showroom-backups';
if (!is_dir($destination) && !@mkdir($destination, 0700, true) && !is_dir($destination)) {
    failBackup('Could not create backup folder above public_html. Configure a writable private location.');
}
$dir = realpath($destination);
if ($dir === false || $dir === $root || str_starts_with($dir, $root . DIRECTORY_SEPARATOR)) {
    failBackup('Backups must be stored outside the website document root.');
}
@chmod($dir, 0700);
$timestamp = gmdate('Ymd-His');
$base = $dir . DIRECTORY_SEPARATOR . 'digitalshowroom-' . $timestamp . '-' . bin2hex(random_bytes(4));
$tmp = $base . '.zip.partial';
$target = $base . '.zip';
$zip = new ZipArchive();
if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::EXCL) !== true) {
    failBackup('Could not open backup archive.');
}
@chmod($tmp, 0600);
$counts = [];
$mediaCount = 0;
try {
    $db = showroomDatabase();
    $tables = [
        'ds_users', 'ds_shops', 'ds_categories', 'ds_products',
        'ds_catalogues', 'ds_catalogue_products', 'ds_settings'
    ];
    // DDL before transaction: no schema migration should run during a backup.
    $ddl = [];
    foreach ($tables as $table) {
        $stmt = $db->query('SHOW CREATE TABLE `' . $table . '`');
        $row = $stmt->fetch(PDO::FETCH_NUM);
        if (!$row || !isset($row[1])) throw new RuntimeException('Table missing: ' . $table);
        $ddl[$table] = $row[1];
    }
    $db->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    $db->beginTransaction();
    try {
        foreach ($tables as $table) {
            $sql = '-- Digital Showroom: ' . $table . "\n";
            $sql .= $ddl[$table] . ";\n\n";
            $stmt = $db->query('SELECT * FROM `' . $table . '`');
            $columns = array_map(static fn(array $c): string => '`' . str_replace('`','``',$c['name']) . '`',
                $stmt->getColumnMeta(0) ? [] : []);
            // Column names come from the result set, not user input.
            $rows = 0;
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $names = array_map(static fn(string $key): string => '`' . str_replace('`', '``', $key) . '`', array_keys($row));
                $values = array_map(static fn($value): string => $value === null ? 'NULL' : $db->quote((string)$value), array_values($row));
                $sql .= 'INSERT INTO `' . $table . '` (' . implode(',', $names) . ') VALUES (' . implode(',', $values) . ");\n";
                $rows++;
            }
            if (!$zip->addFromString('database/' . $table . '.sql', $sql)) {
                throw new RuntimeException('Unable to add database table ' . $table);
            }
            $counts[$table] = $rows;
        }
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    $uploads = $root . '/uploads';
    if (is_dir($uploads)) {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($uploads, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iterator as $file) {
            if (!$file->isFile() || $file->isLink()) continue;
            $full = $file->getPathname();
            $relative = substr($full, strlen($uploads) + 1);
            // Only archive expected, publicly displayed media formats.
            if (!preg_match('/\.(?:jpe?g|png|webp)$/i', $relative)) continue;
            if (!$zip->addFile($full, 'uploads/' . str_replace(DIRECTORY_SEPARATOR, '/', $relative))) {
                throw new RuntimeException('Unable to add uploaded image');
            }
            $mediaCount++;
        }
    }
    $manifest = [
        'application'=>'Digital Showroom',
        'backup_utc'=>gmdate('c'),
        'tables'=>$counts,
        'uploaded_images'=>$mediaCount,
        'note'=>'Restore only to an isolated test database first. No credentials are included.'
    ];
    if (!$zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR))) {
        throw new RuntimeException('Unable to add manifest.');
    }
    if (!$zip->close()) throw new RuntimeException('Failed to finalize ZIP archive.');
    if (!rename($tmp, $target)) throw new RuntimeException('Could not finalize backup file.');
    @chmod($target, 0600);

    $verify = new ZipArchive();
    if ($verify->open($target) !== true) throw new RuntimeException('Archive verification failed.');
    if ($verify->locateName('manifest.json') === false || $verify->numFiles < count($tables) + 1) {
        $verify->close();
        throw new RuntimeException('Backup archive is incomplete.');
    }
    $verify->close();
    echo 'Backup archive created: ' . $target . PHP_EOL;
    echo 'Table rows: ' . json_encode($counts) . PHP_EOL;
    echo 'Uploaded images: ' . $mediaCount . PHP_EOL;
    echo 'Note: this is an archive integrity check, not a database restore test.' . PHP_EOL;
} catch (Throwable $e) {
    if ($zip->status === ZipArchive::ER_OK) $zip->close();
    @unlink($tmp);
    failBackup($e->getMessage());
}
