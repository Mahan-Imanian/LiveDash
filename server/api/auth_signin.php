<?php
require __DIR__ . '/bootstrap.php';
$input=request_json(); $email=(string)($input['email'] ?? ''); $password=(string)($input['password'] ?? ''); if(!$email) json_response(['statusCode'=>422,'message'=>'Email is required','data'=>null],422); $mysqli=db($config); $user=upsert_user_by_email($mysqli,$email,$password ?: null); $token=issue_token($mysqli,(int)$user['id']); header('refresh_token: '.$token); json_response(['statusCode'=>200,'message'=>null,'data'=>$token]);
