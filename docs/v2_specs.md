# Feeds aggregator enhancements specs
Jeff Lyon, Oct 6 2015
Updated Oct 8

Jeff to go over changes we have made to original script (https://github.com/proudcity/SocialMediaAggregator/tree/circa)
* Storing user accounts in sma_users mongodb collection
* mapping posts to users / services 
* Saving some keys (private) in .env file
* Geo-enabled database

### I. Changes to User mongodb collection

1. Change the format of each individual service (these are now stored in mongodb `sma_users` collection) from 
```
{
  "facebook": ["@cristiano", "#govtech"] 
}
```
to:
```
{
  "facebook": {
    "frequency": 3000,
    "feeds": [
      {
        "type": "account",
        "frequency": 24000, // overrides frequency on facebook-level
        "query": "cristiano"
      },
      {
        "type": "hashtag",
        "query": "govtech"
      }
    ]
  }
}
```

2. Allow some top-level user data to be stored:
 * a) Location: geojson (`loc`)
 * b) description: Text (Long)
 * c) teaser: Text
 * d) image: Url

**See attched User.json file for full example**


### II. Tweak existing feeds

1. Store lat/lng data when available as (see http://docs.mongodb.org/manual/reference/operator/query/near/)
```
post.loc = {
    type : "Point",
    coordinates : [<Float lng>, <Float lat>],
    address: <Array address components (if available)>
}
```


### III. Add additional feeds

#### 1. Socrata: (mostly implemented: https://github.com/proudcity/SocialMediaAggregator/blob/circa/social_media_aggregator/data_extractors/SocrataAggregator.js) no authentication necessary
 * Docs: http://dev.socrata.com/
 * Example: https://data.oaklandnet.com/Public-Safety/CrimeWatch-Maps-Past-90-Days/ym6k-rx7a
```
"socrata": {
  "frequency": 24000,
  "feeds": [
    {
      "type": "crime",
      "url": "https://data.oaklandnet.com/resource/ym6k-rx7a.json"
    }
  ]
}
```

#### 2. Foursquare: (partially implemented: https://github.com/proudcity/SocialMediaAggregator/blob/circa/social_media_aggregator/data_extractors/FoursquareAggregator.js)
```
"foursquare": {
  "frequency": 240000,
  "feeds": [
    {
      "type": "schools",
      "url": "query"
    }
  ]
}
```
Example url (lat/lng comes from I.2.a above):
```
https://api.foursquare.com/v2/venues/explore?ll=44.5645659,-123.2620435&query=police%20station&client_id=xxx&client_secret=xxx&v=20140601
```

##### 2.1 Foursquare hours data from Google

2.1.1: Query place search: https://developers.google.com/places/web-service/search?hl=en
```
query: "type" from foursquare feed query ("schools")
title: title response from forsquare for specific item
key: google api key

var url = 'https://maps.googleapis.com/maps/api/place/search/json?' + $.param({
  location: lat +','+ lng,
  type: query.replace(' station', ''),
  search: props.title,
  key: '***',
  sensor: true,
  radius: 250
});
```
This will return something like http://my.getproudcity.com/api/proudcity/proxy?url=https%3A%2F%2Fmaps.googleapis.com%2Fmaps%2Fapi%2Fplace%2Fsearch%2Fjson%3Flocation%3D44.5680661407409%252C-123.261430752826%26type%3Dschool%26search%3D%26key%3DAIzaSyAqSVs6Hsk1EjKiSa4TV9fykhB7K3ijkaM%26sensor%3Dtrue%26radius%3D250


2.1.2: Query place details: https://developers.google.com/places/web-service/details
```
data: response from 2.1.1

var url = 'https://maps.googleapis.com/maps/api/place/details/json?' + $.param({
  key: 'AIzaSyAqSVs6Hsk1EjKiSa4TV9fykhB7K3ijkaM',
  placeid: data.results[0].place_id
});
```
Example response: http://my.getproudcity.com/api/proudcity/proxy?url=https%3A%2F%2Fmaps.googleapis.com%2Fmaps%2Fapi%2Fplace%2Fdetails%2Fjson%3Fkey%3DAIzaSyAqSVs6Hsk1EjKiSa4TV9fykhB7K3ijkaM%26placeid%3DChIJ7WVBeetAwFQRQYOq4re33R8

If we get a response back, add the data to the feed prepared by foursquare:
```
data: response from 2.1.2
feed: the feed object that has been prepared by foursquare

if (data.status == 'OK' && data.result != undefined) {
  feed.website = data.result.website;
  feed.googleLocalHours = data.result;
  feed.googleLocal.hours = data.result.opening_hours != undefined ? data.result.opening_hours.weekday_text.join('<br/>') : false;
}
```

See docs/foursquare_item.json for an example complete foursquare feed.



#### 3. Open311/SeeClickFix
```
"open311": {
  "frequency": 24000,
  "zoom": 8, // map zoom level
  "per_page": 50,
  "feeds": [
    {
      "status": "open"
    },
    {
      "status": "closed"
    },
    {
      "status": "acknowledged"
    }
  ]
}
```
Example url (lat/lng comes from I.2.a above):
```
https://seeclickfix.com/api/v2/issues?lat=44.5645659&lng=-123.2620435&zoom=<zoom>&per_page=<per_page>&sort=created_at&status=status
```
See http://dev.seeclickfix.com/, http://seeclickfix.com/open311/v2/docs

#### 4. RSS (https://en.wikipedia.org/wiki/RSS)
```
"rss": {
  "frequency": 24000,
  "feeds": [
    {
      "type": "headlines",
      "location": "http://www.npr.org/rss/rss.php?id=1001"
    },
    {
      "type": "world_news",
      "location": "http://www.npr.org/rss/rss.php?id=1004"
    }
  ]
}
``` 

#### 5. iCal (https://en.wikipedia.org/wiki/ICalendar)
```
"rss": {
  "frequency": 24000,
  "feeds": [
    {
      "type": "fixtures",
      "location": "http://www.fcbarcelona.com/football/first-team/i-calendar/2015-2016"
    }
  ]
}
``` 

#### 6. Yelp
 * Requires oauth?
 * Docs: https://www.yelp.com/developers/documentation/v2/search_api
 * May eventually want lat/lng search (but not right now)
``` 
"yelp": {
  "frequency": 240000,
  "feeds": [
    {
      "type": "location",
      "location": "Rockridge, Oakland"
    },
  ]
}
```
Example request url
```
https://api.yelp.com/v2/search?location=Rockridge, Oakland&key=xxx
```


#### 7. GTFS (https://en.wikipedia.org/wiki/General_Transit_Feed_Specification)
 * Code should be available in https://github.com/UlmApi/livemap
 * Wipe all existing entries matching type on import
 * Mostly interested in getting stops (with lat/lng) as feed items
 * Getting/reporting schedule information would be nice in the future

Example gtfs feed to use: http://www.gtfs-data-exchange.com/agency/ac-transit/latest.zip
``` 
"gtfs": {
  "frequency": 240000,
  "feeds": [
    {
      "type": "bart",
      "url": "http://www.bart.gov/dev/schedules/google_transit.zip"
    },
    {
      "type": "actransit",
      "url": "http://gtfs.s3.amazonaws.com/ac-transit_20150218_1708.zip"
    }
  ]
}
```


#### 8. Polling places (Google Civic information)
 * NOTE: We currently can't get any data because there is no election, but you can see the relevant docs below.  It would be great to have the general aggregator written, but obviously it can't be tested until later
 * Docs: https://developers.google.com/civic-information/docs/v2/elections/voterInfoQuery
 * We need to get an election id from https://developers.google.com/civic-information/docs/v2/elections/electionQuery
 * @todo: it would be great to have way to automate the updating of this when there is an upcoming election (this would be used instead of the frequency param)
``` 
"election": {
  "frequency": 240000,
  "electionId": 4143 // Obtained manually from a call to https://www.googleapis.com/civicinfo/v2/elections?key={YOUR_API_KEY}
}
```
Example request url
```
https://www.googleapis.com/civicinfo/v2/voterinfo?address=oakland%2C+ca&electionId=2000&fields=pollingLocations&key={YOUR_API_KEY}
```




### IV. Pull data for each user

When creating a new User, automatically pull in data from:
 1. Wikipedia: Text and image (example: https://en.wikipedia.org/wiki/Rockridge,_Oakland,_California)
 2. Geojson file: (select relevant Feature from https://github.com/substack/oakland-neighborhoods)
 3. Google Civic Info API

#### 1 Wikipedia
Discussed in emails

#### 2. Geojson
(select relevant Feature from https://github.com/substack/oakland-neighborhoods).  See geometry.md for example of what we want the api callback to return, or users.json for example data.


#### 3. Google Civic Info API
 * Question: Should these be feed items?
 * Docs: https://developers.google.com/civic-information/docs/v2/representatives/representativeInfoByAddress

Save data under the `representatives` item for cities and neighborhoods.
 * For cities: People from offices where the divisionId is a child of the state level
    Exmaples from https://www.googleapis.com/civicinfo/v2/representatives?address=37.845553%2C-122.234191&key={YOUR_API_KEY}:
     - ocd-division/country:us/state:ca/county:alameda/council_district:5
     - ocd-division/country:us/state:ca/place:oakland/council_district:1
 * For neighborhoods: People from offices where the divisionId is on the child level of the county or place
    Exmaples from https://www.googleapis.com/civicinfo/v2/representatives?address=37.845553%2C-122.234191&key={YOUR_API_KEY}:
     - ocd-division/country:us/state:ca/county:alameda
     - ocd-division/country:us/state:ca/place:oakland
     - ocd-division/country:us/state:ca/sldu:9

Example request url
```
https://www.googleapis.com/civicinfo/v2/representatives?address=37.845553%2C-122.234191&key={YOUR_API_KEY}
```
