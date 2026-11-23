<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
session_name('showroom_session');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off','httponly'=>true,'samesite'=>'Lax']);
session_start();
function reply(array $value,int $code=200):never{http_response_code($code);echo json_encode($value);exit;}
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')reply(['error'=>'Method not allowed'],405);
if(empty($_SESSION['user_id'])||!hash_equals($_SESSION['csrf']??'',$_SERVER['HTTP_X_CSRF_TOKEN']??''))reply(['error'=>'Authentication required'],403);
if(!isset($_FILES['image'])||!is_array($_FILES['image']))reply(['error'=>'Choose an image'],422);
$file=$_FILES['image'];
if($file['error']!==UPLOAD_ERR_OK||$file['size']>5*1024*1024||$file['size']<1)reply(['error'=>'Image must be at most 5 MB'],422);
try{
 $db=showroomDatabase();
 $stmt=$db->prepare('SELECT id FROM ds_shops WHERE user_id=? AND active>=0');
 $stmt->execute([(int)$_SESSION['user_id']]);
 $sid=(int)$stmt->fetchColumn();
 if(!$sid)reply(['error'=>'Shop not found'],404);
 $type=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
 $allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
 $dimensions=@getimagesize($file['tmp_name']);
 if(!isset($allowed[$type])||!is_array($dimensions))reply(['error'=>'Only valid JPG, PNG and WebP images are allowed'],422);
 $width=(int)$dimensions[0];$height=(int)$dimensions[1];
 if($width<1||$height<1||$width>12000||$height>12000||($width*$height)>40000000)reply(['error'=>'Image dimensions are too large'],422);
 $dir=dirname(__DIR__).'/uploads/'.$sid;
 if(!is_dir($dir)&&!mkdir($dir,0755,true)&&!is_dir($dir))throw new RuntimeException('Unable to create upload directory');
 $name=bin2hex(random_bytes(16)).'.'.$allowed[$type];
 $target=$dir.'/'.$name;
 if(!move_uploaded_file($file['tmp_name'],$target))throw new RuntimeException('Unable to save image');
 chmod($target,0644);
 reply(['url'=>'/uploads/'.$sid.'/'.$name]);
}catch(Throwable $e){error_log('Showroom upload error: '.$e->getMessage());reply(['error'=>'Image upload failed'],500);}
