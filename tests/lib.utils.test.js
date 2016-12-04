'use strict'; // eslint-disable-line

const sinon = require('sinon');
const sinonStubPromise = require('sinon-stub-promise');
const request = require('request');
const ProgressBar = require('ascii-progress');

const GEONAMES_PATH = 'http://download.geonames.org/export/dump/cities5000.zip';

sinonStubPromise(sinon);

const utils = require('../src/lib/utils');

describe('download', () => {
  let stubProgressBar;

  beforeEach(() => {
    stubProgressBar = sinon.stub(ProgressBar.prototype, 'update', () => true);
  });

  afterEach(() => {
    stubProgressBar.restore();
  });

  it('should call request get method.', () => {
    const mockRequest = {
      pipe: () => {},
      on: (type, callback) => {
        switch (type) {
          case 'response':
            callback({ headers: {} });
            break;

          case 'data':
          case 'end':
            callback([]);
            break;

          default:
            return false;
        }

        return false;
      },
    };
    const stub = sinon.stub(request, 'get', () => mockRequest);
    utils.download(GEONAMES_PATH, '.', () => false);
    stub.restore();
  });
});
