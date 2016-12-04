'use strict'; // eslint-disable-line

const chai = require('chai');
const ProgressBar = require('ascii-progress');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const AWSMock = require('aws-sdk-mock');
const utils = require('../src/dynamodb/utils');
const assert = require('chai').assert;
const constants = require('../src/common/constants');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('dynamodb', () => {
  let stubProgressBar;
  const population = 1500;
  let params;

  beforeEach(() => {
    params = { settings: { db: 'dynamodb', schema: { country: { table: 'country' }, city: { table: 'city', population } } } };
    stubProgressBar = sinon.stub(ProgressBar.prototype, 'update', () => true);
  });

  afterEach(() => {
    stubProgressBar.restore();
  });

  describe('utils', () => {
    let stubGetAWSInstance;

    const mockAWS = {
      createTable: (options, callback) => {
        callback();
      },
      deleteTable: (options, callback) => {
        callback();
      },
    };

    describe('deleteTable', () => {
      let attempts = 0;

      beforeEach(() => {
        this.clock = sinon.useFakeTimers();
        params.settings.connection = { region: 'eu-west-1', endpoint: 'https://dynamodb.eu-west-1.amazonaws.com' };
        stubGetAWSInstance = sinon.stub(utils, 'getAWSInstance', () => mockAWS);
      });

      it('should be fulfilled if tableName is set.', () => {
        const promise = utils.deleteTable(Object.assign({}, params, { tableName: 'SomeName' }));
        return expect(promise).to.eventually.fulfilled;
      });

      it('should be reattempt if resource is in use.', () => {
        mockAWS.deleteTable = (options, callback) => {
          let error = { code: 'ResourceInUseException' };

          if (attempts < 2) {
            attempts += 1;
            error = null;
          }

          callback(error);
          this.clock.tick(5000);
        };

        const promise = utils.deleteTable(Object.assign({}, params, { tableName: 'SomeName' }));
        return expect(promise).to.eventually.fulfilled;
      });

      it('should be reattempt a maximum of 5 times and reject error.', () => {
        mockAWS.deleteTable = (options, callback) => {
          const error = { code: 'ResourceInUseException' };
          callback(error);
          this.clock.tick(5001);
        };
        const promise = utils.deleteTable(Object.assign({}, params, { tableName: 'SomeName' }));
        return expect(promise).to.eventually.be.rejectedWith(constants.ERROR_TOO_MUCH_ATTEMPTS);
      });

      it('should be fulfill if resource doesnt exist.', () => {
        mockAWS.deleteTable = (options, callback) => {
          const error = { code: 'ResourceNotFoundException' };
          callback(error);
        };
        const promise = utils.deleteTable(Object.assign({}, params, { tableName: 'SomeName' }));
        return expect(promise).to.eventually.fulfilled;
      });

      it('should be rejected if unexpected error.', () => {
        mockAWS.deleteTable = (options, callback) => {
          const error = { code: 'Unexpected Error' };
          callback(error);
        };
        const promise = utils.deleteTable(Object.assign({}, params, { tableName: 'SomeName' }));
        return expect(promise).to.eventually.rejected;
      });

      afterEach(() => {
        this.clock.restore();
        stubGetAWSInstance.restore();
      });
    });

    describe('createTable', () => {
      let stubDeleteTable;
      let alreadyCalled = false;

      beforeEach(() => {
        params.settings.connection = { region: 'eu-west-1', endpoint: 'https://dynamodb.eu-west-1.amazonaws.com' };
        stubGetAWSInstance = sinon.stub(utils, 'getAWSInstance', () => mockAWS);

        const promise = sinon.stub().returnsPromise().resolves(params);
        stubDeleteTable = sinon.stub(utils, 'deleteTable', () => promise());
      });

      it('should be fulfilled if tableName is set.', () => {
        const promise = utils.createTable(Object.assign({}, params, { tableName: 'SomeName' }));
        return expect(promise).to.eventually.fulfilled;
      });

      it('should call deleteTable the table if already exists.', () => {
        mockAWS.createTable = (options, callback) => {
          let error;
          if (!alreadyCalled) {
            alreadyCalled = true;
            error = { code: 'ResourceInUseException' };
          }
          callback(error);
        };
        const promise = utils.createTable(Object.assign({}, params, { tableName: 'SomeName' }));
        return expect(promise).to.eventually.fulfilled;
      });

      it('should reject if a unexpected error.', () => {
        mockAWS.createTable = (options, callback) => {
          const error = { code: 'Unexpected Error' };
          callback(error);
        };
        const promise = utils.createTable(Object.assign({}, params, { tableName: 'SomeName' }));
        return expect(promise).to.eventually.be.rejected;
      });

      afterEach(() => {
        stubDeleteTable.restore();
        stubGetAWSInstance.restore();
      });
    });

    describe('insertBatch', () => {
      let stubDeleteTable;
      const items = [1, 2, 3, 4, 5];
      const formatItem = () => {};

      beforeEach(() => {
        this.clock = sinon.useFakeTimers();

        params.settings.connection = { region: 'eu-west-1', endpoint: 'https://dynamodb.eu-west-1.amazonaws.com' };
        stubGetAWSInstance = sinon.stub(utils, 'getAWSInstance', () => mockAWS);

        const promise = sinon.stub().returnsPromise().resolves(params);
        stubDeleteTable = sinon.stub(utils, 'deleteTable', () => promise());
      });

      it('should be rejected if no items attribute has been set.', () => {
        const promise = utils.insertBatch(Object.assign({}, params, { tableName: 'SomeName' }));
        return expect(promise).to.eventually.rejectedWith('The list of items is empty.');
      });

      it('should be rejected if no createItem attribute has been set.', () => {
        const promise = utils.insertBatch(Object.assign({}, params, { tableName: 'SomeName', items }));
        return expect(promise).to.eventually.rejectedWith(constants.ERROR_NO_FORMAT_ATTRIBUTE);
      });

      it('should be fulfilled if num of items are smaller than batch.', () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'batchWrite', (options, callback) => {
          callback();
        });

        const promise = utils.insertBatch(Object.assign({}, params, { tableName: 'SomeName', items, formatItem }));
        this.clock.tick(15001);
        AWSMock.restore('DynamoDB.DocumentClient');
        return expect(promise).to.eventually.fulfilled;
      });

      it('should be fulfilled if num of items are bigger than batch.', () => {
        const largeCollection = [];
        for (let i = 0; i < 30; ++i) {
          largeCollection.push(i);
        }
        AWSMock.mock('DynamoDB.DocumentClient', 'batchWrite', (options, callback) => {
          callback();
          this.clock.tick(15001);
        });
        const promise = utils.insertBatch(Object.assign({}, params, { tableName: 'SomeName', items: largeCollection, formatItem }));
        this.clock.tick(15001);
        AWSMock.restore('DynamoDB.DocumentClient');
        return expect(promise).to.eventually.fulfilled;
      });

      it('should be rejected if unexpected error.', () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'batchWrite', (options, callback) => {
          callback(new Error('Unexpected Error'));
        });
        const promise = utils.insertBatch(Object.assign({}, params, { tableName: 'SomeName', items, formatItem }));
        this.clock.tick(15001);
        AWSMock.restore('DynamoDB.DocumentClient');
        return expect(promise).to.eventually.rejectedWith('Unexpected Error');
      });

      afterEach(() => {
        this.clock.restore();
        stubDeleteTable.restore();
        stubGetAWSInstance.restore();
      });
    });

    describe('getAWSInstance', () => {
      it('should throw error if no connection attribute is set.', () => {
        assert.throws(() => utils.getAWSInstance(params), Error);
      });

      it('should be fulfilled if tableName is set.', () => {
        params.settings.connection = { region: 'eu-west-1', endpoint: 'https://dynamodb.eu-west-1.amazonaws.com' };
        return expect(utils.getAWSInstance(params)).not.to.be.null;
      });
    });
  });
});
