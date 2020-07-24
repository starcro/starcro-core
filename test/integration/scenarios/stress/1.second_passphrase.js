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

var Promise = require('bluebird');
var starcro = require('starcro-elements').default;
var accountFixtures = require('../../../fixtures/accounts');
var constants = require('../../../../helpers/constants');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
var sendTransactionsPromise = require('../../../common/helpers/api')
	.sendTransactionsPromise;
var confirmTransactionsOnAllNodes = require('../common/stress')
	.confirmTransactionsOnAllNodes;

var broadcastingDisabled = process.env.BROADCASTING_DISABLED === 'true';

module.exports = function(params) {
	describe('stress test for type 1 transactions @slow', function() {
		this.timeout(1800000);
		var transactions = [];
		var accounts = [];
		var maximum = process.env.MAXIMUM_TRANSACTION || 1000;
		var waitForExtraBlocks = broadcastingDisabled ? 10 : 4; // Wait for extra blocks to ensure all the transactions are included in the block

		describe('prepare accounts', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(maximum).map(() => {
						var tmpAccount = randomUtil.account();
						var transaction = starcro.transaction.transfer({
							amount: 500000000,
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: tmpAccount.address,
						});
						accounts.push(tmpAccount);
						transactions.push(transaction);
						return sendTransactionsPromise([transaction]);
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				var blocksToWait =
					Math.ceil(maximum / constants.maxTransactionsPerBlock) +
					waitForExtraBlocks;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes(transactions, params)
						.then(done)
						.catch(err => {
							done(err);
						});
				});
			});
		});

		describe('sending second passphrase registrations', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(maximum).map(num => {
						var transaction = starcro.transaction.registerSecondPassphrase({
							passphrase: accounts[num].passphrase,
							secondPassphrase: randomUtil.password(),
						});
						transactions.push(transaction);
						return sendTransactionsPromise([transaction]);
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				var blocksToWait =
					Math.ceil(maximum / constants.maxTransactionsPerBlock) +
					waitForExtraBlocks;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes(transactions, params)
						.then(done)
						.catch(err => {
							done(err);
						});
				});
			});
		});
	});
};
