# Easy GeoDB #1.0.0

Easy Geo DB is a script that helps you creating City and Country tables.
**All the the cities and countries are provided by the script itself.**

### important
The script will delete previous tables (only Country and City) in the target database if they exists

The script supports 2 databases:
- PotsgreSQL
- PotsgreSQL-PostGIS **(Not Yet)**
- DynamoDB (You'll need to have [AWS CLI](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-set-up.html)   installed)
- MySQL **(Not Yet)**

## Code Example
The script provides file examples for PostgreSQL and DynamoDB. You only have to execute them using the following command.

```javascript
node . --settings ../settings.dynamodb.json
```

## Configuration file example


```json
{
    "db": "dynamodb",
    "connection": {},
    "schema": {
        "country": {
            "table": "Countries"
        },
        "city": {
            "table": "Cities",
            "population": 5000
        }
    },
    "errorFileName": "errors.txt"
}
```

| Attribute | Required | Values | Description |
| ------ | -- | ----------- | ----------- |
| db   | yes | dynamodb or postgresql | Specify the target Database |
| connection | yes| (below) | Specificies basic configuration for the target database |
| schema    | yes | (below) | You can costumize the names of the table (plural, singular, etc...) |
| optional   | no | './path/to/errorFile.txt' | If for some reasont he script stops, all errors will be stored on this file |

Example **dynamodb** configuration connection attribute:

```json
"connection": {
    "region": "eu-west-1",
    "endpoint": "https://dynamodb.eu-west-1.amazonaws.com"
},
```

Example **postgresql** configuration connection attribute:

```json
"connection": {
    "user": "Creator4983",
    "password": "********************",
    "port": 5432,
    "ip": "00.00.00.00",
    "database": "database_name"
},
```

Example **schema** configuration connection attribute:

```json
"schema": {
    "country": {
        "table": "Countries"
    },
    "city": {
        "table": "Cities",
        "population": 5000 //1000 | 1500 | 5000
    }
},
```

- **table** indicates the name of the table you want to create. For example: City, city, cities, My_Cities, ProjectCities, etc...
- **population** indicates to download a database of cities with a minimum population of 1000, 1500 or 5000. No other options are available.

## Installation
- Clone this project
- npm install
- Run the script

```javascript
npm run test:single
```
### Version
1.0.0

### Mentions
The city information the table will be filled with is provided thanks to [GeoNames](http://download.geonames.org/)

### Contact Info
* [twitter](https://twitter.com/xaviercolomer)
* [linkedin](https://es.linkedin.com/in/xaviercolomer)
* [website](http://xavicolomer.com)
