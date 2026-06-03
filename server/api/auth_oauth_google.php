<?php
require __DIR__ . '/bootstrap.php';
$input = request_json();
$access = (string)($input['token'] ?? '');
if (!$access) json_response(['statusCode'=>422,'message'=>'Missing Google token','data'=>null],422);

if (str_starts_with($access, 'LD_')) {
    $token = substr($access, 3);
    $mysqli = db($config);
    $user = user_from_token($mysqli, $token);
    if (!$user) json_response(['statusCode'=>401,'message'=>'Invalid LiveDash token','data'=>null],401);
    record_event($mysqli, (int)$user['id'], 'extension_google_sign_in', []);
    header('refresh_token: '.$token);
    json_response(['statusCode'=>200,'message'=>null,'data'=>$token,'isNewUser'=>false]);
}

$ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>12,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$access]]);
$response = curl_exec($ch); $status = curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
if ($status !== 200 || !$response) json_response(['statusCode'=>401,'message'=>'Google verification failed','data'=>null],401);
$profile = json_decode($response,true); $email=(string)($profile['email'] ?? ''); if(!$email) json_response(['statusCode'=>422,'message'=>'Google account has no email','data'=>null],422);
$mysqli=db($config); $user=upsert_user_by_email($mysqli,$email,null,$profile['name'] ?? null); $uid=(int)$user['id']; $avatar=(string)($profile['picture'] ?? ''); $sub=(string)($profile['sub'] ?? '');
$stmt=$mysqli->prepare('UPDATE livedash_users SET google_sub=?, display_name=COALESCE(NULLIF(display_name, ""), ?), avatar_url=? WHERE id=?'); $stmt->bind_param('sssi',$sub,$profile['name'],$avatar,$uid); $stmt->execute();
$token=issue_token($mysqli,$uid); record_event($mysqli,$uid,'google_sign_in',[]); header('refresh_token: '.$token); json_response(['statusCode'=>200,'message'=>null,'data'=>$token,'isNewUser'=>false]);
