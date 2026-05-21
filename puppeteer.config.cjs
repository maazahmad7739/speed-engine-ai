const { join } = require('path');

module.exports = {
  cacheDirectory: join(__dirname, 'backend', '.cache', 'puppeteer'),
};

