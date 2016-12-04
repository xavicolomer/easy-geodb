'use strict'; // eslint-disable-line

const Promise = require('bluebird');
const pg = require('pg');
const ProgressBar = require('ascii-progress');
const log = require('../lib/utils').log;
const constants = require('../common/constants');

pg.defaults.poolSize = 25;

const query = params =>
  new Promise((fulfill, reject) => {
    const client = new pg.Client(params.url);
    client.connect();

    client.query(params.queryString, () => {
      client.end((onEndError) => {
        if (onEndError) {
          reject(onEndError);
        } else {
          fulfill(params);
        }
      });
    });
  });

const batchQuery = params =>
  new Promise((fulfill, reject) => {
    let batch = 100;
    const items = params.items;
    let index = 0;

    if (!params.formatItem) {
      reject(new Error(constants.ERROR_NO_FORMAT_ATTRIBUTE));
    }

    if (!params.items) {
      reject(new Error(constants.ERROR_ITEMS_LIST_EMPTY));
    }

    const bar = new ProgressBar({
      schema: constants.BAR_FORMAT,
      total: items.length,
      current: 0,
    });

    if (items.length < batch) {
      batch = items.length;
    }

    log(`Inserting ${items.length} items...`);
    const next = () => {
      let queryString = '';

      for (let i = 0; i < batch; i++) {
        if (index >= items.length - 1) {
          break;
        }

        const data = items[index];
        queryString += params.formatItem(data, params);
        index += 1;
      }

      query(Object.assign({}, params, { queryString }))
        .finally(() => {
          if (index >= items.length - 1) {
            bar.update(1);
            fulfill(params);
          } else {
            const currentValue = (index - batch);
            bar.update(currentValue / items.length);
            next();
          }
        });
    };

    next();
  });

module.exports = {
  query,
  batchQuery,
};
