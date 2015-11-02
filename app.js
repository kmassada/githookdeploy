//filesystem related
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

//config
var express = require('express');
var basicAuth = require('basic-auth');
var config = require('./config/server.json');
var agent = express();

//logging
var commander = require('commander');
var bunyan = require('bunyan');

//crypto
var crypto = require('crypto');
var bl = require('bl');
//cli
commander
  .version('1.0.0')
  .option('-v, --verbose', 'list every detail')
  .parse(process.argv);

//logging
var log = bunyan.createLogger({
    name: "githookdeploy",
    serializers: bunyan.stdSerializers,
    src: true,
    streams: [
        {
            level: commander.verbose? 'debug' : 'debug',
            stream: process.stdout            // log INFO and above to stdout
        },
        {
            level: 'error',
            path: '/var/tmp/githookdeploy-error.log'  // log ERROR and above to a file
        }
    ]
});

var blob;
//read secret
function readBlob(callback){
    fs.readFile('config/blob.secret', 'utf8', function (err,data) {
        if (err) return hasError(err);
        callback(null, data);
    });
}

readBlob(function (err, data) {
    if(err) {
        log.error(err);
    }
    blob = data;
});

function signBlob (key, blob) {
  return 'sha1=' + crypto.createHmac('sha1', key).update(blob).digest('hex');
}

//main()
function hook(req, res, next) {

    // errors
    function hasError (msg) {
          log.error(msg);
          res.status(400).send(JSON.stringify({ error: msg }));

          var err = new Error(msg);
    }

    var headers=req.headers;
    sig=headers['x-hub-signature'];
    deliv=headers['x-github-delivery'];
    agent=headers['user-agent'];

    if ( sig && deliv && agent ){
        if(agent.indexOf('GitHub-Hookshot')>-1){
            log.info(headers);

            req.pipe(bl(function (err, data) {
                if (err) {
                    return hasError(err.message);
                }
                if (sig !== signBlob(blob, sig)){
                    return hasError('X-Hub-Signature does not match blob signature');
                }
                try {
                    obj = JSON.parse(data.toString());
                } catch (e) {
                    return hasError(e);
                }
                res.status(200).send('Request Recieved');
            }));
        }
    }
    else {
        res.status(400).send('Sorry! you are not my agent.');
    }

}

//pulse
agent.get('/', function (req, res, next) {
	// indicate process is running
	log.info(req.headers);
	res.status(200).send('ok');
});

agent.post('/payload', hook);

agent.listen(config.port, function() {
	log.info("Hook agent started at %s. Listening on %d", new Date(), config.port);
});

process.on('SIGTERM', function () {
  if (server === undefined) return;
  server.close(function () {
    // Disconnect from cluster master
    process.disconnect && process.disconnect();
  });
});
