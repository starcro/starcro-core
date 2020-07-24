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

var async = require('async');
var Promise = require('bluebird');
var waitUntilBlockchainReady = require('../../common/utils/wait_for')
	.blockchainReady;
var utils = require('../utils');

module.exports = {
	waitForAllNodesToBeReady(configurations, cb) {
		const retries = 20;
		const timeout = 3000;
		async.forEachOf(
			configurations,
			(configuration, index, eachCb) => {
				waitUntilBlockchainReady(
					eachCb,
					retries,
					timeout,
					`http://${configuration.ip}:${configuration.httpPort}`
				);
			},
			cb
		);
	},

	enableForgingOnDelegates(configurations, cb) {
		var enableForgingPromises = [];
		configurations.forEach(configuration => {
			configuration.forging.delegates.map(keys => {
				if (!configuration.forging.force) {
					var enableForgingPromise = utils.http.enableForging(
						keys,
						configuration.httpPort
					);
					enableForgingPromises.push(enableForgingPromise);
				}
			});
		});
		Promise.all(enableForgingPromises)
			.then(forgingResults => {
				return cb(
					forgingResults.some(forgingResult => {
						return !forgingResult.forging;
					})
						? 'Enabling forging failed for some of delegates'
						: null
				);
			})
			.catch(error => {
				return cb(error);
			});
	},
};
