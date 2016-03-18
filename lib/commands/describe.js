module.exports = {
  description: 'Generates a JSON description of the application.',

  execute: function(app, args, callback) {
    console.log('App definition:\n' + JSON.stringify(app, null, 2));
    callback();
  },
};
