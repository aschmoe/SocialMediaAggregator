* Get feed for all user agencies -- in form /api/:user/feed/
```
curl -X GET -H "Content-Type: application/json" 'http://localhost:8080/api/issaquah_wa/feed'
```

* Get feed for specific services -- in form /api/:user/feed/?services[]=
```
curl -X GET -H "Content-Type: application/json" 'http://localhost:8080/api/issaquah_wa/feed?services[]=facebook&services[]=instagram'
```

* Get feed for service and account -- in form /api/:user/feed/:service/:type/:query
```
curl -X GET -H "Content-Type: application/json" 'http://localhost:8080/api/issaquah_wa/feed/facebook/account/cristiano'
```