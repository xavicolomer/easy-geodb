'use strict'; // eslint-disable-line

const Promise = require('bluebird');
const AWS = require('aws-sdk');
const ProgressBar = require('ascii-progress');
const log = require('../lib/utils').log;
const constants = require('../common/constants');

const maxAttempts = 5;
const throttleMs = 5000;

let deleteAttempts = 0;

let utils = {};

const getAWSInstance = (params) => {
  AWS.config.update(params.settings.connection);
  return new AWS.DynamoDB();
};

const deleteTable = params =>
  new Promise((fulfill, reject) => {
    const dynamodb = utils.getAWSInstance(params);

    const schema = {
      TableName: params.tableName,
    };

    dynamodb.deleteTable(schema, (error) => {
      if (error) {
        if (error.code === constants.RESOURCE_IN_USE) {
          if (deleteAttempts < maxAttempts) {
            deleteAttempts += 1;
            setTimeout(() => {
              log(`Trying to delete the table ${params.tableName}'... (Attempt: ${deleteAttempts})`);
              utils.deleteTable(params)
                .then(() => {
                  fulfill(Object.assign({}, params, { createTableAfterDelete: null }));
                }).catch((e) => {
                  reject(e);
                });
            }, throttleMs);
          } else {
            reject(new Error(constants.ERROR_TOO_MUCH_ATTEMPTS));
          }
        } else if (error.code === constants.RESOURCE_NOT_FOUND) {
          fulfill(params);
        } else {
          reject(error);
        }
      } else {
        fulfill(params);
      }
    });
  });

const createTable = params =>
  new Promise((fulfill, reject) => {
    const dynamodb = utils.getAWSInstance(params);

    dynamodb.createTable(params.ddbParams, (error) => {
      if (error) {
        if (error.code === constants.RESOURCE_IN_USE) {
          utils.deleteTable(Object.assign({}, params, { createTableAfterDelete: true }))
            .then(utils.createTable)
            .finally(() => {
              fulfill(params);
            });
        } else {
          reject(error);
        }
      } else {
        log(`Table '${params.tableName}' created successfully`);
        fulfill(params);
      }
    });
  });

const insertBatch = params =>
  new Promise((fulfill, reject) => {
    const batch = 25;
    const items = params.items;
    let index = 0;

    if (!params.items) {
      reject(new Error(constants.ERROR_ITEMS_LIST_EMPTY));
    }

    if (!params.formatItem) {
      reject(new Error(constants.ERROR_NO_FORMAT_ATTRIBUTE));
    }

    log(`Inserting ${params.items.length} items...`);
    const bar = new ProgressBar({
      schema: constants.BAR_FORMAT,
      total: items.length,
      current: 0,
    });

    const next = () => {
      const batchItems = [];

      for (let i = 0; i < batch; ++i) {
        if (index >= items.length) {
          break;
        }

        const data = items[index];
        batchItems.push(params.formatItem(data));

        index += 1;
      }

      const schema = { RequestItems: {} };
      schema.RequestItems[params.tableName] = batchItems;

      const docClient = new AWS.DynamoDB.DocumentClient();
      docClient.batchWrite(schema, (error) => {
        if (error) {
          reject(error);
        } else if (index >= items.length || items.length <= batch) {
          bar.update(1);
          fulfill(params);
        } else {
          const currentValue = (index - batch);
          bar.update(currentValue / items.length);
          setTimeout(next, throttleMs);
        }
      });
    };

    setTimeout(next, 15000);
  });

utils = {
  deleteTable,
  createTable,
  insertBatch,
  getAWSInstance,
};

module.exports = utils;
