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
 $db->exec("CREATE TABLE IF NOT EXISTS ds_product_images (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,shop_id BIGINT UNSIGNED NOT NULL,product_id BIGINT UNSIGNED NOT NULL,image_url VARCHAR(500) NOT NULL,display_order INT UNSIGNED NOT NULL DEFAULT 0,UNIQUE KEY product_image_unique (product_id,image_url),INDEX(shop_id,product_id,display_order)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_enquiries (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,shop_id BIGINT UNSIGNED NOT NULL,kind ENUM('order','quotation') NOT NULL,customer_name VARCHAR(120) NOT NULL DEFAULT '',customer_mobile VARCHAR(15) NOT NULL DEFAULT '',status ENUM('New','Follow-up','Completed') NOT NULL DEFAULT 'New',estimated_total DECIMAL(12,2) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,INDEX(shop_id,created_at),INDEX(shop_id,status)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_enquiry_items (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,enquiry_id BIGINT UNSIGNED NOT NULL,product_id BIGINT UNSIGNED NULL,product_name VARCHAR(180) NOT NULL,unit VARCHAR(30) NOT NULL,quantity INT UNSIGNED NOT NULL,unit_price DECIMAL(12,2) NULL,INDEX(enquiry_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_analytics_events (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,shop_id BIGINT UNSIGNED NOT NULL,product_id BIGINT UNSIGNED NULL,event_type ENUM('visit','product_view','whatsapp_click') NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX(shop_id,created_at,event_type),INDEX(shop_id,product_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("CREATE TABLE IF NOT EXISTS ds_settings (setting_key VARCHAR(80) PRIMARY KEY,setting_value VARCHAR(255) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $db->exec("INSERT IGNORE INTO ds_settings(setting_key,setting_value) VALUES ('free_product_limit','5')");
 // Add a per-shop brand colour without changing existing shop records.
 $brandColumn=$db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ds_shops' AND COLUMN_NAME='theme_color'");
 $brandColumn->execute();
 if (!(int)$brandColumn->fetchColumn()) {
  try {$db->exec("ALTER TABLE ds_shops ADD COLUMN theme_color VARCHAR(7) NOT NULL DEFAULT '#E83F7E'");}
  catch(PDOException $e) {if(($e->errorInfo[1]??null)!==1060)throw $e;}
 }
 // Preserve existing storefront appearance while allowing optional new themes.
 $themeColumn=$db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ds_shops' AND COLUMN_NAME='theme_style'");
 $themeColumn->execute();
 if(!(int)$themeColumn->fetchColumn()){
  try{$db->exec("ALTER TABLE ds_shops ADD COLUMN theme_style VARCHAR(20) NOT NULL DEFAULT 'classic'");}
  catch(PDOException $e){if(($e->errorInfo[1]??null)!==1060)throw $e;}
 }
 // Non-destructive, idempotent additions to existing product records.
 foreach ([
  'unit' => "ALTER TABLE ds_products ADD COLUMN unit VARCHAR(30) NOT NULL DEFAULT 'Piece'",
  'display_order' => "ALTER TABLE ds_products ADD COLUMN display_order INT UNSIGNED NOT NULL DEFAULT 0"
 ] as $column => $sql) {
  $q=$db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ds_products' AND COLUMN_NAME=?");
  $q->execute([$column]);
  if (!(int)$q->fetchColumn()) {
   try {$db->exec($sql);}
   catch (PDOException $e) {
    // Two concurrent requests may both detect the missing column.
    if (($e->errorInfo[1]??null)!==1060) throw $e;
   }
  }
 }
}
function productPhotoMap(PDO $db,int $shopId):array{
 $q=$db->prepare('SELECT product_id,image_url FROM ds_product_images WHERE shop_id=? ORDER BY display_order,id');
 $q->execute([$shopId]);
 $grouped=[];
 foreach($q->fetchAll() as $image)$grouped[(int)$image['product_id']][]=$image['image_url'];
 return $grouped;
}
function attachProductPhotos(array &$products,array $photos):void{
 foreach($products as &$product){
  $gallery=$photos[(int)$product['id']]??[];
  $primary=(string)($product['image_url']??'');
  if($primary!=='')array_unshift($gallery,$primary);
  $product['images']=array_values(array_unique($gallery));
 }
 unset($product);
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
   $slug=clean($_GET['slug']??'',90);$q=$db->prepare('SELECT id,slug,name,tagline,phone,address,logo_url,theme_color,theme_style FROM ds_shops WHERE slug=? AND active=1');$q->execute([$slug]);$shop=$q->fetch();if(!$shop)respond(['error'=>'Shop not found'],404);
   $q=$db->prepare('SELECT id,name,image_url FROM ds_categories WHERE shop_id=? ORDER BY id DESC');$q->execute([$shop['id']]);$cats=$q->fetchAll();
   $q=$db->prepare('SELECT id,category_id,name,description,price,image_url,unit,display_order FROM ds_products WHERE shop_id=? AND active=1 ORDER BY display_order ASC,id DESC');$q->execute([$shop['id']]);$products=$q->fetchAll();
   attachProductPhotos($products,productPhotoMap($db,(int)$shop['id']));
   respond(['shop'=>$shop,'categories'=>$cats,'products'=>$products,'csrf'=>$_SESSION['csrf']]);
  }
  $u=currentUser($db);if(!$u)respond(['error'=>'Please sign in'],401);
  if($action==='analytics'){
   if($u['role']!=='seller')respond(['error'=>'Seller access required'],403);
   $shop=shopFor($db,(int)$u['id']);$sid=(int)$shop['id'];
   $requestedFrom=(string)($_GET['from']??'');$requestedTo=(string)($_GET['to']??'');
   foreach([$requestedFrom,$requestedTo] as $date){
    if($date==='')continue;
    $parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date);
    if(!$parsed||$parsed->format('Y-m-d')!==$date)respond(['error'=>'Invalid analytics date'],422);
   }
   if($requestedFrom!==''&&$requestedTo!==''&&$requestedFrom>$requestedTo)respond(['error'=>'From Date must not be after To Date'],422);
   if($requestedFrom!==''&&$requestedTo!==''){
    $days=(new DateTimeImmutable($requestedFrom))->diff(new DateTimeImmutable($requestedTo))->days;
    if($days>365)respond(['error'=>'Select a date range of up to 366 days'],422);
   }
   // Empty filters represent all available history for this shop.
   $from=$requestedFrom?:'1970-01-01';
   $to=$requestedTo?:date('Y-m-d');
   $end=(new DateTimeImmutable($to))->modify('+1 day')->format('Y-m-d');
   $stats=['visit'=>0,'product_view'=>0,'whatsapp_click'=>0];
   $q=$db->prepare('SELECT event_type,COUNT(*) total FROM ds_analytics_events WHERE shop_id=? AND created_at>=? AND created_at<? GROUP BY event_type');
   $q->execute([$sid,$from,$end]);
   foreach($q->fetchAll() as $row)$stats[$row['event_type']]=(int)$row['total'];
   $q=$db->prepare("SELECT DATE(created_at) AS day,event_type,COUNT(*) AS total FROM ds_analytics_events WHERE shop_id=? AND created_at>=? AND created_at<? GROUP BY DATE(created_at),event_type ORDER BY day ASC");
   $q->execute([$sid,$from,$end]);$trend=[];
   foreach($q->fetchAll() as $row){$day=$row['day'];if(!isset($trend[$day]))$trend[$day]=['date'=>$day,'visit'=>0,'product_view'=>0,'whatsapp_click'=>0];$trend[$day][$row['event_type']]=(int)$row['total'];}
   $q=$db->prepare("SELECT COALESCE(p.name,'Deleted product') product_name,e.product_id,COUNT(*) views FROM ds_analytics_events e LEFT JOIN ds_products p ON p.id=e.product_id AND p.shop_id=e.shop_id WHERE e.shop_id=? AND e.event_type='product_view' AND e.created_at>=? AND e.created_at<? GROUP BY e.product_id,p.name ORDER BY views DESC LIMIT 10");
   $q->execute([$sid,$from,$end]);$topViews=$q->fetchAll();
   $q=$db->prepare('SELECT i.product_name,COUNT(DISTINCT e.id) enquiries,SUM(i.quantity) quantity FROM ds_enquiries e JOIN ds_enquiry_items i ON i.enquiry_id=e.id WHERE e.shop_id=? AND e.created_at>=? AND e.created_at<? GROUP BY i.product_name ORDER BY enquiries DESC,quantity DESC LIMIT 10');
   $q->execute([$sid,$from,$end]);$topEnquiries=$q->fetchAll();
   $q=$db->prepare('SELECT COUNT(*) FROM ds_enquiries WHERE shop_id=? AND created_at>=? AND created_at<?');
   $q->execute([$sid,$from,$end]);$stats['enquiries']=(int)$q->fetchColumn();
   respond(['stats'=>$stats,'trend'=>array_values($trend),'top_views'=>$topViews,'top_enquiries'=>$topEnquiries,'from'=>$requestedFrom,'to'=>$requestedTo]);
  }
  if($action==='enquiries'){
   if($u['role']!=='seller')respond(['error'=>'Seller access required'],403);
   $shop=shopFor($db,(int)$u['id']);$sid=(int)$shop['id'];
   $q=$db->prepare('SELECT id,kind,customer_name,customer_mobile,status,estimated_total,created_at FROM ds_enquiries WHERE shop_id=? ORDER BY id DESC LIMIT 200');
   $q->execute([$sid]);$enquiries=$q->fetchAll();
   $ids=array_map(static fn($e)=>(int)$e['id'],$enquiries);
   $items=[];
   if($ids){
    $placeholder=implode(',',array_fill(0,count($ids),'?'));
    $q=$db->prepare("SELECT enquiry_id,product_name,unit,quantity,unit_price FROM ds_enquiry_items WHERE enquiry_id IN ($placeholder) ORDER BY id");
    $q->execute($ids);
    foreach($q->fetchAll() as $item)$items[(int)$item['enquiry_id']][]=$item;
   }
   foreach($enquiries as &$enquiry)$enquiry['items']=$items[(int)$enquiry['id']]??[];
   unset($enquiry);
   respond(['enquiries'=>$enquiries]);
  }
  if($action==='dashboard'){
   if($u['role']==='admin'){
    $counts=['sellers'=>(int)$db->query("SELECT COUNT(*) FROM ds_users WHERE role='seller'")->fetchColumn(),'shops'=>(int)$db->query('SELECT COUNT(*) FROM ds_shops')->fetchColumn(),'products'=>(int)$db->query('SELECT COUNT(*) FROM ds_products')->fetchColumn(),'free_product_limit'=>quota($db)];
    $recent=$db->query('SELECT s.id,s.name,s.slug,s.active,s.created_at,u.name AS owner,u.email,(SELECT COUNT(*) FROM ds_products p WHERE p.shop_id=s.id) AS products FROM ds_shops s JOIN ds_users u ON u.id=s.user_id ORDER BY s.id DESC LIMIT 100')->fetchAll();
    respond(['role'=>'admin','stats'=>$counts,'shops'=>$recent]);
   }
   $shop=shopFor($db,(int)$u['id']);
   $q=$db->prepare('SELECT * FROM ds_categories WHERE shop_id=? ORDER BY id DESC');$q->execute([$shop['id']]);$categories=$q->fetchAll();
   $q=$db->prepare('SELECT * FROM ds_products WHERE shop_id=? ORDER BY display_order ASC,id DESC');$q->execute([$shop['id']]);$products=$q->fetchAll();
   attachProductPhotos($products,productPhotoMap($db,(int)$shop['id']));
   $q=$db->prepare('SELECT * FROM ds_catalogues WHERE shop_id=? ORDER BY id DESC');$q->execute([$shop['id']]);$catalogues=$q->fetchAll();
   $q=$db->prepare('SELECT cp.catalogue_id,cp.product_id FROM ds_catalogue_products cp JOIN ds_catalogues c ON c.id=cp.catalogue_id WHERE c.shop_id=?');$q->execute([$shop['id']]);
   respond(['role'=>'seller','shop'=>$shop,'categories'=>$categories,'products'=>$products,'catalogues'=>$catalogues,'catalogue_products'=>$q->fetchAll(),'free_product_limit'=>quota($db)]);
  }
  respond(['error'=>'Unknown endpoint'],404);
 }
 if($method!=='POST')respond(['error'=>'Method not allowed'],405);
 checkCsrf();
 if($action==='track-event'){
  $d=body();$slug=clean($d['slug']??'',90);$type=(string)($d['type']??'');
  if(!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/',$slug)||!in_array($type,['visit','product_view','whatsapp_click'],true))respond(['error'=>'Invalid analytics event'],422);
  $q=$db->prepare('SELECT id FROM ds_shops WHERE slug=? AND active=1');$q->execute([$slug]);$sid=(int)$q->fetchColumn();
  if(!$sid)respond(['error'=>'Shop unavailable'],404);
  $productId=null;
  if($type==='product_view'){
   $productId=filter_var($d['product_id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
   if($productId===false)respond(['error'=>'Invalid product'],422);
   $q=$db->prepare('SELECT id FROM ds_products WHERE id=? AND shop_id=? AND active=1');
   $q->execute([$productId,$sid]);if(!$q->fetchColumn())respond(['error'=>'Product unavailable'],404);
  }
  // A visit is unique per browser session and shop; product view once per
  // session/product. WhatsApp clicks are repeatable with a bounded session rate.
  $key=$type.':'.$sid.':'.($productId??0);
  $now=time();$events=$_SESSION['analytics_events']??[];
  if(!is_array($events))$events=[];
  $events=array_filter($events,static fn($at)=>is_int($at)&&$at>$now-86400);
  if($type!=='whatsapp_click'&&isset($events[$key]))respond(['ok'=>true,'deduplicated'=>true]);
  $clicks=$_SESSION['analytics_click_times']??[];
  if(!is_array($clicks))$clicks=[];
  $clicks=array_values(array_filter($clicks,static fn($at)=>is_int($at)&&$at>$now-60));
  if(count($clicks)>=30)respond(['error'=>'Event rate limit reached'],429);
  $clicks[]=$now;$_SESSION['analytics_click_times']=$clicks;
  $q=$db->prepare('INSERT INTO ds_analytics_events(shop_id,product_id,event_type) VALUES(?,?,?)');
  $q->execute([$sid,$productId,$type]);
  $events[$key]=$now;$_SESSION['analytics_events']=$events;
  respond(['ok'=>true]);
 }
 if($action==='public-enquiry'){
  // A public showroom visitor can initiate an enquiry without creating an account.
  $d=body();$slug=clean($d['slug']??'',90);$kind=(string)($d['kind']??'');
  if(!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/',$slug)||!in_array($kind,['order','quotation'],true))respond(['error'=>'Invalid shop enquiry'],422);
  $q=$db->prepare('SELECT id FROM ds_shops WHERE slug=? AND active=1');$q->execute([$slug]);$shopId=(int)$q->fetchColumn();
  if(!$shopId)respond(['error'=>'Shop unavailable'],404);
  $lines=$d['items']??null;
  if(!is_array($lines)||count($lines)<1||count($lines)>50)respond(['error'=>'Choose 1 to 50 products'],422);
  // Per-session limiter; stronger IP-based throttling can be added before public launch.
  $now=time();$recent=array_values(array_filter($_SESSION['enquiry_clicks']??[],static fn($t)=>is_int($t)&&$t>$now-300));
  if(count($recent)>=15)respond(['error'=>'Too many enquiries. Please try again shortly.'],429);
  $wanted=[];
  foreach($lines as $line){
   if(!is_array($line))respond(['error'=>'Invalid selected items'],422);
   $id=filter_var($line['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
   $qty=filter_var($line['quantity']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>999]]);
   if($id===false||$qty===false||isset($wanted[$id]))respond(['error'=>'Invalid product quantity'],422);
   $wanted[$id]=$qty;
  }
  $placeholders=implode(',',array_fill(0,count($wanted),'?'));
  $q=$db->prepare("SELECT id,name,unit,price FROM ds_products WHERE shop_id=? AND active=1 AND id IN ($placeholders)");
  $q->execute(array_merge([$shopId],array_keys($wanted)));
  $found=$q->fetchAll();
  if(count($found)!==count($wanted))respond(['error'=>'A selected product is no longer available. Refresh the showroom.'],409);
  $total=0.;$hasUnknown=false;
  foreach($found as $p){if($p['price']===null)$hasUnknown=true;else $total+=(float)$p['price']*$wanted[(int)$p['id']];}
  $totalValue=$hasUnknown?null:number_format($total,2,'.','');
  $name=trim((string)($d['customer_name']??''));
  $mobile=preg_replace('/\D/','',(string)($d['customer_mobile']??''));
  if($name===''||mb_strlen($name)>120)respond(['error'=>'Customer Name is required (maximum 120 characters)'],422);
  if(!preg_match('/^[0-9]{10}$/',$mobile))respond(['error'=>'Enter a valid 10-digit mobile number'],422);
  $db->beginTransaction();
  try{
   $q=$db->prepare('INSERT INTO ds_enquiries(shop_id,kind,customer_name,customer_mobile,estimated_total) VALUES(?,?,?,?,?)');
   $q->execute([$shopId,$kind,$name,$mobile,$totalValue]);$enquiryId=(int)$db->lastInsertId();
   $q=$db->prepare('INSERT INTO ds_enquiry_items(enquiry_id,product_id,product_name,unit,quantity,unit_price) VALUES(?,?,?,?,?,?)');
   foreach($found as $p)$q->execute([$enquiryId,(int)$p['id'],$p['name'],$p['unit'],$wanted[(int)$p['id']],$p['price']]);
   $db->commit();
  }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
  $recent[]=$now;$_SESSION['enquiry_clicks']=$recent;
  respond(['ok'=>true,'enquiry_id'=>$enquiryId]);
 }
 if($action==='register'){
  $d=body();$name=clean($d['name']??'');$email=strtolower(clean($d['email']??'',190));$password=(string)($d['password']??'');$shopName=clean($d['shop_name']??'');$phone=preg_replace('/\D/','',(string)($d['phone']??''));$slug=strtolower(clean($d['slug']??'',90));
  if(strlen($password)<4||strlen($password)>200||!filter_var($email,FILTER_VALIDATE_EMAIL)||!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/',$slug)||strlen($slug)<3||!$name||!$shopName||strlen($phone)<10||strlen($phone)>15)respond(['error'=>'Check required fields. Password must be at least 4 characters; shop link uses lowercase letters, numbers or hyphens.'],422);
  $db->beginTransaction();
  try{
   $q=$db->prepare('INSERT INTO ds_users(name,email,pass_hash) VALUES(?,?,?)');$q->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT)]);$uid=(int)$db->lastInsertId();
   $q=$db->prepare('INSERT INTO ds_shops(user_id,slug,name,phone) VALUES(?,?,?,?)');$q->execute([$uid,$slug,$shopName,$phone]);
   $db->commit();
  }catch(PDOException $e){$db->rollBack();if($e->getCode()==='23000')respond(['error'=>'Email or shop link is already in use'],409);throw $e;}
  session_regenerate_id(true);$_SESSION['user_id']=$uid;respond(['ok'=>true,'role'=>'seller']);
 }
 if($action==='login'||$action==='admin-login'){
  $d=body();
  $q=$db->prepare('SELECT id,pass_hash,role FROM ds_users WHERE email=?');
  $q->execute([strtolower(clean($d['email']??'',190))]);
  $row=$q->fetch();
  if(!$row||!password_verify((string)($d['password']??''),$row['pass_hash']))respond(['error'=>'Invalid email or password'],401);
  if($action==='admin-login'&&$row['role']!=='admin')respond(['error'=>'This account does not have administrator access'],403);
  if($action==='login'&&$row['role']==='admin')respond(['error'=>'Please use the Admin Login page'],403);
  session_regenerate_id(true);
  $_SESSION['user_id']=(int)$row['id'];
  respond(['ok'=>true,'role'=>$row['role']]);
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
  if($action==='change-password'){
   $current=(string)($d['current_password']??'');
   $new=(string)($d['new_password']??'');
   $confirm=(string)($d['confirm_password']??'');
   if(strlen($new)<4||strlen($new)>200)respond(['error'=>'New password must contain at least 4 characters (maximum 200).'],422);
   if($new!==$confirm)respond(['error'=>'New Password and Confirm New Password do not match.'],422);
   if($new===$current)respond(['error'=>'Choose a password different from your current password.'],422);
   $q=$db->prepare('SELECT pass_hash FROM ds_users WHERE id=? AND role=?');
   $q->execute([(int)$u['id'],'admin']);
   $hash=$q->fetchColumn();
   if(!$hash||!password_verify($current,$hash))respond(['error'=>'Current password is incorrect.'],403);
   $q=$db->prepare('UPDATE ds_users SET pass_hash=? WHERE id=? AND role=? AND pass_hash=?');
   $q->execute([password_hash($new,PASSWORD_DEFAULT),(int)$u['id'],'admin',$hash]);
   if($q->rowCount()!==1)respond(['error'=>'Password could not be updated. Please try again.'],409);
   session_regenerate_id(true);
   respond(['ok'=>true,'message'=>'Password updated successfully.']);
  }
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
 if($action==='enquiry-status'){
  $id=filter_var($d['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
  $status=(string)($d['status']??'');
  if($id===false||!in_array($status,['New','Follow-up','Completed'],true))respond(['error'=>'Invalid enquiry update'],422);
  $q=$db->prepare('UPDATE ds_enquiries SET status=? WHERE id=? AND shop_id=?');
  $q->execute([$status,$id,$sid]);
  $check=$db->prepare('SELECT id FROM ds_enquiries WHERE id=? AND shop_id=?');
  $check->execute([$id,$sid]);if(!$check->fetchColumn())respond(['error'=>'Enquiry not found'],404);
  respond(['ok'=>true]);
 }
 if($action==='shop'){
  $name=clean($d['name']??'');$tagline=clean($d['tagline']??'',255);$phone=preg_replace('/\D/','',(string)($d['phone']??''));$address=clean($d['address']??'',255);$logo=clean($d['logo_url']??'',500);
  $palette=['#E83F7E','#1D4ED8','#0F766E','#6D28D9','#9A3412','#334155'];
  $theme=strtoupper(clean($d['theme_color']??'#E83F7E',7));
  if(!in_array($theme,$palette,true))respond(['error'=>'Choose a valid shop colour'],422);
  $themeStyle=strtolower(clean($d['theme_style']??'classic',20));
  if(!in_array($themeStyle,['classic','modern','minimal'],true))respond(['error'=>'Choose a valid showroom theme'],422);
  $ownerName=array_key_exists('owner_name',$d)?clean($d['owner_name'],150):$u['name'];
  if(!$ownerName)respond(['error'=>'Your Name is required'],422);
  if(!$name||strlen($phone)<10||strlen($phone)>15||($logo&&!preg_match('~^https?://~i',$logo)&&!str_starts_with($logo,'/uploads/')))respond(['error'=>'Enter valid shop details'],422);
  $db->beginTransaction();
  try{
   $q=$db->prepare('UPDATE ds_shops SET name=?,tagline=?,phone=?,address=?,logo_url=?,theme_color=?,theme_style=? WHERE id=? AND user_id=?');
   $q->execute([$name,$tagline,$phone,$address,$logo,$theme,$themeStyle,$sid,(int)$u['id']]);
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
 if($action==='product-import'){
  $rows=$d['rows']??null;
  if(!is_array($rows)||count($rows)<1||count($rows)>100)respond(['error'=>'Import 1 to 100 products per file'],422);
  $cats=$db->prepare('SELECT id,name FROM ds_categories WHERE shop_id=?');
  $cats->execute([$sid]);$categoryIds=[];
  foreach($cats->fetchAll() as $category)$categoryIds[mb_strtolower(trim($category['name']))]=(int)$category['id'];
  $validated=[];$seen=[];
  foreach($rows as $i=>$row){
   $line=$i+2;
   if(!is_array($row))respond(['error'=>'Invalid row '.$line],422);
   $rawName=trim((string)($row['name']??''));
   $name=clean($rawName,180);
   if($rawName===''||mb_strlen($rawName)>180)respond(['error'=>'Invalid product name on row '.$line],422);
   $key=mb_strtolower($name);
   if(isset($seen[$key]))respond(['error'=>'Duplicate product name on rows '.$seen[$key].' and '.$line],422);
   $seen[$key]=$line;
   $category=trim((string)($row['category']??''));
   $cid=null;
   if($category!==''){
    $lookup=mb_strtolower($category);
    if(!array_key_exists($lookup,$categoryIds))respond(['error'=>'Unknown category on row '.$line.': '.$category],422);
    $cid=$categoryIds[$lookup];
   }
   $rawPrice=trim((string)($row['price']??''));
   $price=null;
   if($rawPrice!==''&&mb_strtolower($rawPrice)!=='on request'){
    if(!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/',$rawPrice)||((float)$rawPrice)>9999999999)respond(['error'=>'Invalid price on row '.$line],422);
    $price=number_format((float)$rawPrice,2,'.','');
   }
   $rawUnit=trim((string)($row['unit']??'Piece'));
   $unit=clean($rawUnit,30);
   if($unit===''||mb_strlen($rawUnit)>30)respond(['error'=>'Invalid unit on row '.$line],422);
   $rawDesc=trim((string)($row['description']??''));
   if(mb_strlen($rawDesc)>2500)respond(['error'=>'Description too long on row '.$line],422);
   $desc=clean($rawDesc,2500);
   $order=filter_var($row['display_order']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>999999]]);
   if($order===false)respond(['error'=>'Invalid display order on row '.$line],422);
   $visible=strtolower(trim((string)($row['visible']??'yes')));
   if(!in_array($visible,['yes','no'],true))respond(['error'=>'Visible must be Yes or No on row '.$line],422);
   $validated[]=[$sid,$cid,$name,$desc,$price,null,$visible==='yes'?1:0,$unit,$order];
  }
  $db->beginTransaction();
  try{
   // All rows are inserted together, or none. Product limits remain enforced.
   $db->query("SELECT setting_value FROM ds_settings WHERE setting_key='free_product_limit' FOR UPDATE")->fetchColumn();
   $count=$db->prepare('SELECT COUNT(*) FROM ds_products WHERE shop_id=?');
   $count->execute([$sid]);
   $existing=(int)$count->fetchColumn();
   if($existing+count($validated)>quota($db)){
    $db->rollBack();
    respond(['error'=>'Product limit exceeded: '.($existing).' existing, '.count($validated).' imported, '.quota($db).' allowed. No products imported.'],403);
   }
   $names=$db->prepare('SELECT name FROM ds_products WHERE shop_id=?');
   $names->execute([$sid]);$existingNames=[];
   foreach($names->fetchAll(PDO::FETCH_COLUMN) as $existingName)$existingNames[mb_strtolower(trim($existingName))]=true;
   foreach($validated as $index=>$values){
    if(isset($existingNames[mb_strtolower($values[2])])){
     $db->rollBack();respond(['error'=>'Product already exists on row '.($index+2).': '.$values[2].'. No products imported.'],409);
    }
   }
   $save=$db->prepare('INSERT INTO ds_products(shop_id,category_id,name,description,price,image_url,active,unit,display_order) VALUES(?,?,?,?,?,?,?,?,?)');
   foreach($validated as $values)$save->execute($values);
   $db->commit();
   respond(['ok'=>true,'created'=>count($validated)]);
  }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
 }
 if($action==='gallery-product-import'){
  $rows=$d['rows']??null;
  if(!is_array($rows)||count($rows)<1||count($rows)>30)respond(['error'=>'Select 1 to 30 photos for new products'],422);
  $validated=[];$seen=[];
  foreach($rows as $index=>$row){
   $line=$index+1;
   if(!is_array($row))respond(['error'=>'Invalid gallery product '.$line],422);
   $rawName=trim((string)($row['name']??''));
   if($rawName===''||mb_strlen($rawName)>180)respond(['error'=>'Enter a valid name for product '.$line],422);
   $name=clean($rawName,180);$key=mb_strtolower($name);
   if(isset($seen[$key]))respond(['error'=>'Duplicate name in selected photos: '.$name],422);
   $seen[$key]=true;
   $url=trim((string)($row['image_url']??''));
   if(!preg_match('~^/uploads/'.preg_quote((string)$sid,'~').'/[a-f0-9]{32}\.(?:jpg|png|webp)$~',$url))
    respond(['error'=>'Invalid photo for product '.$line],422);
   $price=trim((string)($row['price']??''));
   if($price===''||mb_strtolower($price)==='on request')$price=null;
   elseif(!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/',$price)||(float)$price>9999999999)
    respond(['error'=>'Invalid price for product '.$line],422);
   else $price=number_format((float)$price,2,'.','');
   $cat=(int)($row['category_id']??0);
   if($cat&&!belongs($db,'ds_categories',$cat,$sid))respond(['error'=>'Invalid category for product '.$line],422);
   $unit=trim((string)($row['unit']??'Piece'));
   if($unit===''||mb_strlen($unit)>30)respond(['error'=>'Invalid unit for product '.$line],422);
   $validated[]=[$sid,$cat?:null,$name,'',$price,$url,1,$unit,0];
  }
  $db->beginTransaction();
  try{
   $db->query("SELECT setting_value FROM ds_settings WHERE setting_key='free_product_limit' FOR UPDATE")->fetchColumn();
   $c=$db->prepare('SELECT COUNT(*) FROM ds_products WHERE shop_id=?');$c->execute([$sid]);
   if((int)$c->fetchColumn()+count($validated)>quota($db)){
    $db->rollBack();respond(['error'=>'Product limit exceeded. No products have been created.'],403);
   }
   $q=$db->prepare('SELECT name FROM ds_products WHERE shop_id=?');$q->execute([$sid]);
   foreach($q->fetchAll(PDO::FETCH_COLUMN) as $existingName){
    if(isset($seen[mb_strtolower(trim((string)$existingName))])){
     $db->rollBack();respond(['error'=>'A product name already exists: '.$existingName.'. No products have been created.'],409);
    }
   }
   $insert=$db->prepare('INSERT INTO ds_products(shop_id,category_id,name,description,price,image_url,active,unit,display_order) VALUES(?,?,?,?,?,?,?,?,?)');
   $gallery=$db->prepare('INSERT INTO ds_product_images(shop_id,product_id,image_url,display_order) VALUES(?,?,?,0)');
   foreach($validated as $values){
    $insert->execute($values);$gallery->execute([$sid,(int)$db->lastInsertId(),$values[5]]);
   }
   $db->commit();respond(['ok'=>true,'created'=>count($validated)]);
  }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
 }
 if($action==='product-save'){
  $id=(int)($d['id']??0);$name=clean($d['name']??'',180);$desc=clean($d['description']??'',2500);$img=clean($d['image_url']??'',500);$cat=(int)($d['category_id']??0);$price=$d['price']??null;$active=!empty($d['active'])?1:0;
  $unit=clean($d['unit']??'Piece',30);
  $order=filter_var($d['display_order']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>999999]]);
  if($unit===''||$order===false)respond(['error'=>'Enter a valid product unit and display order'],422);
  if(!$name||($img&&!preg_match('~^https?://~i',$img)&&!str_starts_with($img,'/uploads/')))respond(['error'=>'Valid product name and image required'],422);
  if($cat&&!belongs($db,'ds_categories',$cat,$sid))respond(['error'=>'Invalid category'],422);
  if($price===''||$price===null)$price=null;elseif(!is_numeric($price)||(float)$price<0||(float)$price>9999999999)respond(['error'=>'Invalid price'],422);else $price=number_format((float)$price,2,'.','');
  $submittedImages=$d['images']??null;
  if($submittedImages!==null){
   if(!is_array($submittedImages)||count($submittedImages)>6)respond(['error'=>'You can save up to 6 photos per product'],422);
   $images=[];
   foreach($submittedImages as $url){
    if(!is_string($url)||strlen($url)>500)respond(['error'=>'Invalid product image'],422);
    $url=trim($url);
    if($url==='')continue;
    $isLocal=(bool)preg_match('~^/uploads/'.preg_quote((string)$sid,'~').'/[a-f0-9]{32}\\.(?:jpg|png|webp)$~',$url);
    // Historical primary photos can be external URLs; do not invalidate existing product images.
    $isPreviousPrimary=false;
    if($id){$existingPhoto=$db->prepare('SELECT image_url FROM ds_products WHERE id=? AND shop_id=?');$existingPhoto->execute([$id,$sid]);$isPreviousPrimary=$url===(string)$existingPhoto->fetchColumn();}
    if(!$isLocal&&!$isPreviousPrimary)respond(['error'=>'Choose photos uploaded to your own shop'],422);
    if(!in_array($url,$images,true))$images[]=$url;
   }
   if(count($images)>6)respond(['error'=>'You can save up to 6 photos per product'],422);
   $img=$images[0]??'';
  }else{$images=null;}

  if($id){if(!belongs($db,'ds_products',$id,$sid))respond(['error'=>'Product not found'],404);
   $q=$db->prepare('UPDATE ds_products SET name=?,description=?,category_id=?,price=?,image_url=?,active=?,unit=?,display_order=? WHERE id=?');$q->execute([$name,$desc,$cat?:null,$price,$img,$active,$unit,$order,$id]);
  }else{
   $db->beginTransaction();
   try{
    $db->query('SELECT setting_value FROM ds_settings WHERE setting_key="free_product_limit" FOR UPDATE')->fetchColumn();
    $q=$db->prepare('SELECT COUNT(*) FROM ds_products WHERE shop_id=?');$q->execute([$sid]);
    if((int)$q->fetchColumn()>=quota($db)){$db->rollBack();respond(['error'=>'Free product allowance reached. Contact the administrator for more capacity.'],403);}
    $q=$db->prepare('INSERT INTO ds_products(shop_id,category_id,name,description,price,image_url,active,unit,display_order) VALUES(?,?,?,?,?,?,?,?,?)');$q->execute([$sid,$cat?:null,$name,$desc,$price,$img,$active,$unit,$order]);
    $id=(int)$db->lastInsertId();$db->commit();
   }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
  }
  if($images!==null){
   // Replace only this product's gallery metadata. Uploaded files are never deleted here.
   $db->beginTransaction();
   try{
    $db->prepare('DELETE FROM ds_product_images WHERE product_id=? AND shop_id=?')->execute([$id,$sid]);
    $q=$db->prepare('INSERT INTO ds_product_images(shop_id,product_id,image_url,display_order) VALUES(?,?,?,?)');
    foreach($images as $index=>$url)$q->execute([$sid,$id,$url,$index]);
    $db->commit();
   }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
  }
  respond(['ok'=>true]);
 }
 if($action==='product-delete'){
  $id=(int)($d['id']??0);if(!belongs($db,'ds_products',$id,$sid))respond(['error'=>'Not found'],404);
  $db->prepare('DELETE FROM ds_catalogue_products WHERE product_id=?')->execute([$id]);$db->prepare('DELETE FROM ds_product_images WHERE product_id=? AND shop_id=?')->execute([$id,$sid]);$db->prepare('DELETE FROM ds_products WHERE id=?')->execute([$id]);respond(['ok'=>true]);
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
