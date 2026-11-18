<?php
declare(strict_types=1);

/**
 * Digital Showroom database connection.
 *
 * Credentials are deployed to a private file above public_html by GitHub
 * Actions. Do not put database credentials in this repository or in HTML.
 */
function showroomDatabase(): PDO
{
    $configFile = dirname(__DIR__, 2) . '/showroom-db-config.php';

    if (!is_file($configFile)) {
        throw new RuntimeException('Database configuration unavailable');
    }

    $config = require $configFile;
    if (!is_array($config)) {
        throw new RuntimeException('Invalid database configuration');
    }

    return new PDO(
        'mysql:host=' . $config['host'] . ';dbname=' . $config['name'] . ';charset=utf8mb4',
        $config['user'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
}
