//
// DynamoDB wrapper
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
 * Returns the item for a single key from the table.
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
 * Returns items for multiple keys. This is limited to 100 keys at a time due to DynamoDB limits.
 *
 * Params:
 *   Keys: array of keys to fetch
 */
Table.prototype.batchGet = function(params, callback) {
  var keys = params.Keys || [];
  if (keys.length === 0) {
    callback(null, []);
    return;
  }
  var tableName = this.name;
  var getParams = { RequestItems: {} };
  getParams.RequestItems[tableName] = { Keys: keys };

  this.dynamo.batchGet(getParams, function(err, result) {
    if (err) {
      callback(err);
    } else if (result.UnprocessedKeys && result.UnprocessedKeys[tableName]) {
      // TODO(kito): we should retry these.
      callback(errors.serverError('Unprocessed Keys'));
    } else {
      callback(null, result.Responses[tableName] || []);
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


var ACL = function(name) {
  this.name = name;
  this.dynamo = new aws.DynamoDB.DocumentClient();
};

/**
 * Returns the ACL entry for a given user and resource.
 *
 * Params:
 *   User: the user ID
 *   Resource: the resource identifier. This can be whatever your application wants.
 */
ACL.prototype.getPermissions = function(params, callback) {
  var key = { userID: params.User, res: params.Resource };
  this.dynamo.get({ TableName: this.name, Key: key }, function(err, result) {
    if (err) {
      callback(err);
    } else {
      callback(null, result.Item ? result.Item : key);
    }
  });
};

/**
 * Fails with a forbidden error if the user does not have all of the listed permissions on the
 * resource.
 *
 * Params:
 *   User: the user ID
 *   Resource: the resource identifier
 *   Permissions: array of permissions (strings).
 */
ACL.prototype.checkPermissions = function(params, callback) {
  this.getPermissions(params, function(err, item) {
    if (!err) {
      for (var i = 0; i < params.Permissions.length; i++) {
        if (!item[params.Permissions[i]]) {
          err = errors.forbidden();
          break;
        }
      }
    }
    callback(err);
  });
};

/**
 * Grants the given list of permissions on the given resource to the given user.
 *
 * Params:
 *   User: the user ID
 *   Resource: the resource identifier
 *   Permissions: array of permissions (strings)
 */
ACL.prototype.grantPermissions = function(params, callback) {
  var expression = '';
  var attributeNames = {};
  var attributeValues = {};
  for (var i = 0; i < params.Permissions.length; i++) {
    var placeholder = 'p' + i;
    expression += (expression.length ? ', ' : 'SET ') + '#' + placeholder + '=:' + placeholder;
    attributeNames['#' + placeholder] = params.Permissions[i];
    attributeValues[':' + placeholder] = 1;
  }
  this.dynamo.update({
    TableName: this.name,
    Key: { userID: params.User, res: params.Resource },
    UpdateExpression: expression,
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
  }, function(err, result) {
    callback(err);
  });
};

/**
 * Revokes all permissions on the given resource from the given user.
 *
 * Params:
 *   User: the user ID
 *   Resource: the resource identifier
 */
ACL.prototype.revokePermissions = function(params, callback) {
  var key = { userID: params.User, res: params.Resource };
  this.dynamo.delete({ TableName: this.name, Key: key }, function(err, result) {
    callback(err);
  });
};

function deleteGrants(dynamo, table, grants, callback) {
  // Form batches of 25 grants:
  var batches = [];
  while (grants.length) {
    batches.push(grants.splice(0, 25));
  }

  // Generate tasks that perform a dynamodb batch write for each batch:
  var tasks = batches.map(function(batch) {
    return function(callback) {
      var items = {};
      items[table] = batch.map(function(grant) {
        var key = { userID: grant.userID, res: grant.res };
        return { DeleteRequest: { Key: key } };
      });
      dynamo.batchWrite({ RequestItems: items }, function(err, result) {
        if (result && result.UnprocessedItems && result.UnprocessedItems[table]) {
          // TODO(kito): we should retry these
          err = errors.serverError('Unprocessed Items');
        }
        callback(err);
      });
    };
  });

  // Run all tasks in parallel:
  async.parallel(tasks, function(err) { callback(err); });
}

/**
 * Revokes all permissions for all users on the given resource.
 *
 * Params:
 *   Resource: the resource identifier
 */
ACL.prototype.revokeAllPermissionsForResource = function(params, callback) {
  var self = this;
  async.waterfall([
    function(next) { self.grantsForResource(params, next); },
    function(grants, next) { deleteGrants(self.dynamo, self.name, grants, next); }
  ], callback);
};

/**
 * Returns all grants for a given user, in descending order of resource ID with optional arguments.
 *
 * Params:
 *   User: the user ID
 *   ResourcePrefix: prefix of the resource to match
 *   LastResource: the last resource ID returned in the previous call. We'll start with the next
 *     resource after this
 *   Limit: maximum number of grants to return
 */
ACL.prototype.grantsForUser = function(params, callback) {
  var expression = 'userID=:userID';
  var attributeValues = { ':userID': params.User };
  if (params.ResourcePrefix) {
    expression += ' AND res begins_with :prefix';
    attributeValues[':prefix'] = params.ResourcePrefix;
  }
  if (params.LastResource) {
    expression += ' AND res<:lastResource';
    attributeValues[':lastResource'] = params.LastResource;
  }
  this.dynamo.query({
    TableName: this.name,
    KeyConditionExpression: expression,
    ExpressionAttributeValues: attributeValues,
    ConsistentRead: true,
    ScanIndexForward: false,
    Limit: params.Limit || 10
  }, function(err, result) {
    callback(err, result ? result.Items : []);
  });
};

/**
 * Returns all grants for a given resource.
 *
 * Params:
 *   Resource: the resource ID
 */
ACL.prototype.grantsForResource = function(params, callback) {
  this.dynamo.query({
    TableName: this.name,
    IndexName: 'by-resource',
    KeyConditionExpression: 'res=:res',
    ExpressionAttributeValues: { ':res': params.Resource },
    ConsistentRead: false,
    ScanIndexForward: true,
  }, function(err, result) {
    callback(err, result ? result.Items : []);
  });
};


var Database = {
  /**
   * Returns an object providing access to a DynamoDB table. This is overloaded to invoke either
   * tableForName or tableForRequestAndName depending on the arguments.
   */
  table: function() {
    if (arguments.length == 1 && _.isString(arguments[0])) {
      return Database.tableForName(arguments[0]);
    } else {
      return Database.tableForRequestAndName(arguments[0], arguments[1]);
    }
  },

  /**
   * Returns an object providing access to an ACL. This is overloaded to invoke either
   * aclForName or aclForRequest depending on the arguments.
   */
  acl: function(name) {
    if (_.isString(arguments[0])) {
      return Database.aclForName(arguments[0]);
    } else {
      return Database.aclForRequest(arguments[0]);
    }
  },

  tableForName: function(fullName) {
    return new Table(fullName);
  },

  tableForRequestAndName: function(req, name) {
    return Database.tableForName(req.app.name + '-' + req.environment + '-' + name);
  },

  aclForName: function(fullName) {
    return new ACL(fullName);
  },

  aclForRequest: function(req) {
    return Database.aclForName(req.app.name + '-' + req.environment + '-acl');
  }
};

module.exports = Database;
