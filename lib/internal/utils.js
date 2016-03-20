var _ = require('lodash');

var LINE = '==============================================================================';

module.exports = {
  logBanner: function(text) {
    console.log('\n' + LINE);
    if (text) {
      console.log(text);
      console.log(LINE);
    }
  },
};
