curl -u proudCity -X GET -H "Content-Type: application/json" 'http://feeds.proudcity.com:8084/user/Huntsville,_Alabama/aggregate'

curl -u proudCity -X POST -H "Content-Type: application/json" -d 'http://localhost:8084/user/aggregate' '{
    "type": "city",
    "name": "San_Ramon,_California",
    "agencies": [
        {
            "name": "local",
            "instagram": {
                "frequency": 900,
                "feeds": [
                    {
                        "type": "account",
                        "query": "nycgov"
                    }
                ]
            }
        }
    ]
}' 

curl -u proudCity -X GET -H "Content-Type: application/json" 'http://localhost:8084/user/San_Ramon,_California/aggregate'


curl -u proudCity -X POST -H "Content-Type: application/json" -d '{
    "name": "West_Carrollton,_Ohio"
}' 'http://feeds.proudcity.com:8084/user/delete'

curl -u proudCity -X POST -H "Content-Type: application/json" -d '{
    "name": "newyork_ny"
}' 'http://feeds.proudcity.com:8084/user/delete'