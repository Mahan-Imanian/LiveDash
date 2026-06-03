<?php
require __DIR__ . '/bootstrap.php';
$input=request_json(); $email=(string)($input['email'] ?? ''); $password=(string)($input['password'] ?? ''); $name=(string)($input['name'] ?? ''); if(!$email || strlen($password)<8) json_response(['statusCode'=>422,'message'=>'Valid email and password are required','data'=>null],422); $mysqli=db($config); $user=upsert_user_by_email($mysqli,$email,$password,$name ?: null); $token=issue_token($mysqli,(int)$user['id']); header('refresh_token: '.$token); json_response(['statusCode'=>200,'message'=>null,'data'=>$token,'isNewUser'=>true]);
