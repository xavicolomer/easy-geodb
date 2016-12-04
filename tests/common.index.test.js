'use strict'; // eslint-disable-line

const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonStubPromise = require('sinon-stub-promise');
const common = require('../src/common');
const unzip = require('unzip');
const fs = require('fs');
const ProgressBar = require('ascii-progress');
const constants = require('../src/common/constants');

chai.use(chaiAsPromised);

const expect = chai.expect;
sinonStubPromise(sinon);

let hasBeenExecutedOnce = false;
const fsMock = {
  pipe: () => {},
  on: (type, callback) => {
    switch (type) {
      case 'readable':
        callback();
        return fsMock;
      case 'end':
        callback();
        break;
      default:
        return false;
    }

    return false;
  },
  read: () => {
    if (!hasBeenExecutedOnce) {
      hasBeenExecutedOnce = true;
      return 'some string';
    }

    hasBeenExecutedOnce = false;
    return null;
  },
};

describe('common', () => {
  let stubProgressBar;

  beforeEach(() => {
    stubProgressBar = sinon.stub(ProgressBar.prototype, 'update', () => true);
  });

  afterEach(() => {
    stubProgressBar.restore();
  });

  describe('validateSettings', () => {
    it('should throw error if no settings has been passed.', () => {
      const settings = null;
      return expect(common.validateSettings(settings))
        .to.eventually.be.rejectedWith(constants.ERROR_SETTINGS_INVALID_STRUCTURE);
    });

    it('should throw error if no `db` property has been set.', () => {
      const settings = { settings: {} };
      return expect(common.validateSettings(settings))
        .to.eventually.be.rejectedWith(constants.ERROR_MISSING_ENGINE);
    });

    it('should throw error `db` is not supported.', () => {
      const settings = { settings: { db: 'magicDB' } };
      return expect(common.validateSettings(settings))
        .to.eventually.be.rejectedWith(constants.ERROR_WRONG_ENGINE);
    });

    it('should throw error if no schema has been defined.', () => {
      const settings = { settings: { db: 'dynamodb' } };
      return expect(common.validateSettings(settings))
        .to.eventually.be.rejectedWith(constants.ERROR_NO_SCHEMA_ATTRIBUTE);
    });

    it('should throw error if no schema has been defined.', () => {
      const settings = { settings: { db: 'dynamodb', schema: {} } };
      return expect(common.validateSettings(settings))
        .to.eventually.be.rejectedWith(constants.ERROR_NO_SCHEMA_FOR_COUNTRY);
    });

    it('should throw error if no Counties schema has been defined.', () => {
      const settings = { settings: { db: 'dynamodb', schema: { country: { table: 'country' } } } };
      return expect(common.validateSettings(settings))
        .to.eventually.be.rejectedWith(constants.ERROR_NO_SCHEMA_FOR_CITY);
    });

    it('should throw error if no valid population has been set.', () => {
      const settings = { settings: { db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city' } } } };
      return expect(common.validateSettings(settings))
        .to.eventually.be.rejectedWith(constants.ERROR_WRONG_POPULATION);
    });

    it('should throw error if no valid population has been set.', () => {
      const population = 2000;
      const settings = { settings: { db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };
      return expect(common.validateSettings(settings))
        .to.eventually.be.rejectedWith(constants.ERROR_WRONG_POPULATION);
    });

    it('should resolve if settings are set correctly set.', () => {
      const population = 1500;
      const settings = { settings: { db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };
      return expect(common.validateSettings(settings)).to.eventually.be.fulfilled;
    });
  });

  describe('downloadCitiesFile', () => {
    let stub;
    let stub2;

    beforeEach(() => {
      const unzipMock = {
        on: (type, callback) => {
          switch (type) {
            case 'close':
              callback();
              break;
            default:
              return false;
          }

          return false;
        },
      };

      stub = sinon.stub(unzip, 'Extract', () => unzipMock);
      stub2 = sinon.stub(fs, 'createReadStream', () => fsMock);
    });

    it('should download the file from the settings configuration.', () => {
      const population = 1500;
      const settings = { settings: { db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };
      const promise = common.downloadCitiesFile(settings);
      return expect(promise).to.eventually.be.fulfilled;
    });

    afterEach(() => {
      stub.restore();
      stub2.restore();
    });
  });

  describe('parsers', () => {
    const population = 1500;
    let params;

    let stubRead;
    let stubExists;
    let stubTruncate;
    let stubWrite;
    let stubUnlink;

    beforeEach(() => {
      params = { settings: { db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };
      stubRead = sinon.stub(fs, 'createReadStream', () => fsMock);
      stubTruncate = sinon.stub(fs, 'truncate', () => true);
      stubWrite = sinon.stub(fs, 'writeFile', () => true);
      stubUnlink = sinon.stub(fs, 'unlink', () => true);
    });

    afterEach(() => {
      stubRead.restore();
      stubExists.restore();
      stubTruncate.restore();
      stubWrite.restore();
      stubUnlink.restore();
    });

    describe('parseCities', () => {
      it('should be fulfilled even without error filename.', () => {
        const promise = common.parseCities(params);
        stubExists = sinon.stub(fs, 'exists', () => true);
        return expect(promise).to.eventually.be.fulfilled;
      });

      it('should be fulfilled even when passing filename and file exists.', () => {
        stubExists = sinon.stub(fs, 'exists', () => true);
        params.settings.errorFileName = './error.txt';
        const promise = common.parseCities(params);
        return expect(promise).to.eventually.be.fulfilled;
      });

      it('should be fulfilled even when passing filename and file does not exists.', () => {
        stubExists = sinon.stub(fs, 'exists', () => false);
        params.settings.errorFileName = './error.txt';
        const promise = common.parseCities(params);
        return expect(promise).to.eventually.be.fulfilled;
      });
    });

    describe('parseCountries', () => {
      it('should be fulfilled even without error filename.', () => {
        const promise = common.parseCountries(params);
        stubExists = sinon.stub(fs, 'exists', () => true);
        return expect(promise).to.eventually.be.fulfilled;
      });

      it('should be fulfilled even when passing filename and file exists.', () => {
        stubExists = sinon.stub(fs, 'exists', () => true);
        params.settings.errorFileName = './error.txt';
        const promise = common.parseCountries(params);
        return expect(promise).to.eventually.be.fulfilled;
      });

      it('should be fulfilled even when passing filename and file does not exists.', () => {
        stubExists = sinon.stub(fs, 'exists', () => false);
        params.settings.errorFileName = './error.txt';
        const promise = common.parseCountries(params);
        return expect(promise).to.eventually.be.fulfilled;
      });
    });
  });
});
