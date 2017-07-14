```
curl -X GET -H "Content-Type: application/json" 'http://localhost:8080/api/oakland_ca/geometry/{type}'
```
`type` is one of:
* `transit` the gtfs shapefile (for a city)
* `area` the area shapefile (for a neighborhood mostly, but also for a city)
```


Response
```
{
  
  "type": "city" // or neighborhood
  "parent": {id} // only for neighborhood
  "name":"Rockridge,_Oakland,_California",
  "label": "Rockridge",
  "geometry": { // This is GeoJSON
    type: "Polygon",
    coordinates: [
      ...
    ]
  }
}