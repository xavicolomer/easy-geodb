'use strict'; // eslint-disable-line

const pg = require('pg');
const Promise = require('bluebird');
const common = require('../common');
const log = require('../lib/utils').log;
const utils = require('./utils');
const constants = require('../common/constants');

let postgresql;

pg.defaults.poolSize = 25;

const buildConnectionURL = data =>
  `postgres://${data.user}:${data.password}@${data.ip}:${data.port}/${data.database}`;

const createCountrySchema = (params) => {
  const settings = params.settings;
  const url = buildConnectionURL(settings.connection);
  let queryString = '';

  if (settings.schema.country) {
    log('Creating Country Structure...');
    queryString = ` DROP TABLE IF EXISTS ${settings.schema.country.table};
                    CREATE TABLE IF NOT EXISTS ${settings.schema.country.table} (
                      code VARCHAR(2) NOT NULL,
                      name VARCHAR(255) NOT NULL,
                    PRIMARY KEY (code));`;
  }

  return utils.query(Object.assign({}, params, { url, queryString }));
};

const insertCountryQuery = (data, params) => {
  try {
    const code = `'${data[1]}'`;
    const name = `'${data[0].replace(/'/g, '\'\'')}'`;
    const string = `INSERT INTO ${params.settings.schema.country.table} (code, name)
                      VALUES (${code}, ${name});`;
    return string;
  } catch (error) {
    throw Error(constants.ERROR_CANNOT_FORMAT_DATA);
  }
};

const insertCityQuery = (data, params) => {
  try {
    const cityId = data[0];
    const countryCode = `'${data[8].toUpperCase()}'`;
    const name = `'${data[1].replace(/'/g, '\'\'')}'`;
    const asciiName = `'${data[2].replace(/'/g, '\'\'')}'`;
    const population = data[14];
    const latitude = data[4];
    const longitude = data[5];

    const string = `INSERT INTO ${params.settings.schema.city.table} (city_id, country_code, name, ascii_name, population, latitude, longitude)
                VALUES (${cityId}, ${countryCode}, ${name}, ${asciiName}, ${population}, ${latitude}, ${longitude});`;
    return string;
  } catch (error) {
    throw Error(constants.ERROR_CANNOT_FORMAT_DATA);
  }
};

const insertCountries = params =>
  utils.batchQuery(Object.assign({}, params, {
    url: buildConnectionURL(params.settings.connection),
    formatItem: insertCountryQuery,
  }));

const insertCities = params =>
  utils.batchQuery(Object.assign({}, params, {
    url: buildConnectionURL(params.settings.connection),
    formatItem: insertCityQuery,
  }));

const createCitySchema = (params) => {
  const settings = params.settings;
  const url = buildConnectionURL(settings.connection);
  let queryString = '';

  if (settings.schema.city) {
    queryString = `DROP TABLE IF EXISTS ${settings.schema.city.table};
                    CREATE TABLE IF NOT EXISTS ${settings.schema.city.table} (
                      city_id INT NOT NULL,
                      name VARCHAR(255) NOT NULL,
                      ascii_name VARCHAR(255) NULL,
                      population INT NOT NULL DEFAULT 0,
                      latitude FLOAT NOT NULL DEFAULT 0,
                      longitude FLOAT NOT NULL DEFAULT 0,
                      country_code VARCHAR(2) NOT NULL references ${settings.schema.country.table} (code),
                    PRIMARY KEY (city_id));`;
  }

  return utils.query(Object.assign({}, params, { url, queryString }));
};

const setupCities = params =>
  new Promise((fulfill) => {
    common.downloadCitiesFile(params)
      .then(createCitySchema)
      .then(common.parseCities)
      .then(postgresql.insertCities)
      .finally(() => fulfill(params));
  });

const setupCountries = params =>
  new Promise((fulfill) => {
    createCountrySchema(params)
      .then(common.parseCountries)
      .then(postgresql.insertCountries)
      .finally(() => { fulfill(params); });
  });

const validateSettings = params =>
  new Promise((fulfill, reject) => {
    const connection = params.settings.connection;

    if (!connection) {
      reject(new Error(constants.ERROR_NO_CONNECTION_ATTRIBUTE));
    }

    if (!connection.user || connection.user === '') {
      reject(new Error(constants.ERROR_NO_USER_ATTRIBUTE));
    }

    if (!connection.password || connection.password === '') {
      reject(new Error(constants.ERROR_NO_PASSWORD_ATTRIBUTE));
    }

    if (!connection.ip || connection.ip === '') {
      reject(new Error(constants.ERROR_NO_IP_ATTRIBUTE));
    }

    if (!connection.database || connection.database === '') {
      reject(new Error(constants.ERROR_NO_DATABASE_ATTRIBUTE));
    }

    fulfill(params);
  });

const init = (params) => {
  postgresql.validateSettings(params)
    .then(postgresql.setupCountries)
    .then(postgresql.setupCities);
};

postgresql = {
  init,
  validateSettings,
  setupCountries,
  setupCities,
  insertCities,
  insertCountries,
  insertCountryQuery,
  insertCityQuery,
};

module.exports = postgresql;
