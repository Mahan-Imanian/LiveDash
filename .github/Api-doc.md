### API documentation is provided in this file.

> [!NOTE]
> If the required API is not available, use mock data and mention it in the pull request. The required API will be created.

### API Usage Guide
Fields marked with * are required.

## Cache / Rate Limit
- Each API has cache and rate-limit controls.
- Rate-limit values are private.
- Cache duration is usually between 1 and 10 minutes, or up to 1 hour for low-change endpoints.

## Wallpaper API

### GET /wallpaper
Query Params:
- `page` (int): Page number
- `limit` (int): Number of images per page
- `type` (str): IMAGE or VIDEO
- `category` (str): London, Paris, Berlin, Rome, Amsterdam, Dubai, Desert, Sea, Forest, Mountain, Sky, Space, Abstract, City, Other

Response:
```json
{
  "wallpapers": [
    {
      "id": "67c20fb09985263793140b49",
      "name": "Color waves",
      "source": "https://www.google.com",
      "category": "Abstract",
      "type": "IMAGE",
      "src": "https://storage.livedash.eu/wallpapers/243ee1f4-3ce9-4120-9250-1d765572f926.jpeg"
    }
  ],
  "totalPages": 9
}
```

## Weather API

### GET /weather/current
Query Params:
- `lat` (float*): Latitude
- `lon` (float*): Longitude
- `useAI` (bool*): Use AI for prediction

Response:
```json
{
  "city": {
    "en": "Berlin"
  },
  "weather": {
    "description": {
      "text": "Cloudy",
      "emoji": "☁️"
    },
    "icon": {
      "url": "https://storage.livedash.eu/weather/04n.png"
    },
    "label": "Dense clouds are covering the sun.",
    "temperature": {
      "clouds": 93,
      "humidity": 59,
      "pressure": 1014,
      "temp": 18.79,
      "temp_description": "Cool evening",
      "temp_max": 18.79,
      "temp_min": 18.79,
      "wind_speed": 0.94
    },
    "ai": {
      "description": "Berlin has cloudy skies and mild wind with a temperature near 19°C.",
      "playlist": null
    }
  }
}
```

### GET /weather/forecast
Query Params:
- `lat*` (float*): Latitude
- `lon*` (float*): Longitude
- `count` (int): Number of forecast items

Response:
```json
[
  {
    "temp": 18.57,
    "icon": "https://storage.livedash.eu/weather/04n.svg",
    "date": "2025-03-09 18:00:00"
  }
]
```

### GET /weather/cities
Query Params:
- `city` (str*): City name

Response:
```json
[
  {
    "name": "Berlin",
    "country": "DE",
    "state": "Berlin",
    "lat": 52.52,
    "lon": 13.405
  }
]
```

## Date

### GET /date/events

Response:
```json
{
  "regionalEvents": [
    {
      "id": "67ca1528f0eeeba246d0e6f2",
      "isHoliday": true,
      "title": "New Year's Day",
      "day": 1,
      "month": 1,
      "icon": "https://storage.livedash.eu/events/new-year.png"
    }
  ],
  "gregorianEvents": [
    {
      "isHoliday": false,
      "title": "First iPhone introduced",
      "day": 9,
      "month": 1,
      "icon": null
    }
  ],
  "hijriEvents": [
    {
      "id": "67ca1528f0eeeba246d0e7c7",
      "isHoliday": true,
      "title": "Eid al-Fitr",
      "day": 2,
      "month": 10,
      "icon": null
    }
  ]
}
```

### GET /date/timezones
Response:
```json
[
  {
    "label": "Europe / Berlin",
    "value": "Europe/Berlin",
    "offset": "+01:00"
  }
]
```
