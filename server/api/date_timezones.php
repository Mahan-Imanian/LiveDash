<?php
require __DIR__ . '/bootstrap.php';
json_response([
    ['id'=>'UTC','label'=>'UTC','value'=>'UTC','offset'=>'+00:00'],
    ['id'=>'Europe/London','label'=>'Europe / London','value'=>'Europe/London','offset'=>'+00:00'],
    ['id'=>'Europe/Berlin','label'=>'Europe / Berlin','value'=>'Europe/Berlin','offset'=>'+01:00'],
    ['id'=>'Europe/Paris','label'=>'Europe / Paris','value'=>'Europe/Paris','offset'=>'+01:00'],
    ['id'=>'America/New_York','label'=>'America / New York','value'=>'America/New_York','offset'=>'-05:00'],
    ['id'=>'America/Los_Angeles','label'=>'America / Los Angeles','value'=>'America/Los_Angeles','offset'=>'-08:00'],
    ['id'=>'Asia/Dubai','label'=>'Asia / Dubai','value'=>'Asia/Dubai','offset'=>'+04:00'],
    ['id'=>'Asia/Singapore','label'=>'Asia / Singapore','value'=>'Asia/Singapore','offset'=>'+08:00']
]);
