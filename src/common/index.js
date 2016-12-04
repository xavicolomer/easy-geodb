'use strict'; // eslint-disable-line

const utils = require('../lib/utils');
const Promise = require('bluebird');
const unzip = require('unzip');
const fs = require('fs');
const constants = require('./constants');

const COUNTRIES_PATH = './data/countries.csv';
const GEONAMES_PATH = 'http://download.geonames.org/export/dump/';

const validateSettings = params =>
  new Promise((fulfill, reject) => {
    if (!params || typeof params.settings === 'undefined') {
      reject(new Error(constants.ERROR_SETTINGS_INVALID_STRUCTURE));
    } else {
      const db = params.settings.db;

      if (typeof db === 'undefined') {
        reject(new Error(constants.ERROR_MISSING_ENGINE));
      }
      if (db !== 'dynamodb' && db !== 'postgresql') {
        reject(new Error(constants.ERROR_WRONG_ENGINE));
      }
    }

    const schema = params.settings.schema;

    if (typeof schema === 'undefined') {
      reject(new Error(constants.ERROR_NO_SCHEMA_ATTRIBUTE));
    }

    const countrySchema = schema.country;

    if (!countrySchema || !countrySchema.table) {
      reject(new Error(constants.ERROR_NO_SCHEMA_FOR_COUNTRY));
    }

    const citySchema = schema.city;

    if (!citySchema || !citySchema.table) {
      reject(new Error(constants.ERROR_NO_SCHEMA_FOR_CITY));
    }

    if (citySchema.population !== 1000 &&
        citySchema.population !== 1500 &&
        citySchema.population !== 5000) {
      reject(new Error(constants.ERROR_WRONG_POPULATION));
    }

    fulfill(params);
  });

const downloadCitiesFile = params =>
  new Promise((fulfill) => {
    utils.log('Downloading Cities...');
    const settings = params.settings;
    const fileName = `cities${settings.schema.city.population}.zip`;
    const filePath = `./${fileName}`;
    const extractor = unzip.Extract({ path: '.' });

    utils.download(GEONAMES_PATH + fileName, filePath, () => {
      extractor.on('close', () => {
        fs.unlink(filePath);
        fulfill(params);
      });
      fs.createReadStream(filePath).pipe(extractor);
    });
  });

const parseCities = params =>
  new Promise((fulfill) => {
    utils.log('Parsing cities...');
    const settings = params.settings;
    const stream = fs.createReadStream(`./cities${settings.schema.city.population}.txt`);
    const cities = [];
    let citiesString = '';
    let data = {};

    stream
      .on('readable', () => {
        while ((data = stream.read()) !== null) {
          citiesString += data.toString();
        }
      })
      .on('end', () => {
        if (settings.errorFileName) {
          if (fs.exists(settings.errorFileName)) {
            fs.truncate(settings.errorFileName, 0);
          } else {
            fs.writeFile(settings.errorFileName, '');
          }
        }

        const batch = citiesString.split('\n');
        for (let i = 0, len = batch.length; i < len; ++i) {
          cities.push(batch[i].split('\t'));
        }
        fs.unlink(`./cities${settings.schema.city.population}.txt`);
        fulfill(Object.assign({}, params, { items: cities }));
      });
  });

const parseCountries = params =>
  new Promise((fulfill) => {
    utils.log('Parsing countries...');
    const settings = params.settings;
    const stream = fs.createReadStream(COUNTRIES_PATH);

    stream
      .on('readable', () => {
        const countries = [];
        let data = {};

        while ((data = stream.read()) !== null) {
          const batch = data.toString().split('\n');
          for (let i = 0, len = batch.length; i < len; ++i) {
            countries.push(batch[i].split(','));
          }
        }
        fulfill(Object.assign({}, params, { items: countries }));
      })
      .on('end', () => {
        if (settings.errorFileName) {
          if (fs.exists(settings.errorFileName)) {
            fs.truncate(settings.errorFileName, 0);
          } else {
            fs.writeFile(settings.errorFileName, '');
          }
        }
      });
  });

module.exports = {
  validateSettings,
  downloadCitiesFile,
  parseCountries,
  parseCities,
};

