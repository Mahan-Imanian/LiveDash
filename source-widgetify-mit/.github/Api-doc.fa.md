### DashLiveAPI DashLivein DashLive> [!NOTE]
> in DashLiveAPI DashLivePULL REQUEST DashLiveAPI DashLive### DashLiveAPI DashLive* in DashLive## Cache / Rate Limit
- DashLiveAPI DashLiveCache DashLive Rate Limit DashLiveRate Limit inDashLiveprivate DashLiveCache DashLiveAPI DashLive1 DashLive10 minute DashLive 1 hour DashLive## Wallpaper API

### GET /wallpaper
Query Params:
- `page` (int): DashLive`limit` (int): DashLivein DashLive`type` (str): IMAGE & VIDEO
- `category` (str): Tehran, Dubai, Desert, Sea, Forest, Mountain, Sky, Space, Abstract, City, Other

Response:
```json
{
  "wallpapers": [
    {
      "id": "67c20fb09985263793140b49",
      "name": "DashLive",
      "source": "https://www.google.com",
      "category": "Abstract",
      "type": "IMAGE",
      "src": "https://storage.c2.liara.space/dashlive-ir/wallpapers/243ee1f4-3ce9-4120-9250-1d765572f926.jpeg"
    }
  ],
  "totalPages": 9
}
```


## Weather API

### GET /weather/current
Query Params:
- `lat` (float*): DashLive`lon` (float*): DashLive`useAI` (bool*): DashLiveAI DashLiveago‌DashLiveresponse:
```json
{
    "city": {
        "fa": "Tehran",
        "en": "Tehran/DashLive"
    },
    "weather": {
        "description": {
            "text": "DashLive",
            "emoji": "☁️"
        },
        "icon": {
            "url": "https://storage.c2.liara.space/dashlive-ir/weather/04n.png",
        },
        "label": "DashLive‌DashLive",
        "temperature": {
            "clouds": 93,
            "humidity": 59,
            "pressure": 1014,
            "temp": 18.79,
            "temp_description": "DashLive🌠",
            "temp_max": 18.79,
            "temp_min": 18.79,
            "wind_speed": 0.94
        },
        "ai": {
            "description": "DashLive19 inDashLive‌DashLive‌DashLive",
            "playlist": null
        }
    }
}
```

### GET /weather/forecast
Query Params:
- `lat*` (float*): DashLive`lon*` (float*): DashLive`count` (int): DashLive‌DashLiveago‌DashLiveresponse:
```json
[
    {
        "temp": 18.57,
        "icon": "https://storage.c2.liara.space/dashlive-ir/weather/04n.svg",
        "date": "2025-03-09 18:00:00"
    },
    {
        "temp": 18.03,
        "icon": "https://storage.c2.liara.space/dashlive-ir/weather/04n.svg",
        "date": "2025-03-09 21:00:00"
    },
    {
        "temp": 16.8,
        "icon": "https://storage.c2.liara.space/dashlive-ir/weather/04n.svg",
        "date": "2025-03-10 00:00:00"
    },
    {
        "temp": 14.75,
        "icon": "https://storage.c2.liara.space/dashlive-ir/weather/04n.svg",
        "date": "2025-03-10 03:00:00"
    }
]
```


### GET /weather/cities
Query Params:
- `city` (str*): Name DashLiveresponse:
```json
[
 {
    "name": "Tehran",
    "country": "IR",
    "state" null,
    "lat": 35.6892523,
    "lon": 51.3896004
  },
]
```


## Date

### GET /date/events
Query Params:

response:
```json
{
    "shamsiEvents": [
        {
            "id": "67ca1528f0eeeba246d0e6f2",
            "isHoliday": true,
            "title": "DashLiveday",
            "day": 1,
            "month": 1,
            "icon": "https://storage.c2.liara.space/dashlive-ir/events/5e30a5de-2ad8-4fe5-88b6-4c402c07e297.png"
        },
     
    ],
    "gregorianEvents": [
        {
            "isHoliday": false,
            "title": "📱 DashLive",
            "day": 9,
            "month": 1,
            "icon": null
        }
  ],
   "hijriEvents": [
        {
            "id": "67ca1528f0eeeba246d0e7c7",
            "isHoliday": true,
            "title": "DashLive",
            "day": 2,
            "month": 10,
            "icon": null
        },
  ]
}
```

### GET /date/timezones
Query Params:

response:
```json
[
  {
    "label": "Europe / London",
    "value": "Europe/London",
    "offset": "+00:00"
  }
]
```
