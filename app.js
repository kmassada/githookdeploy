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

var key, options, id, branch, auth;
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
    key = data.slice(0, data.length - 1);
});

function signBlob (key, blob) {
  return 'sha1=' + crypto.createHmac('sha1', key).update(blob).digest('hex');
}

function sendCommand(options, uid) {
    child_process.execFile(path.join(__dirname, 'bin/deploy.sh'), [id, branch, options.shell || ''], {
		cwd: options.path,
		uid: uid
	}, function (error, stdout, stderr) {
		log.info(stdout);
		if (stderr) {
			log.error(stderr);
		}
		if (error) {
			log.error(error);
		} else {
            log.info('Deployment done.');
		}
	});

	log.info('Deployment started.');
}
//main()
function hook(req, res, next) {
    // errors
    function hasError (msg) {
          log.error(msg);
          res.status(400).send(JSON.stringify({ error: msg }));

          var err = new Error(msg);
    }
    function verifyHeaders() {
        //HEADERS
        log.info(req.headers);
        var obj;
        var headers=req.headers;
        sig = headers['x-hub-signature'];
        deliv = headers['x-github-delivery'];
        agent = headers['user-agent'];

        if ( !sig || !deliv || !agent ){
            hasError('Sorry! you are not my agent.');
        }

        if(agent.indexOf('GitHub-Hookshot')<0){
            hasError('Sorry! what you think you doing?');
        }

        log.info('headers are validated');
    }

    function verifyAuth(options){
        // check auth
    	auth = basicAuth(req);
    	if (!auth ||
    		!auth.pass ||
    		options.users.indexOf(auth.name) < 0 ||
    		config.users[auth.name] != auth.pass) {
    		hasError('Access Denied.');
    	}
        log.info('auth1 is passed');
    }

    function verifyConfig() {
        //hookagent behavior
        log.info(config);
        id = req.params[0];
    	if (!id) {
    		hasError('No project id provided.');
    	}

    	// find project in config
    	var project = config.projects[id];
    	if (!project) {
    		hasError('No project named as "' + id + '" found.');
    	}

    	// find branch options in config
    	branch = req.params[1] || config.defaultBranch;
    	options = project[branch];
        log.info(options);
    	if (!options) {
    		hasError('No options of branch "' + branch + '" found. Please check config.');
    	}

        fs.exists((options.path), function (exists) {
            if(!exists){
                hasError('No path found for project: "' + id + '"');
            }
        });

        verifyAuth(options);

        log.info('server configs are validated');
    }
    verifyConfig();
    verifyHeaders();

    req.pipe(bl(function (err, data) {
        if (err) {
            return hasError(err.message);
        }

        if (sig !== signBlob(key, data)){
            return hasError('X-Hub-Signature does not match blob signature');
        }
        log.info('auth2 is passed');

        try {
            obj = JSON.parse(data.toString());
        } catch (e) {
            return hasError(e);
        }

        // need nodejs 0.12
    	var user = child_process.execSync('id -u ' + auth.name);
        var uid = parseInt(Buffer.isBuffer(user) ? user.toString() : user, 10);
        sendCommand(option, uid);
        res.status(200).send('Request Recieved');
    }));


}

//pulse
agent.get('/', function (req, res, next) {
	// indicate process is running
	log.info(req.headers);
	res.status(200).send('ok');
});

// [POST]:/project/project-name<@branch-name>
agent.post(/\/project\/([\w-]+)(?:@([\w-]+))?/i, hook);

agent.listen(config.port, function() {
	log.info("Hook agent started at %s. Listening on %d", new Date(), config.port);
});
