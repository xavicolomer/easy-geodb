'use strict'; // eslint-disable-line
const common = require('./common');
const argv = require('minimist')(process.argv.slice(2));
const constants = require('./common/constants');

let functions;

const start = (params) => {
  common.validateSettings(params)
    .then(() => {
      const dbFile = `./${params.settings.db}`;
      const dbModule = require(dbFile); // eslint-disable-line
      dbModule.init(params);
    });
};

const run = (args) => {
  if (args && args.settings) {
    let settings;

    try {
      settings = require(args.settings); // eslint-disable-line
    } catch (error) {
      throw Error(constants.ERROR_SETTINGS_PATH_INVALID);
    }

    functions.start({ settings });
  } else {
    throw Error(constants.ERROR_MISSING_SETTINGS);
  }
};

functions = {
  start,
  run,
};

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
  run(argv);
}

module.exports = functions;
