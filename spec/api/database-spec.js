var _ = require('lodash');
var aws = require('aws-sdk');
var db = require('../../lib/api/database');

describe('Database', function() {
  var client;
  var err;
  var result;

  function capture(_err, _result) {
    err = _err;
    result = _result;
  }

  // Verifies that the spy has been called once, and then invokes the last argument of that call.
  function invokeCallback(spy, err, data) {
    expect(spy.calls.count()).toEqual(1);
    var args = spy.calls.argsFor(0);
    var callback = args[args.length - 1];
    callback(err, data);
  }

  beforeEach(function() {
    err = undefined;
    result = undefined;
    client = jasmine.createSpyObj('client',
        ['get', 'batchGet', 'batchWrite', 'query', 'put', 'update', 'delete']);
    spyOn(aws.DynamoDB, 'DocumentClient').and.returnValue(client);
  });

  describe('#list', function() {
    it('lists items', function() {
      db.table('T').list({HashKey: {h: 'hash'}}, capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'T',
        KeyConditionExpression: '#hashKey=:hashKey',
        ExpressionAttributeNames: { '#hashKey': 'h' },
        ExpressionAttributeValues: { ':hashKey': 'hash' },
        ConsistentRead: true,
        ScanIndexForward: true,
        Limit: 100
      }, jasmine.any(Function));

      var items = [{ h: 'hash', r: 234, createdAt: 123, modifiedAt: 123, title: 'Hi' },
                   { h: 'hash', r: 345, createdAt: 123, modifiedAt: 123, title: 'Bye' }];
      invokeCallback(client.query, null, { Items: items });
      expect(err).toBeNull();
      expect(result).toEqual(items);
    });

    it('lists items with range key limits', function() {
      db.table('T').list({HashKey: {h: 'hash'}, MinRangeKey: {r: 123}, MaxRangeKey: {r: 987}},
        capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'T',
        KeyConditionExpression:
            '#hashKey=:hashKey AND #rangeKey BETWEEN :minRangeKey AND :maxRangeKey',
        ExpressionAttributeNames: { '#hashKey': 'h', '#rangeKey': 'r' },
        ExpressionAttributeValues: { ':hashKey': 'hash', ':minRangeKey': 123, ':maxRangeKey': 987 },
        ConsistentRead: true,
        ScanIndexForward: true,
        Limit: 100
      }, jasmine.any(Function));
    });

    it('empty result', function() {
      db.table('T').list({HashKey: {h: 'hash'}}, capture);
      invokeCallback(client.query, null, { Items: [] });
      expect(err).toBeNull();
      expect(result).toEqual([]);
    });

    it('error from dynamodb', function() {
      db.table('T').list({HashKey: {h: 'hash'}}, capture);
      client.query.calls.argsFor(0)[1](new Error('Fail'));
      expect(err.message).toBe('Fail');
    });
  });

  describe('#get', function() {
    it('existing item', function() {
      db.table('T').get({Key: {h: 'hash', r: 123}}, capture);
      expect(client.get).toHaveBeenCalledWith({
        TableName: 'T',
        Key: {h: 'hash', r: 123}
      }, jasmine.any(Function));

      var item = { h: 'hash', r: 123, createdAt: 1234567890, title: 'Hi', x: 2 };
      invokeCallback(client.get, null, { Item: item });
      expect(err).toBeNull();
      expect(result).toEqual(item);
    });

    it('not found item', function() {
      db.table('T').get({Key: {h: 'hash', r: 123}}, capture);
      invokeCallback(client.get, null, {});
      expect(err.status).toEqual(404);
      expect(result).toBeUndefined();
    });

    it('not found item with AllowMissing', function() {
      db.table('T').get({Key: {h: 'hash', r: 123}, AllowMissing: true}, capture);
      invokeCallback(client.get, null, {});
      expect(err).toBeNull();
      expect(result).toBeNull();
    });

    it('error from dynamodb', function() {
      db.table('T').get({Key: {h: 'hash', r: 123}}, capture);
      invokeCallback(client.get, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe('#put', function() {
    it('inserts new item', function() {
      db.table('T').put({Item: {h: 'hash', r: 123, title: 'Hello, world'}}, capture);
      expect(client.put).toHaveBeenCalledWith({
        TableName: 'T',
        Item: {
          h: 'hash',
          r: 123,
          createdAt: jasmine.any(Number),
          modifiedAt: jasmine.any(Number),
          title: 'Hello, world',
        },
        ConditionExpression: 'attribute_not_exists(createdAt)',
      }, jasmine.any(Function));

      invokeCallback(client.put, null, {});
      expect(err).toBeNull();
      expect(result.createdAt).toBeGreaterThan(_.now() - 1000);
      expect(result.createdAt).toBeLessThan(_.now() + 1000);
      expect(result).toEqual({
        h: 'hash',
        r: 123,
        createdAt: result.createdAt,
        modifiedAt: result.createdAt,
        title: 'Hello, world'
      });
    });

    it('inserts new item with AllowOverwrite', function() {
      db.table('T').put({Item: {h: 'hash', r: 123, title: 'Hello, world'}, AllowOverwrite: true},
        capture);
      expect(client.put).toHaveBeenCalledWith({
        TableName: 'T',
        Item: {
          h: 'hash',
          r: 123,
          createdAt: jasmine.any(Number),
          modifiedAt: jasmine.any(Number),
          title: 'Hello, world',
        },
      }, jasmine.any(Function));
    });

    it('handles conflict', function() {
      db.table('T').put({Item: {h: 'hash', r: 123, title: 'Hello, world'}}, capture);

      var e = new Error('Failed');
      e.name = 'ConditionalCheckFailedException';
      invokeCallback(client.put, e);
      expect(err.status).toBe(409);
      expect(result).toBeUndefined();
    });

    it('handles dynamodb error', function() {
      db.table('T').put({Item: {h: 'hash', r: 123, title: 'Hello, world'}}, capture);
      invokeCallback(client.put, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe('#patch', function() {
    it('patchs item', function() {
      db.table('T').patch({Key: {h: 'hash', r: 123}, Update: {title: 'Hi', x: 2}}, capture);
      expect(client.update).toHaveBeenCalledWith({
        TableName: 'T',
        Key: { h: 'hash', r: 123 },
        ConditionExpression: 'attribute_exists(createdAt)',
        UpdateExpression: 'SET modifiedAt=:modifiedAt, #x0=:x0, #x1=:x1',
        ExpressionAttributeNames: { '#x0': 'title', '#x1': 'x' },
        ExpressionAttributeValues: { ':modifiedAt': jasmine.any(Number), ':x0': 'Hi', ':x1': 2 },
        ReturnValues: 'ALL_NEW',
      }, jasmine.any(Function));

      invokeCallback(client.update, null, {
        Attributes: {
          h: 'hash',
          r: 123,
          createdAt: 1234567890,
          modifiedAt: 2345678901,
          title: 'Hi',
          x: 2,
        }
      });
      expect(err).toBeNull();
      expect(result).toEqual({
        h: 'hash',
        r: 123,
        createdAt: 1234567890,
        modifiedAt: 2345678901,
        title: 'Hi',
        x: 2,
      });
    });

    it('handles not found', function() {
      db.table('T').patch({Key: {h: 'hash', r: 123}, Update: {title: 'Hi', x: 2}}, capture);
      var e = new Error('Failed');
      e.name = 'ConditionalCheckFailedException';
      invokeCallback(client.update, e);
      expect(err.status).toEqual(404);
    });

    it('handles dynamodb error', function() {
      db.table('T').patch({Key: {h: 'hash', r: 123}, Update: {title: 'Hi', x: 2}}, capture);
      invokeCallback(client.update, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe('increment', function() {
    it('increments fields', function() {
      db.table('T').increment({Key: {h: 'hash', r: 123}, Increment: {foo: 2, bar: -1}}, capture);
      expect(client.update).toHaveBeenCalledWith({
        TableName: 'T',
        Key: { h: 'hash', r: 123 },
        ConditionExpression: 'attribute_exists(createdAt)',
        UpdateExpression: 'SET modifiedAt=:modifiedAt ADD #x0 :x0, #x1 :x1',
        ExpressionAttributeNames: { '#x0': 'foo', '#x1': 'bar' },
        ExpressionAttributeValues: { ':modifiedAt': jasmine.any(Number), ':x0': 2, ':x1': -1 },
        ReturnValues: 'ALL_NEW'
      }, jasmine.any(Function));

      invokeCallback(client.update, null, {Attributes: { modifiedAt: 12345, foo: 7, bar: -10 }});
      expect(err).toBeNull();
      expect(result).toEqual({ foo: 7, bar: -10 });
    });

    it('handles not found', function() {
      db.table('T').increment({Key: {h: 'hash', r: 123}, Increment: {foo: 2}}, capture);
      var e = new Error('Failed');
      e.name = 'ConditionalCheckFailedException';
      invokeCallback(client.update, e);
      expect(err.status).toEqual(404);
    });

    it('handles dynamodb error', function() {
      db.table('T').increment({Key: {h: 'hash', r: 123}, Increment: {foo: 2}}, capture);
      invokeCallback(client.update, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe('#delete', function() {
    it('deletes item', function() {
      db.table('T').delete({Key: {h: 'hash', r: 123}}, capture);
      expect(client.delete).toHaveBeenCalledWith({
        TableName: 'T',
        Key: {h: 'hash', r: 123},
      }, jasmine.any(Function));

      invokeCallback(client.delete, null, {});
      expect(err).toBeNull();
      expect(result).toBeUndefined();
    });

    it('handles dynamodb error', function() {
      db.table('T').delete({Key: {h: 'hash', r: 123}}, capture);
      invokeCallback(client.delete, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });
});
