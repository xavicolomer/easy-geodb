'use strict'; // eslint-disable-line

const fs = require('fs');
const request = require('request');
const ProgressBar = require('ascii-progress');
const constants = require('../common/constants');

/* istanbul ignore next */
const log = (message) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(message);
  }
};

const download = (url, targetPath, callback) => {
  let receivedBytes = 0;
  let totalBytes = 0;
  let bar;

  const req = request.get(url);

  const out = fs.createWriteStream(targetPath);
  req.pipe(out);

  req.on('response', (data) => {
    totalBytes = parseInt(data.headers['content-length'], 10);
    bar = new ProgressBar({
      schema: constants.BAR_FORMAT,
      total: totalBytes,
      current: 0,
    });
  });

  req.on('data', (chunk) => {
    receivedBytes += chunk.length;
    bar.update(receivedBytes / totalBytes);
  });

  req.on('end', () => {
    bar.update(1);
    callback();
  });
};

module.exports = {
  log,
  download,
};
