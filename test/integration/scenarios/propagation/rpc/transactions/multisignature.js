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

const Promise = require('bluebird');
const starcro = require('starcro-elements').default;
const getTransaction = require('../../../../utils/http').getTransaction;
const waitFor = require('../../../../../common/utils/wait_for');
const constants = require('../../../../../../helpers/constants');
const accountFixtures = require('../../../../../fixtures/accounts');
const randomUtil = require('../../../../../common/utils/random');
const {
	createSignatureObject,
	sendTransactionPromise,
	getPendingMultisignaturesPromise,
} = require('../../../../../common/helpers/api');

module.exports = function multisignature(params) {
	describe('RPC /postSignatures', () => {
		let transactions = [];
		const accounts = [];
		const MAXIMUM = 3;

		const validateTransactionsOnAllNodes = () => {
			return Promise.all(
				_.flatMap(params.configurations, configuration => {
					return transactions.map(transaction => {
						return getTransaction(transaction.id, configuration.httpPort);
					});
				})
			).then(results => {
				results.forEach(transaction => {
					expect(transaction)
						.to.have.property('id')
						.that.is.an('string');
				});
			});
		};

		const postSignatures = signature => {
			const postSignatures = {
				signatures: [signature],
			};
			return Promise.all(
				params.sockets.map(socket => {
					return socket.emit('postSignatures', postSignatures);
				})
			);
		};

		describe('prepare accounts', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(MAXIMUM).map(() => {
						var tmpAccount = randomUtil.account();
						var transaction = starcro.transaction.transfer({
							amount: 2500000000,
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: tmpAccount.address,
							ready: true,
						});
						accounts.push(tmpAccount);
						transactions.push(transaction);
						return sendTransactionPromise(transaction);
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				var blocksToWait =
					Math.ceil(MAXIMUM / constants.maxTransactionsPerBlock) + 1;
				waitFor.blocks(blocksToWait, () => {
					validateTransactionsOnAllNodes().then(done);
				});
			});
		});

		describe('sending multisignature registrations', () => {
			const signatures = [];
			const numbers = _.range(MAXIMUM);
			let i = 0;
			let j = 0;

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
						signatures.push([
							createSignatureObject(transaction, accounts[i]),
							createSignatureObject(transaction, accounts[j]),
						]);
						return sendTransactionPromise(transaction).then(res => {
							expect(res.statusCode).to.be.eql(200);
						});
					})
				);
			});

			it('pending multisignatures should remain in the pending queue', () => {
				return Promise.map(transactions, transaction => {
					var params = [`id=${transaction.id}`];

					return getPendingMultisignaturesPromise(params).then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].id).to.be.equal(transaction.id);
					});
				});
			});

			it('sending the required signatures in the keysgroup agreement', () => {
				return Promise.all(
					numbers.map(member => {
						postSignatures(signatures[member][0]).then(() => {
							return postSignatures(signatures[member][1]);
						});
					})
				);
			});

			it('check all the nodes received the transactions', done => {
				const blocksToWait =
					Math.ceil(MAXIMUM / constants.maxTransactionsPerBlock) + 1;
				waitFor.blocks(blocksToWait, () => {
					validateTransactionsOnAllNodes().then(done);
				});
			});
		});
	});
};
