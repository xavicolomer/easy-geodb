'use strict'; // eslint-disable-line

const assert = require('chai').assert;
const sinon = require('sinon');
const sinonStubPromise = require('sinon-stub-promise');

const run = require('../src/index.js').run;
const start = require('../src/index.js').start;
const index = require('../src/index.js');
const common = require('../src/common');
const postgresql = require('../src/postgresql');
const dynamodb = require('../src/dynamodb');
const constants = require('../src/common/constants');

sinonStubPromise(sinon);

describe('init', () => {
  it('should throw error if no arguments has been passed.', () => {
    assert.throws(run, Error, constants.ERROR_MISSING_SETTINGS);
  });

  it('should throw error if the settings file path is wrong.', () => {
    assert.throws(() => run({ settings: {} }), Error, constants.ERROR_SETTINGS_PATH_INVALID);
  });

  it('should call start if configuration is valid.', () => {
    const stub = sinon.stub(index, 'start');
    run({ settings: '../../settings.postgresql.json' });
    stub.restore();
    sinon.assert.calledOnce(stub);
  });

  it('should call start if configuration is valid.', () => {
    const stub = sinon.stub(index, 'start');
    run({ settings: '../../settings.dynamodb.json' });
    stub.restore();
    sinon.assert.calledOnce(stub);
  });
});

describe('start', () => {
  it('should call validateSettings', () => {
    const stub = sinon.stub(common, 'validateSettings').returnsPromise();
    start();
    stub.restore();
    sinon.assert.calledOnce(stub);
  });

  it('should call postgresql init if settings are validated.', () => {
    const stub = sinon.stub(common, 'validateSettings').returnsPromise().resolves(true);
    const stub2 = sinon.stub(postgresql, 'init');
    start({ settings: { db: 'postgresql' } });
    stub.restore();
    stub2.restore();
    sinon.assert.calledOnce(stub2);
  });

  it('should call dynamodb init if settings are validated.', () => {
    const stub = sinon.stub(common, 'validateSettings').returnsPromise().resolves(true);
    const stub2 = sinon.stub(dynamodb, 'init');
    start({ settings: { db: 'dynamodb' } });
    stub.restore();
    stub2.restore();
    sinon.assert.calledOnce(stub2);
  });
});
