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
var createSignatureObject = require('../../../common/helpers/api')
	.createSignatureObject;
var sendSignaturePromise = require('../../../common/helpers/api')
	.sendSignaturePromise;
var sendTransactionPromise = require('../../../common/helpers/api')
	.sendTransactionPromise;
var confirmTransactionsOnAllNodes = require('../common/stress')
	.confirmTransactionsOnAllNodes;

var broadcastingDisabled = process.env.BROADCASTING_DISABLED === 'true';

module.exports = function(params) {
	// Disable multi-signature transaction to avoid nightly build failures
	// eslint-disable-next-line mocha/no-skipped-tests
	describe('stress test for type 4 transactions @slow', function() {
		this.timeout(2200000);
		var transactions = [];
		var accounts = [];
		var maximum = process.env.MAXIMUM_TRANSACTION || 1000;
		var waitForExtraBlocks = broadcastingDisabled ? 10 : 8; // Wait for extra blocks to ensure all the transactions are included in the block

		describe('prepare accounts', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(maximum).map(() => {
						var tmpAccount = randomUtil.account();
						var transaction = starcro.transaction.transfer({
							amount: 2500000000,
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: tmpAccount.address,
						});
						accounts.push(tmpAccount);
						transactions.push(transaction);
						return sendTransactionPromise(transaction);
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

		describe('sending multisignature registrations', () => {
			var signatures = [];
			var agreements = [];
			var numbers = _.range(maximum);
			var i = 0;
			var j = 0;

			before(() => {
				transactions = [];
				return Promise.all(
					numbers.map(num => {
						i = (num + 1) % numbers.length;
						j = (num + 2) % numbers.length;
						var transaction = starcro.transaction.registerMultisignature({
							keysgroup: [accounts[i].publicKey, accounts[j].publicKey],
							lifetime: 24,
							minimum: 1,
							passphrase: accounts[num].passphrase,
						});
						transactions.push(transaction);
						agreements = [
							createSignatureObject(transaction, accounts[i]),
							createSignatureObject(transaction, accounts[j]),
						];
						signatures.push(agreements);
						return sendTransactionPromise(transaction).then(res => {
							expect(res.statusCode).to.be.eql(200);
							return sendSignaturePromise(signatures[num][0])
								.then(res => {
									expect(res.statusCode).to.be.eql(200);
									return sendSignaturePromise(signatures[num][1]);
								})
								.then(res => {
									expect(res.statusCode).to.be.eql(200);
								});
						});
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
