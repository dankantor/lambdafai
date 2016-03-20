//
// Implements command-line tool for creating resources, invoking, deploying, etc.
//

var _ = require('lodash');
var App = require('./api/app');
var argparse = require('argparse');
var aws = require('aws-sdk');
var path = require('path');

var commands = {
  'create-resources': require('./commands/create-resources'),
  'describe': require('./commands/describe'),
  'invoke': require('./commands/invoke'),
  'deploy': require('./commands/deploy'),
  'promote': require('./commands/promote'),
};

function parseCommandLineArgs() {
  var parser = new argparse.ArgumentParser({
    addHelp: true,
    description: 'Lambdafai configuration tool'
  });
  parser.addArgument([ '-v', '--verbose' ], {
    help: 'Enables verbose logging.',
    action: 'storeTrue',
    defaultValue: false,
  });
  parser.addArgument([ '-r', '--region' ], {
    help: 'The name of the AWS region to apply changes to.',
    defaultValue: 'us-east-1',
  });

  // Add a sub-parser for each command.
  var commandNames = Object.getOwnPropertyNames(commands);
  var subparsers = parser.addSubparsers({
    title: 'command',
    metavar: 'command',
    dest: 'command',
    description: 'The command to execute. Valid commands include: ' + commandNames.join(', ') +
        '. Use the -h option with the command name for help on specific commands.',
  });

  for (var i = 0; i < commandNames.length; i++) {
    var command = commands[commandNames[i]];
    var subparser = subparsers.addParser(commandNames[i], {
      description: command.description,
      addHelp: true
    });
    if (command.configureParser) {
      command.configureParser(subparser);
    }
  }
  return parser.parseArgs();
}

module.exports = function(app) {
  var args = parseCommandLineArgs();
  aws.config.update({ region: args.region });

  commands[args.command].execute(app, args, function(err) {
    if (err) {
      if (err.stack) {
        console.error('\n' + err.stack);
      } else {
        console.error(err);
      }
    }
  });
};
