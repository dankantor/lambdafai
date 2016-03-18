module.exports = {
  description: 'Generates a JSON description of the application.',

  execute: function(config, args, callback) {
    console.log('App definition:\n' + JSON.stringify(config, null, 2));
    callback();
  },
};
