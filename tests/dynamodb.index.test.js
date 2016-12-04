'use strict'; // eslint-disable-line

const AWS = require('aws-sdk');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonStubPromise = require('sinon-stub-promise');

chai.use(chaiAsPromised);
const expect = chai.expect;

sinonStubPromise(sinon);

const dynamodb = require('../src/dynamodb');
const utils = require('../src/dynamodb/utils');
const constants = require('../src/common/constants');

describe('dynamodb', () => {
  const population = 1500;
  let params;

  beforeEach(() => {
    params = { settings: { db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };
  });

  describe('validateSettings', () => {
    it('should be rejected if no connection attribute has been set.', () => {
      const promise = dynamodb.validateSettings(params);
      return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_NO_CONNECTION_ATTRIBUTE);
    });

    it('should be rejected if no region attribute has been set on the connection.', () => {
      const connection = { region: 'ur-region-n' };
      params.settings.connection = connection;
      const promise = dynamodb.validateSettings(params);
      return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_NO_REGION_OR_ENDPOINT);
    });

    it('should be rejected if no region attribute has been set on the connection.', () => {
      const connection = { region: 'ur-region-n', endpoint: 'https://dynamodb.eu-west-1.amazonaws.com' };
      params.settings.connection = connection;
      const promise = dynamodb.validateSettings(params);
      return expect(promise).to.eventually.be.fulfilled;
    });
  });

  describe('creators', () => {
    let stubCreateTable;

    beforeEach(() => {
      params.settings.connection = { region: 'eu-west-1', endpoint: 'https://dynamodb.eu-west-1.amazonaws.com' };

      const promise = sinon.stub().returnsPromise().resolves(true);
      stubCreateTable = sinon.stub(utils, 'createTable', () => promise());
    });

    afterEach(() => {
      stubCreateTable.restore();
    });

    describe('createCountriesTable', () => {
      it('should be rejected if no connection attribute has been set.', () => {
        dynamodb.createCountriesTable(params);
        sinon.assert.calledOnce(stubCreateTable);
      });
    });

    describe('createCitiesTable', () => {
      it('should call the createTable function.', () => {
        dynamodb.createCitiesTable(params);
        sinon.assert.calledOnce(stubCreateTable);
      });
    });
  });

  describe('inserts', () => {
    let stubInsertBatch;

    beforeEach(() => {
      params.settings.connection = { region: 'eu-west-1', endpoint: 'https://dynamodb.eu-west-1.amazonaws.com' };
      AWS.config.update(params.settings.connection);

      const promise = sinon.stub().returnsPromise().resolves(true);
      stubInsertBatch = sinon.stub(utils, 'insertBatch', () => promise());
    });

    afterEach(() => {
      stubInsertBatch.restore();
    });

    describe('insertCities', () => {
      it('should call the insertBatch function.', () => {
        dynamodb.insertCities(params);
        sinon.assert.calledOnce(stubInsertBatch);
      });
    });

    describe('insertCountries', () => {
      it('should call the insertBatch function.', () => {
        dynamodb.insertCountries(params);
        sinon.assert.calledOnce(stubInsertBatch);
      });
    });
  });

  describe('createCountryItem', () => {
    it('should create a Country params object correctly.', () => {
      const countryCode = '00';
      const name = 'ABCDEFG';

      const data = [countryCode, name];

      const expected = {
        PutRequest: {
          Item: {
            Name: name,
            CountryCode: countryCode.toUpperCase(),
          },
        },
      };

      const result = dynamodb.createCountryItem(data);
      return expect(result).to.deep.equal(expected);
    });
  });

  describe('createCityItem', () => {
    it('should create a City params object correctly.', () => {
      const cityId = '0000';
      const countryCode = '00';
      const name = 'name';
      const asciiName = 'asciiName';
      const latitude = 0;
      const longitude = 0;

      const data = [cityId, name, asciiName, 0, latitude, longitude, 0, 0,
        countryCode, 0, 0, 0, 0, 0, population];

      const expected = {
        PutRequest: {
          Item: {
            CountryCode: countryCode.toUpperCase(),
            NameId: `${cityId}_${name}`,
            CityId: cityId,
            Name: name,
            AsciiName: asciiName,
            Population: population,
            Latitude: latitude,
            Longitude: longitude,
          },
        },
      };

      const result = dynamodb.createCityItem(data);
      return expect(result).to.deep.equal(expected);
    });
  });
});
