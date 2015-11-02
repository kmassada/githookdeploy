//filesystem related
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

//config
var express = require('express');
var basicAuth = require('basic-auth');
var config = require('./config/server.json');
var agent = express();

var commander = require('commander');
var bunyan = require('bunyan');

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
            level: commander.verbose? 'debug' : 'verbose',
            stream: process.stdout            // log INFO and above to stdout
        },
        {
            level: 'error',
            path: '/var/tmp/githookdeploy-error.log'  // log ERROR and above to a file
        }
    ]
});

//main()
function hook(req, res, next) {
    if (headers['X-Github-Delivery'] && headers['X-Hub-Signature'] && headers['X-Github-Delivery']){

    //proceed
    }
    else {
        res.status(400).send('Sorry! you are not my agent.');
    }

}

//pulse
agent.get('/', function (req, res, next) {
	// indicate process is running
	var headers=req.headers;
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
