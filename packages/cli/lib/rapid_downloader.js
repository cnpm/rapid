'use strict';

exports.rapidDownloader = (tasks, options) => {
  const tnpmRapidDownloader = require('@cnpmjs/binding');
  return tnpmRapidDownloader.download(tasks, options);
};
