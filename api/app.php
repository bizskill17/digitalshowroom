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
if (empty($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(24));
function respond($payload,int $code=200):never{http_response_code($code);echo json_encode($payload,JSON_UNESCAPED_SLASHES|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
function body():array{$raw=file_get_contents('php://input');$data=json_decode($raw,true);if(!is_array($data))respond(['error'=>'Invalid JSON'],400);return $data;}
function checkCsrf():void{if(!hash_equals($_SESSION['csrf']??'',$_SERVER['HTTP_X_CSRF_TOKEN']??''))respond(['error'=>'Security token invalid. Reload the page.'],403);}
function signedIn():int{$id=(int)($_SESSION['user_id']??0);if(!$id)respond(['error'=>'Please sign in'],401);return $id;}
function currentUser(PDO $db):?array{
 if(empty($_SESSION['user_id']))return null;
 $q=$db->prepare('SELECT id,name,email,role FROM ds_users WHERE id=?');$q->execute([$_SESSION['user_id']]);return $q->fetch()?:null;
}
function shopFor(PDO $db,int $userId):array{
 $q=$db->prepare('SELECT * FROM ds_shops WHERE user_id=? LIMIT 1');$q->execute([$userId]);$shop=$q->fetch();if(!$shop)respond(['error'=>'Shop not found'],404);return $shop;
}
function clean($v,int $max=160):string{return mb_substr(trim((string)($v??'')),0,$max);}
function setup(PDO $db):void{
 $db->exec("CREATE TABLE IF NOT EXISTS ds_users (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL,email VARCHAR(190) NOT NULL UNIQUE,pass_hash VARCHAR(255) NOT NULL,role VARCHAR(20) NOT NULL DEFAULT 'seller',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_shops (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL UNIQUE,slug VARCHAR(90) NOT NULL UNIQUE,name VARCHAR(150) NOT NULL,tagline VARCHAR(255) NOT NULL DEFAULT '',phone VARCHAR(20) NOT NULL DEFAULT '',address VARCHAR(255) NOT NULL DEFAULT '',logo_url TEXT NULL,active TINYINT NOT NULL DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX(user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_categories (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,shop_id BIGINT UNSIGNED NOT NULL,name VARCHAR(120) NOT NULL,image_url TEXT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX(shop_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_products (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,shop_id BIGINT UNSIGNED NOT NULL,category_id BIGINT UNSIGNED NULL,name VARCHAR(180) NOT NULL,description TEXT NOT NULL,price DECIMAL(12,2) NULL,image_url TEXT NULL,active TINYINT NOT NULL DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX(shop_id),INDEX(category_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_catalogues (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,shop_id BIGINT UNSIGNED NOT NULL,name VARCHAR(130) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX(shop_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_catalogue_products (catalogue_id BIGINT UNSIGNED NOT NULL,product_id BIGINT UNSIGNED NOT NULL,PRIMARY KEY(catalogue_id,product_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_settings (setting_key VARCHAR(80) PRIMARY KEY,setting_value VARCHAR(255) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("INSERT IGNORE INTO ds_settings(setting_key,setting_value) VALUES ('free_product_limit','5')");
}
function quota(PDO $db):int{return max(0,(int)$db->query("SELECT setting_value FROM ds_settings WHERE setting_key='free_product_limit'")->fetchColumn());}
function belongs(PDO $db,string $table,int $id,int $shop):bool{
 if(!in_array($table,['ds_products','ds_categories','ds_catalogues'],true))return false;
 $q=$db->prepare("SELECT id FROM $table WHERE id=? AND shop_id=?");$q->execute([$id,$shop]);return (bool)$q->fetchColumn();
}
try{
 $db=showroomDatabase();
 setup($db);
 $method=$_SERVER['REQUEST_METHOD']??'GET';$action=(string)($_GET['action']??'');
 if($method==='GET'){
  if($action==='me'){respond(['user'=>currentUser($db),'csrf'=>$_SESSION['csrf'],'free_product_limit'=>quota($db)]);}
  if($action==='public'){
   $slug=clean($_GET['slug']??'',90);$q=$db->prepare('SELECT id,slug,name,tagline,phone,address,logo_url FROM ds_shops WHERE slug=? AND active=1');$q->execute([$slug]);$shop=$q->fetch();if(!$shop)respond(['error'=>'Shop not found'],404);
   $q=$db->prepare('SELECT id,name,image_url FROM ds_categories WHERE shop_id=? ORDER BY id DESC');$q->execute([$shop['id']]);$cats=$q->fetchAll();
   $q=$db->prepare('SELECT id,category_id,name,description,price,image_url FROM ds_products WHERE shop_id=? AND active=1 ORDER BY id DESC');$q->execute([$shop['id']]);
   respond(['shop'=>$shop,'categories'=>$cats,'products'=>$q->fetchAll()]);
  }
  $u=currentUser($db);if(!$u)respond(['error'=>'Please sign in'],401);
  if($action==='dashboard'){
   if($u['role']==='admin'){
    $counts=['sellers'=>(int)$db->query("SELECT COUNT(*) FROM ds_users WHERE role='seller'")->fetchColumn(),'shops'=>(int)$db->query('SELECT COUNT(*) FROM ds_shops')->fetchColumn(),'products'=>(int)$db->query('SELECT COUNT(*) FROM ds_products')->fetchColumn(),'free_product_limit'=>quota($db)];
    $recent=$db->query('SELECT s.id,s.name,s.slug,s.active,s.created_at,u.name AS owner,u.email,(SELECT COUNT(*) FROM ds_products p WHERE p.shop_id=s.id) AS products FROM ds_shops s JOIN ds_users u ON u.id=s.user_id ORDER BY s.id DESC LIMIT 100')->fetchAll();
    respond(['role'=>'admin','stats'=>$counts,'shops'=>$recent]);
   }
   $shop=shopFor($db,(int)$u['id']);
   $q=$db->prepare('SELECT * FROM ds_categories WHERE shop_id=? ORDER BY id DESC');$q->execute([$shop['id']]);$categories=$q->fetchAll();
   $q=$db->prepare('SELECT * FROM ds_products WHERE shop_id=? ORDER BY id DESC');$q->execute([$shop['id']]);$products=$q->fetchAll();
   $q=$db->prepare('SELECT * FROM ds_catalogues WHERE shop_id=? ORDER BY id DESC');$q->execute([$shop['id']]);$catalogues=$q->fetchAll();
   $q=$db->prepare('SELECT cp.catalogue_id,cp.product_id FROM ds_catalogue_products cp JOIN ds_catalogues c ON c.id=cp.catalogue_id WHERE c.shop_id=?');$q->execute([$shop['id']]);
   respond(['role'=>'seller','shop'=>$shop,'categories'=>$categories,'products'=>$products,'catalogues'=>$catalogues,'catalogue_products'=>$q->fetchAll(),'free_product_limit'=>quota($db)]);
  }
  respond(['error'=>'Unknown endpoint'],404);
 }
 if($method!=='POST')respond(['error'=>'Method not allowed'],405);
 checkCsrf();
 if($action==='register'){
  $d=body();$name=clean($d['name']??'');$email=strtolower(clean($d['email']??'',190));$password=(string)($d['password']??'');$shopName=clean($d['shop_name']??'');$phone=preg_replace('/\D/','',(string)($d['phone']??''));$slug=strtolower(clean($d['slug']??'',90));
  if(strlen($password)<10||strlen($password)>200||!filter_var($email,FILTER_VALIDATE_EMAIL)||!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/',$slug)||strlen($slug)<3||!$name||!$shopName||strlen($phone)<10||strlen($phone)>15)respond(['error'=>'Check required fields. Password must be at least 10 characters; shop link uses lowercase letters, numbers or hyphens.'],422);
  $db->beginTransaction();
  try{
   $q=$db->prepare('INSERT INTO ds_users(name,email,pass_hash) VALUES(?,?,?)');$q->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT)]);$uid=(int)$db->lastInsertId();
   $q=$db->prepare('INSERT INTO ds_shops(user_id,slug,name,phone) VALUES(?,?,?,?)');$q->execute([$uid,$slug,$shopName,$phone]);
   $db->commit();
  }catch(PDOException $e){$db->rollBack();if($e->getCode()==='23000')respond(['error'=>'Email or shop link is already in use'],409);throw $e;}
  session_regenerate_id(true);$_SESSION['user_id']=$uid;respond(['ok'=>true,'role'=>'seller']);
 }
 if($action==='login'){
  $d=body();$q=$db->prepare('SELECT id,pass_hash FROM ds_users WHERE email=?');$q->execute([strtolower(clean($d['email']??'',190))]);$row=$q->fetch();
  if(!$row||!password_verify((string)($d['password']??''),$row['pass_hash']))respond(['error'=>'Invalid email or password'],401);
  session_regenerate_id(true);$_SESSION['user_id']=(int)$row['id'];respond(['ok'=>true]);
 }
 if($action==='logout'){$_SESSION=[];session_regenerate_id(true);respond(['ok'=>true]);}
 $u=currentUser($db);if(!$u)respond(['error'=>'Please sign in'],401);
 $d=body();
 if($action==='account-name'){
  $name=clean($d['name']??'',150);
  if(!$name)respond(['error'=>'Please enter your name'],422);
  $q=$db->prepare('UPDATE ds_users SET name=? WHERE id=?');
  $q->execute([$name,(int)$u['id']]);
  respond(['ok'=>true,'name'=>$name]);
 }
 if($u['role']==='admin'){
  if($action==='settings'){
   $n=filter_var($d['free_product_limit']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);
   if($n===false)respond(['error'=>'Enter a valid product limit'],422);
   $q=$db->prepare("UPDATE ds_settings SET setting_value=? WHERE setting_key='free_product_limit'");$q->execute([(string)$n]);respond(['ok'=>true]);
  }
  if($action==='shop-status'){
   $q=$db->prepare('UPDATE ds_shops SET active=? WHERE id=?');$q->execute([!empty($d['active'])?1:0,(int)($d['id']??0)]);respond(['ok'=>true]);
  }
  respond(['error'=>'Unsupported admin operation'],403);
 }
 $shop=shopFor($db,(int)$u['id']);$sid=(int)$shop['id'];
 if($action==='shop'){
  $name=clean($d['name']??'');$tagline=clean($d['tagline']??'',255);$phone=preg_replace('/\D/','',(string)($d['phone']??''));$address=clean($d['address']??'',255);$logo=clean($d['logo_url']??'',500);
  $ownerName=array_key_exists('owner_name',$d)?clean($d['owner_name'],150):$u['name'];
  if(!$ownerName)respond(['error'=>'Your Name is required'],422);
  if(!$name||strlen($phone)<10||strlen($phone)>15||($logo&&!preg_match('~^https?://~i',$logo)&&!str_starts_with($logo,'/uploads/')))respond(['error'=>'Enter valid shop details'],422);
  $db->beginTransaction();
  try{
   $q=$db->prepare('UPDATE ds_shops SET name=?,tagline=?,phone=?,address=?,logo_url=? WHERE id=? AND user_id=?');
   $q->execute([$name,$tagline,$phone,$address,$logo,$sid,(int)$u['id']]);
   if($ownerName!==$u['name']){
    $q=$db->prepare('UPDATE ds_users SET name=? WHERE id=?');
    $q->execute([$ownerName,(int)$u['id']]);
   }
   $db->commit();
  }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
  respond(['ok'=>true,'owner_name'=>$ownerName]);
 }
 if($action==='category-save'){
  $name=clean($d['name']??'',120);$id=(int)($d['id']??0);
  if(!$name)respond(['error'=>'Category name required'],422);
  if($id){
   if(!belongs($db,'ds_categories',$id,$sid))respond(['error'=>'Category not found'],404);
   $q=$db->prepare('UPDATE ds_categories SET name=? WHERE id=? AND shop_id=?');
   $q->execute([$name,$id,$sid]);
  }else{
   $q=$db->prepare('INSERT INTO ds_categories(shop_id,name) VALUES(?,?)');
   $q->execute([$sid,$name]);
   $id=(int)$db->lastInsertId();
  }
  $q=$db->prepare('SELECT id,name FROM ds_categories WHERE id=? AND shop_id=?');
  $q->execute([$id,$sid]);
  $saved=$q->fetch();
  if(!$saved)respond(['error'=>'Category could not be verified after saving'],500);
  respond(['ok'=>true,'category'=>$saved]);
 }
 if($action==='category-delete'){
  $id=(int)($d['id']??0);if(!belongs($db,'ds_categories',$id,$sid))respond(['error'=>'Not found'],404);
  $q=$db->prepare('SELECT COUNT(*) FROM ds_products WHERE category_id=? AND shop_id=?');$q->execute([$id,$sid]);if($q->fetchColumn())respond(['error'=>'Move or delete category products first'],409);
  $db->prepare('DELETE FROM ds_categories WHERE id=?')->execute([$id]);respond(['ok'=>true]);
 }
 if($action==='product-save'){
  $id=(int)($d['id']??0);$name=clean($d['name']??'',180);$desc=clean($d['description']??'',2500);$img=clean($d['image_url']??'',500);$cat=(int)($d['category_id']??0);$price=$d['price']??null;$active=!empty($d['active'])?1:0;
  if(!$name||($img&&!preg_match('~^https?://~i',$img)&&!str_starts_with($img,'/uploads/')))respond(['error'=>'Valid product name and image required'],422);
  if($cat&&!belongs($db,'ds_categories',$cat,$sid))respond(['error'=>'Invalid category'],422);
  if($price===''||$price===null)$price=null;elseif(!is_numeric($price)||(float)$price<0||(float)$price>9999999999)respond(['error'=>'Invalid price'],422);else $price=number_format((float)$price,2,'.','');
  if($id){if(!belongs($db,'ds_products',$id,$sid))respond(['error'=>'Product not found'],404);
   $q=$db->prepare('UPDATE ds_products SET name=?,description=?,category_id=?,price=?,image_url=?,active=? WHERE id=?');$q->execute([$name,$desc,$cat?:null,$price,$img,$active,$id]);
  }else{
   $db->beginTransaction();
   try{
    $db->query('SELECT setting_value FROM ds_settings WHERE setting_key="free_product_limit" FOR UPDATE')->fetchColumn();
    $q=$db->prepare('SELECT COUNT(*) FROM ds_products WHERE shop_id=?');$q->execute([$sid]);
    if((int)$q->fetchColumn()>=quota($db)){$db->rollBack();respond(['error'=>'Free product allowance reached. Contact the administrator for more capacity.'],403);}
    $q=$db->prepare('INSERT INTO ds_products(shop_id,category_id,name,description,price,image_url,active) VALUES(?,?,?,?,?,?,?)');$q->execute([$sid,$cat?:null,$name,$desc,$price,$img,$active]);$db->commit();
   }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
  }
  respond(['ok'=>true]);
 }
 if($action==='product-delete'){
  $id=(int)($d['id']??0);if(!belongs($db,'ds_products',$id,$sid))respond(['error'=>'Not found'],404);
  $db->prepare('DELETE FROM ds_catalogue_products WHERE product_id=?')->execute([$id]);$db->prepare('DELETE FROM ds_products WHERE id=?')->execute([$id]);respond(['ok'=>true]);
 }
 if($action==='catalogue-save'){
  $id=(int)($d['id']??0);$name=clean($d['name']??'',130);$productIds=array_unique(array_map('intval',is_array($d['product_ids']??null)?$d['product_ids']:[]));
  if(!$name)respond(['error'=>'Catalogue name required'],422);
  foreach($productIds as $pid)if(!belongs($db,'ds_products',$pid,$sid))respond(['error'=>'Invalid product selection'],422);
  $db->beginTransaction();
  try{
   if($id){if(!belongs($db,'ds_catalogues',$id,$sid)){$db->rollBack();respond(['error'=>'Not found'],404);}
    $db->prepare('UPDATE ds_catalogues SET name=? WHERE id=?')->execute([$name,$id]);
    $db->prepare('DELETE FROM ds_catalogue_products WHERE catalogue_id=?')->execute([$id]);
   }else{$q=$db->prepare('INSERT INTO ds_catalogues(shop_id,name) VALUES(?,?)');$q->execute([$sid,$name]);$id=(int)$db->lastInsertId();}
   $q=$db->prepare('INSERT INTO ds_catalogue_products(catalogue_id,product_id) VALUES(?,?)');foreach($productIds as $pid)$q->execute([$id,$pid]);
   $db->commit();
  }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}respond(['ok'=>true]);
 }
 if($action==='catalogue-delete'){
  $id=(int)($d['id']??0);if(!belongs($db,'ds_catalogues',$id,$sid))respond(['error'=>'Not found'],404);
  $db->prepare('DELETE FROM ds_catalogue_products WHERE catalogue_id=?')->execute([$id]);$db->prepare('DELETE FROM ds_catalogues WHERE id=?')->execute([$id]);respond(['ok'=>true]);
 }
 respond(['error'=>'Unknown action'],404);
}catch(Throwable $e){error_log('Digital Showroom API: '.$e->getMessage());respond(['error'=>'Server error. Check hosting error logs.'],500);}
