```
curl -X GET -H "Content-Type: application/json" 'http://localhost:8080/api/near?lat=7.845553&lng=-122.234191'
```


Response
```
{
  
  "city": {
    "name":"Oakland,_California",
    "label": "Oakland",
    "teaser": "...", // see users.json
    "description": "...", // see users.json
    "wikipediaUrl": "...", // see users.json
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Rockridge03102006.JPG/250px-Rockridge03102006.JPG",
    "representatives": {
      // All representative feed items for this city
    }
    "transit": {
      // Closest transit stops from gtfs - 5 items, order by proximity
    },
    "crime": {
      // Socrata type: "crime" - 5 items, order by combination of date and proximity
    },
    "services": {
      // Foursquare - 5 items, order by combination of date and proximity, with distinct types (1 school, 1 library, etc)
    },
    "businesses": {
      // Yelp - 10 items, order by combination of proximity and popularity
    },
    "vote": {
      // Polling places - 3 items, order by proximity
    }
    "feeds": {
      // Combination of:
      // - iCal items - 5 items, upcoming, ordered by soonest first, if multiple types are available, try to select one from each type
      // - RSS items - 5 items, most recently posted first, if multiple types are available, try to select one from each type
      // - Facebook/Twitter/Youtube/Instagra: Collection, sorted by combination of proximity and date.  Will require some refinement. Should be somewhat similar to current http://localhost:8080/api/issaquah_wa/feed/default output.
    },
  }

  "neighborhood": {
  "name":"Rockridge,_Oakland,_California",
    "label": "Rockridge",
    "teaser": "...", // see users.json
    "description": "...", // see users.json
    "wikipediaUrl": "...", // see users.json
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Rockridge03102006.JPG/250px-Rockridge03102006.JPG",
    "representatives": {
      // All representative feed items for this neighborhood
    }
    "feeds": {
      // Combination of:
      // - iCal items - 5 items, upcoming, ordered by soonest first, if multiple types are available, try to select one from each type
      // - RSS items - 5 items, most recently posted first, if multiple types are available, try to select one from each type
      // - Facebook/Twitter/Youtube/Instagra: Collection, sorted by combination of proximity and date.  Will require some refinement. Should be somewhat similar to current http://localhost:8080/api/issaquah_wa/feed/default output.
    },
  }

}

```