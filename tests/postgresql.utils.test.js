'use strict'; // eslint-disable-line

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonStubPromise = require('sinon-stub-promise');
const pg = require('pg');
const ProgressBar = require('ascii-progress');
const constants = require('../src/common/constants');

chai.use(chaiAsPromised);
const expect = chai.expect;

sinonStubPromise(sinon);

const utils = require('../src/postgresql/utils');

const pgMock = {
  connect: () => {
  },
  query: (query, callback) => {
    callback();
  },
  end: (callback) => {
    callback();
  },
};

describe('postgresql', () => {
  describe('utils', () => {
    const population = 1500;
    let stubProgressBar;
    let params;
    let stubPg;

    beforeEach(() => {
      params = { settings: { db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };
      stubPg = sinon.stub(pg, 'Client', () => pgMock);
      stubProgressBar = sinon.stub(ProgressBar.prototype, 'update', () => true);
    });

    afterEach(() => {
      stubProgressBar.restore();
    });

    describe('query', () => {
      it('should fulfill the remote query database when having the correct settings.', () => {
        const promise = utils.query(params);
        return expect(promise).to.eventually.be.fulfilled;
      });

      it('should reject the remote database if no query string has been set.', () => {
        pgMock.end = (callback) => {
          callback(true);
        };
        return expect(utils.query(params)).to.eventually.be.rejected;
      });
    });

    describe('batchQuery', () => {
      const formatItem = () => 'SQL Query';

      it('should reject if no query formatter has been set.', () => {
        const promise = utils.batchQuery(params);
        return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_NO_FORMAT_ATTRIBUTE);
      });

      it('should be rejected if no items in the list.', () => {
        const promise = utils.batchQuery(Object.assign({}, params, { formatItem }));
        return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_ITEMS_LIST_EMPTY);
      });

      it('should fulfill if query formatter and a collection smaller than the batch has been set.', () => {
        const extend = { formatItem, items: [1, 2, 3] };
        const promise = utils.batchQuery(Object.assign({}, params, extend));
        return expect(promise).to.eventually.be.fulfilled;
      });

      it('should fulfill if query formatter and a collection bigger than the batch has been set.', () => {
        const items = [];
        for (let i = 0; i < 140; ++i) {
          items.push(i);
        }
        const promise = utils.batchQuery(Object.assign({}, params, { formatItem, items }));
        return expect(promise).to.eventually.be.fulfilled;
      });
    });

    afterEach(() => {
      stubPg.restore();

      pgMock.end = (callback) => {
        callback();
      };
    });
  });
});
