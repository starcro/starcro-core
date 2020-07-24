/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

var child_process = require('child_process');
var async = require('async');

module.exports = {
	recreateDatabases(configurations, cb) {
		async.forEachOf(
			configurations,
			(configuration, index, eachCb) => {
				child_process.exec(
					`dropdb ${configuration.db.database}; createdb ${
						configuration.db.database
					}`,
					eachCb
				);
			},
			cb
		);
	},

	launchTestNodes(cb) {
		child_process.exec(
			'node_modules/.bin/pm2 start test/integration/pm2.integration.json',
			err => {
				return cb(err);
			}
		);
	},

	clearLogs(cb) {
		child_process.exec('rm -rf test/integration/logs/*', err => {
			return cb(err);
		});
	},

	runMochaTests(testsPaths, cb) {
		var child = child_process.spawn(
			'node_modules/.bin/_mocha',
			[
				'--timeout',
				(8 * 60 * 1000).toString(),
				'--exit',
				'--require',
				'./test/setup.js',
				'--grep',
				'@slow|@unstable',
				'--invert',
			].concat(testsPaths),
			{
				cwd: `${__dirname}/../../..`,
			}
		);

		child.stdout.pipe(process.stdout);
		child.stderr.pipe(process.stderr);

		child.on('close', code => {
			if (code === 0) {
				return cb();
			}
			return cb('Functional tests failed');
		});

		child.on('error', err => {
			return cb(err);
		});
	},

	killTestNodes(cb) {
		child_process.exec('node_modules/.bin/pm2 kill', err => {
			if (err) {
				console.warn(
					'Failed to killed PM2 process. Please execute command "pm2 kill" manually'
				);
			} else {
				console.info('PM2 process killed gracefully');
			}
			return cb();
		});
	},
};
