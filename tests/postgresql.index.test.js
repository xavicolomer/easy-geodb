'use strict'; // eslint-disable-line

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonStubPromise = require('sinon-stub-promise');

const postgresql = require('../src/postgresql');
const utils = require('../src/postgresql/utils');
const common = require('../src/common');
const constants = require('../src/common/constants');

const expect = chai.expect;
const assert = chai.assert;

chai.use(chaiAsPromised);
sinonStubPromise(sinon);

describe('postgresql', () => {
  const population = 1500;
  let params;

  beforeEach(() => {
    params = { settings: { db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };
  });

  describe('validateSettings', () => {
    it('should be rejected if no connection attribute has been set.', () => {
      const promise = postgresql.validateSettings(params);
      return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_NO_CONNECTION_ATTRIBUTE);
    });

    it('should be rejected if no user attribute has been set on the connection.', () => {
      const connection = { password: 'password', ip: 'ip', database: 'database' };
      params.settings.connection = connection;
      const promise = postgresql.validateSettings(params);
      return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_NO_USER_ATTRIBUTE);
    });

    it('should be rejected if no password attribute has been set on the connection.', () => {
      const connection = { user: 'user', ip: 'ip', database: 'database' };
      params.settings.connection = connection;
      const promise = postgresql.validateSettings(params);
      return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_NO_PASSWORD_ATTRIBUTE);
    });

    it('should be rejected if no ip attribute has been set on the connection.', () => {
      const connection = { user: 'user', password: 'password', database: 'database' };
      params.settings.connection = connection;
      const promise = postgresql.validateSettings(params);
      return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_NO_IP_ATTRIBUTE);
    });

    it('should be rejected if no database attribute has been set on the connection.', () => {
      const connection = { user: 'user', password: 'password', ip: 'ip' };
      params.settings.connection = connection;
      const promise = postgresql.validateSettings(params);
      return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_NO_DATABASE_ATTRIBUTE);
    });

    it('should fulfill the promise if all the connection fields are set properly.', () => {
      const connection = { user: 'user', password: 'password', ip: 'ip', database: 'database' };
      params.settings.connection = connection;
      const promise = postgresql.validateSettings(params);
      return expect(promise).to.eventually.be.fulfilled;
    });
  });

  describe('setupCountries', () => {
    let stubParseCountries;
    let stubQuery;
    let stubBatchQuery;

    beforeEach(() => {
      const connection = { user: 'user', password: 'password', ip: 'ip', database: 'database' };
      params = { settings: { connection, db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };

      const promise = sinon.stub().returnsPromise().resolves(params);
      stubParseCountries = sinon.stub(common, 'parseCountries', () => promise());
      stubQuery = sinon.stub(utils, 'query', () => promise());
      stubBatchQuery = sinon.stub(utils, 'batchQuery', () => promise());
    });

    it('should be resolved if correct params are set.', () => {
      const promise = postgresql.setupCountries(params);
      return expect(promise).to.eventually.be.fulfilled;
    });

    afterEach(() => {
      stubParseCountries.restore();
      stubQuery.restore();
      stubBatchQuery.restore();
    });
  });

  describe('setupCities', () => {
    let stubParseCities;
    let stubQuery;
    let stubBatchQuery;
    let stubDownloadFile;

    beforeEach(() => {
      const connection = { user: 'user', password: 'password', ip: 'ip', database: 'database' };
      params = { settings: { connection, db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };

      const promise = sinon.stub().returnsPromise().resolves(params);
      stubParseCities = sinon.stub(common, 'parseCities', () => promise());
      stubQuery = sinon.stub(utils, 'query', () => promise());
      stubBatchQuery = sinon.stub(utils, 'batchQuery', () => promise());
      stubDownloadFile = sinon.stub(common, 'downloadCitiesFile', () => promise());
    });

    it('should be resolved if correct params are set.', () => {
      const promise = postgresql.setupCities(params);
      return expect(promise).to.eventually.be.fulfilled;
    });

    afterEach(() => {
      stubParseCities.restore();
      stubQuery.restore();
      stubBatchQuery.restore();
      stubDownloadFile.restore();
    });
  });

  describe('insertCountryQuery', () => {
    it('should throw error if Country data is invalid.', () => {
      assert.throws(() =>
        postgresql.insertCountryQuery(), Error, constants.ERROR_CANNOT_FORMAT_DATA);
    });

    it('should return string if Country data is valid.', () => {
      expect(postgresql.insertCountryQuery(['00', 'Some Country'], params)).to.be.a('string');
    });

    it('should return a correctly formatted insert query.', () => {
      const cityId = '0000';
      const countryCode = '00';
      const data = [cityId, countryCode];
      expect(postgresql.insertCountryQuery(data, params)).to.be.equal(`INSERT INTO country (code, name)
                      VALUES ('${countryCode}', '${cityId}');`);
    });
  });

  describe('insertCityQuery', () => {
    const cityId = '0000';
    const countryCode = '00';
    const name = 'name';
    const asciiName = 'asciiName';
    const latitude = 0;
    const longitude = 0;

    const data = [cityId, name, asciiName, 0, latitude, longitude, 0, 0,
      countryCode, 0, 0, 0, 0, 0, population];

    it('should throw error if City data is invalid.', () => {
      assert.throws(() => postgresql.insertCityQuery(), Error, constants.ERROR_CANNOT_FORMAT_DATA);
    });

    it('should return string if Country data is valid.', () => {
      expect(postgresql.insertCityQuery(data, params)).to.be.a('string');
    });

    it('should return a correctly formatted insert query.', () => {
      expect(postgresql.insertCityQuery(data, params)).to.be.equal(`INSERT INTO city (city_id, country_code, name, ascii_name, population, latitude, longitude)
                VALUES (0000, '${countryCode}', '${name}', '${asciiName}', ${population}, ${latitude}, ${longitude});`);
    });
  });

  afterEach(() => {
  });
});
