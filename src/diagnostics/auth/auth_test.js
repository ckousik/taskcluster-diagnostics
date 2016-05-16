'use strict';
describe('Testing Auth', function () {
  var taskcluster = require('taskcluster-client');
  var hawk        = require('hawk');
  var helper      = require('../helper')();
  var assert      = require('assert');
  var debug       = require('debug')('auth:test');
  var slugid      = require('slugid');
  var _           = require('lodash');

  if(!helper.cfg.taskcluster.credentials.accessToken){
    debug("Skipping test due to missing credentials");
    return;
  }

  var auth = new taskcluster.Auth({
    credentials:  helper.cfg.taskcluster.credentials
  });

  it('can get client', async function (done) {
    this.timeout(20*1000);
    let clientId = helper.cfg.taskcluster.credentials.clientId;
    let client = await auth.client(clientId);
    debug("Client: %s",JSON.stringify(client));
    assert(client.clientId === clientId);
    return done();
  });

  it('can create and delete client', async function (done) {
    this.timeout(20*1000);
    let clientId = helper.cfg.taskcluster.baseClientId+slugid.nice();
    let expires = new Date();
    expires.setMinutes(expires.getMinutes() + 2);
    expires = expires.toJSON();
    auth.createClient(clientId,{
      expires,
      description: "delete me"
    }).then(async (client) => {
      assert(client.clientId === clientId);
      await auth.deleteClient(clientId);
      return done();
    })
  });

  it('can answer authenticateHawk requests', async function (done) {
    let credentials = helper.cfg.taskcluster.credentials;
    this.timeout(30*1000);

    let data = {
      method:         'get',
      resource:       '/',
      host:           'test.taskcluster.net',
      port:           443
    };
    /*
    hawk.client.header('https://'+data.header+data.resource, data.method, req_credentials).field
    */
    data.authorization = hawk.client.header(
        'https://' + data.host + data.resource, data.method, {
          credentials: {
            id: credentials.clientId,
            key: credentials.accessToken,
            algorithm: 'sha256',
          },
          payload: '{}'
        }).field;

    let result = await auth.authenticateHawk(data)
    debug("Result: %s",JSON.stringify(result));
    assert(result.status === 'auth-success',"Auth failed");
    assert(result.hash === 'XtNvx1FqrUYVOLlne3l2WzcyRfj9QeC6YtmhMKKFMGY=', "Wrong hash");
    return done();
  });

  return;
});