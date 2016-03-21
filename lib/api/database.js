//
// Wrapper around DynamoDB
//

var _ = require('lodash');
var async = require('async');
var aws = require('aws-sdk');
var errors = require('./errors');

function keyName(obj) {
  return Object.getOwnPropertyNames(obj)[0];
}

function keyValue(obj) {
  return obj[keyName(obj)];
}

var Table = function(name) {
  this.name = name;
  this.dynamo = new aws.DynamoDB.DocumentClient();
};

/**
 * Lists items with a given hash key and optional range of range keys.
 *
 * Params:
 *   HashKey: the hash key for items to list (required)
 *   MinRangeKey: the minimum range key to return, inclusive
 *   MaxRangeKey: the maximum range key to return, inclusive
 *   Limit: maximum items to return
 */
Table.prototype.list = function(params, callback) {
  var expression = '#hashKey=:hashKey';
  var attributeNames = { '#hashKey': keyName(params.HashKey) };
  var attributeValues = { ':hashKey': keyValue(params.HashKey) };
  if (params.MinRangeKey && params.MaxRangeKey) {
    expression += ' AND #rangeKey BETWEEN :minRangeKey AND :maxRangeKey';
    attributeNames['#rangeKey'] = keyName(params.MinRangeKey);
    attributeValues[':minRangeKey'] = keyValue(params.MinRangeKey);
    attributeValues[':maxRangeKey'] = keyValue(params.MaxRangeKey);
  } else if (params.minRangeKey) {
    expression += ' AND #rangeKey>=:minRangeKey';
    attributeNames['#rangeKey'] = keyName(params.MinRangeKey);
    attributeValues[':minRangeKey'] = keyValue(params.MinRangeKey);
  } else if (params.maxRangeKey) {
    expression += ' AND #rangeKey<=:maxRangeKey';
    attributeNames['#rangeKey'] = keyName(params.MaxRangeKey);
    attributeValues[':maxRangeKey'] = keyValue(params.MaxRangeKey);
  }

  this.dynamo.query({
    TableName: this.name,
    KeyConditionExpression: expression,
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
    ConsistentRead: true,
    ScanIndexForward: true,
    Limit: params.Limit || 100,
  }, function(err, result) {
    callback(err, err ? undefined : result.Items || []);
  });
};

/**
 * Returns the value for a single key from the table.
 *
 * Params:
 *   Key: the key to use for the lookup (can contain both a hash key and range key)
 *   AllowMissing: if true, succeeds with null if the item is not found; if false (default),
 *     fails with a not found error.
 */
Table.prototype.get = function(params, callback) {
  this.dynamo.get({
    TableName: this.name,
    Key: params.Key
  }, function(err, result) {
    if (err) {
      callback(err);
    } else if (!result.Item && !params.AllowMissing) {
      callback(errors.notFound());
    } else {
      callback(null, result.Item ? result.Item : null);
    }
  });
};

/**
 * Writes an item to the database, invoking the callback with the written item on success.
 *
 * Params:
 *   Item: the item to write.
 *   AllowOverwrite: if true, existing items can be overwritten; if false (default), attempting
 *     to overwrite an existing item will fail with a conflict error.
 */
Table.prototype.put = function(params, callback) {
  var item = _.cloneDeep(params.Item || {});
  item.createdAt = _.now();
  item.modifiedAt = item.createdAt;

  var putArgs = {
    TableName: this.name,
    Item: item,
  }
  if (!params.AllowOverwrite) {
    putArgs.ConditionExpression = 'attribute_not_exists(createdAt)';
  }
  this.dynamo.put(putArgs, function(err, result) {
    if (err && err.name == 'ConditionalCheckFailedException') {
      callback(errors.conflict());
    } else {
      callback(err, item);
    }
  });
};

/**
 * Atomically updates properties on an item. Fails with a not found error if the item does not
 * exist.
 *
 * Params:
 *   Key: key of the object to update
 *   Update: dictionary of fields to update and their new values
 */
Table.prototype.patch = function(params, callback) {
  var updates = params.Update || {};
  var names = Object.getOwnPropertyNames(updates);
  if (names.indexOf('createdAt') >= 0 || names.indexOf('modifiedAt') >= 0) {
    callback(errors.badRequest('Cannot patch createdAt or modifiedAt'));
    return;
  } else if (names.length === 0) {
    callback(errors.badRequest('No updates specified'));
    return;
  }

  // Always update the modified time.
  var expression = 'SET modifiedAt=:modifiedAt';
  var attributeNames = {};
  var attributeValues = { ':modifiedAt': new Date().getTime() };

  // Add to the expression for each of the updates:
  for (var i = 0; i < names.length; i++) {
    var placeholder = 'x' + i;
    expression += ', #' + placeholder + '=:' + placeholder;
    attributeNames['#' + placeholder] = names[i];
    attributeValues[':' + placeholder] = updates[names[i]];
  }

  this.dynamo.update({
    TableName: this.name,
    Key: params.Key,
    ConditionExpression: 'attribute_exists(createdAt)',
    UpdateExpression: expression,
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
    ReturnValues: 'ALL_NEW',
  }, function(err, result) {
    if (err && err.name == 'ConditionalCheckFailedException') {
      err = errors.notFound();
    }
    callback(err, result ? result.Attributes : undefined);
  });
};

/**
 * Atomically increments (or decrements) numeric fields on an item. Invokes callback with a
 * dictionary mapping each of the incremented fields to its new value. Fails with a not found
 * error if the item does not exist.
 *
 * Params:
 *   Key: key of the item to update
 *   Increment: dictionary of fields to updates and increment amounts (numeric)
 */
 Table.prototype.increment = function(params, callback) {
  var increments = params.Increment || {};
  var names = Object.getOwnPropertyNames(increments);
  if (names.indexOf('createdAt') >= 0 || names.indexOf('modifiedAt') >= 0) {
    callback(errors.badRequest('Cannot increment createdAt or modifiedAt'));
    return;
  } else if (names.length === 0) {
    callback(errors.badRequest('No increments specified'));
    return;
  }

  // Always update the modified time.
  var expression = 'SET modifiedAt=:modifiedAt ADD ';
  var attributeNames = {};
  var attributeValues = { ':modifiedAt': new Date().getTime() };

  // Add to the expression for each of the increments:
  for (var i = 0; i < names.length; i++) {
    var placeholder = 'x' + i;
    expression += ((i > 0) ? ', ' : '') + '#' + placeholder + ' :' + placeholder;
    attributeNames['#' + placeholder] = names[i];
    attributeValues[':' + placeholder] = increments[names[i]];
  }

  this.dynamo.update({
    TableName: this.name,
    Key: params.Key,
    ConditionExpression: 'attribute_exists(createdAt)',
    UpdateExpression: expression,
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
    ReturnValues: 'ALL_NEW',
  }, function(err, result) {
    if (err && err.name == 'ConditionalCheckFailedException') {
      err = errors.notFound();
    }
    if (err) {
      callback(err);
    } else {
      var newValues = result.Attributes;
      delete(newValues.modifiedAt);
      callback(null, newValues);
    }
  });
};

/**
 * Deletes an item from the database. If the item is not found, it succeeds anyway.
 *
 * Params:
 *   Key: key of the item to delete.
 */
Table.prototype.delete = function(params, callback) {
  this.dynamo.delete({
    TableName: this.name,
    Key: params.Key
  }, function(err, result) {
    callback(err);
  });
};


module.exports = {
  table: function(name) {
    return new Table(name);
  },
};
