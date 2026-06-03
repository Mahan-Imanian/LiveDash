<?php
require __DIR__ . '/bootstrap.php';
json_response(['shamsiEvents'=>[],'hijriEvents'=>[],'gregorianEvents'=>[['month'=>1,'day'=>1,'title'=>'New Year’s Day','isHoliday'=>true],['month'=>12,'day'=>25,'title'=>'Christmas Day','isHoliday'=>true]]]);
