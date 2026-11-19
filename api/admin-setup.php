<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
session_name('showroom_session');
session_set_cookie_params([
  'lifetime'=>0, 'path'=>'/',
  'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'httponly'=>true, 'samesite'=>'Strict'
]);
session_start();
if (empty($_SESSION['admin_setup_csrf'])) {
    $_SESSION['admin_setup_csrf'] = bin2hex(random_bytes(24));
}
function reply(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
try {
    $db = showroomDatabase();
    $table = $db->query("SHOW TABLES LIKE 'ds_users'")->fetchColumn();
    $hasAdmin = false;
    if ($table) {
        $hasAdmin = (bool)$db->query("SELECT 1 FROM ds_users WHERE role='admin' LIMIT 1")->fetchColumn();
    }
    // The setup key is stored in a PHP file inside a .htaccess-protected directory.
    // Only a hash of the GitHub Actions secret is ever deployed.
    $privatePath = dirname(__DIR__) . '/showroom-private/admin-setup-config.php';
    $storedHash = is_file($privatePath) ? (require $privatePath) : '';
    $configured = is_string($storedHash) && preg_match('/^[a-f0-9]{64}$/', $storedHash);
    $enabled = !$hasAdmin && $configured;

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
        reply(['available'=>$enabled,'csrf'=>$_SESSION['admin_setup_csrf'],
               'message'=>$hasAdmin ? 'An administrator already exists. Setup is closed.' :
                   ($configured ? '' : 'Add ADMIN_SETUP_TOKEN to GitHub Actions secrets and redeploy.')]);
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: GET, POST');
        reply(['error'=>'Method not allowed'],405);
    }
    if (!$enabled) reply(['error'=>'Admin setup is unavailable or already completed.'],403);
    $sentCsrf = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!hash_equals($_SESSION['admin_setup_csrf'], $sentCsrf)) reply(['error'=>'Invalid session token. Refresh and try again.'],403);
    if (($_SESSION['admin_setup_attempts'] ?? 0) >= 5) reply(['error'=>'Too many attempts. Start a new browser session.'],429);
    $input=json_decode(file_get_contents('php://input'),true);
    if (!is_array($input)) reply(['error'=>'Invalid request'],400);
    $token=(string)($input['setup_token']??'');
    // Don't provide a different error for wrong secret.
    if (!hash_equals($storedHash,hash('sha256',$token))) {
        $_SESSION['admin_setup_attempts']=($_SESSION['admin_setup_attempts']??0)+1;
        reply(['error'=>'Invalid setup token'],403);
    }
    $name=trim((string)($input['name']??''));
    $email=strtolower(trim((string)($input['email']??'')));
    $password=(string)($input['password']??'');
    if ($name==='' || mb_strlen($name)>150 || !filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($email)>190 ||
        strlen($password)<4 || strlen($password)>200) {
        reply(['error'=>'Enter a name, valid email, and password of at least 4 characters.'],422);
    }
    // Lock prevents concurrent attempts from creating more than one initial admin.
    if ((int)$db->query("SELECT GET_LOCK('digitalshowroom_first_admin',10)")->fetchColumn()!==1) {
        reply(['error'=>'Setup is busy. Try again.'],503);
    }
    try {
        $db->beginTransaction();
        $existing=(bool)$db->query("SELECT 1 FROM ds_users WHERE role='admin' LIMIT 1")->fetchColumn();
        if ($existing) {
            $db->rollBack();
            reply(['error'=>'An administrator already exists. Setup is closed.'],403);
        }
        $stmt=$db->prepare("INSERT INTO ds_users (name,email,pass_hash,role) VALUES (?,?,?,'admin')");
        $stmt->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT)]);
        $db->commit();
        $_SESSION['admin_setup_attempts']=5;
        reply(['ok'=>true,'message'=>'Administrator created. Sign in using Admin Login.']);
    } catch (PDOException $e) {
        if($db->inTransaction()) $db->rollBack();
        if($e->getCode()==='23000') reply(['error'=>'This email is already registered. Use another email for the new Admin.'],409);
        throw $e;
    } finally {
        $db->query("SELECT RELEASE_LOCK('digitalshowroom_first_admin')");
    }
} catch (Throwable $e) {
    error_log('Admin setup failure: '.$e->getMessage());
    reply(['error'=>'Setup could not be completed. Please check hosting logs.'],500);
}
