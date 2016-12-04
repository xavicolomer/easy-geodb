'use strict'; // eslint-disable-line

const common = require('../common');
const utils = require('./utils');
const constants = require('../common/constants');

let dynamodb;

const createCitiesTable = (params) => {
  const ddbParams = JSON.parse(`{
    "AttributeDefinitions": [
      {
          "AttributeName": "CountryCode",
          "AttributeType": "S"
      },
      {
          "AttributeName": "NameId",
          "AttributeType": "S"
      }
    ],
    "KeySchema": [
      {
          "KeyType": "HASH",
          "AttributeName": "CountryCode"
      },
      {
          "KeyType": "RANGE",
          "AttributeName": "NameId"
      }
    ],
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "TableName": "${params.settings.schema.city.table}"
  }`);

  return utils.createTable(Object.assign({}, params, {
    tableName: params.settings.schema.city.table,
    ddbParams,
  }));
};

const createCountriesTable = (params) => {
  const ddbParams = JSON.parse(`{
    "AttributeDefinitions": [
      {
          "AttributeName": "CountryCode",
          "AttributeType": "S"
      },
      {
          "AttributeName": "Name",
          "AttributeType": "S"
      }
    ],
    "KeySchema": [
      {
          "KeyType": "HASH",
          "AttributeName": "CountryCode"
      },
      {
          "KeyType": "RANGE",
          "AttributeName": "Name"
      }
    ],
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "TableName": "${params.settings.schema.country.table}"
  }`);

  return utils.createTable(Object.assign({}, params,
    {
      tableName: params.settings.schema.country.table,
      ddbParams,
    }));
};

const createCityItem = (data) => {
  const request = {
    PutRequest: {
      Item: {
        CountryCode: data[8].toUpperCase(),
        NameId: `${data[0].toString()}_${data[1]}`,
        CityId: data[0].toString(),
        Name: data[1],
        AsciiName: (data[2] ? data[2] : ''),
        Population: data[14] || 0,
        Latitude: data[4],
        Longitude: data[5],
      },
    },
  };

  return request;
};

const insertCities = params =>
  utils.insertBatch(Object.assign({}, params, { formatItem: createCityItem }));

const createCountryItem = (data) => {
  const request = {
    PutRequest: {
      Item: {
        Name: data[1],
        CountryCode: data[0].toUpperCase(),
      },
    },
  };

  return request;
};

const insertCountries = params =>
  utils.insertBatch(Object.assign({}, params, { formatItem: createCountryItem }));


const validateSettings = params =>
  new Promise((fulfill, reject) => {
    const connection = params.settings.connection;

    if (!connection) {
      reject(new Error(constants.ERROR_NO_CONNECTION_ATTRIBUTE));
    }

    if (!connection.region || !connection.endpoint) {
      reject(new Error(constants.ERROR_NO_REGION_OR_ENDPOINT));
    }

    fulfill(params);
  });

function init(params) {
  dynamodb.validateSettings(params)
    .then(createCountriesTable)
    .then(common.parseCountries)
    .then(insertCountries)
    .then(common.downloadCitiesFile)
    .then(createCitiesTable)
    .then(common.parseCities)
    .then(insertCities);
}

dynamodb = {
  init,
  validateSettings,
  createCountriesTable,
  createCitiesTable,
  insertCities,
  insertCountries,
  createCityItem,
  createCountryItem,
};

module.exports = dynamodb;
