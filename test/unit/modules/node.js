/* eslint-disable mocha/no-pending-tests */
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

var genesisDelegates = require('../../data/genesis_delegates.json');
var accountFixtures = require('../../fixtures/accounts');
var application = require('../../common/application');

describe('node', () => {
	var testDelegate = genesisDelegates.delegates[0];
	var defaultPassword;
	var library;

	before(done => {
		application.init(
			{ sandbox: { name: 'starcro_test_modules_node' } },
			(err, scope) => {
				library = scope;
				// Set delegates module as loaded to allow manual forging
				library.rewiredModules.delegates.__set__('__private.loaded', true);
				// Load forging delegates
				library.rewiredModules.delegates.__get__('__private');
				done(err);
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('constructor', () => {
		describe('library', () => {
			it('should assign build');

			it('should assign lastCommit');

			it('should assign config.version');

			it('should assign config.nethash');

			it('should assign config.nonce');
		});

		it('should assign blockReward');

		it('should assign blockReward with BlockReward instance');

		it('should call callback with error = null');

		it('should call callback with result as a Node instance');
	});

	describe('internal', () => {
		var node_module;

		before(done => {
			node_module = library.modules.node;
			done();
		});

		function updateForgingStatus(testDelegate, forging, cb) {
			node_module.internal.getForgingStatus(
				testDelegate.publicKey,
				(err, res) => {
					if (res.length) {
						node_module.internal.updateForgingStatus(
							testDelegate.publicKey,
							testDelegate.password,
							forging,
							cb
						);
					} else {
						cb(err, {
							publicKey: testDelegate.publicKey,
							password: testDelegate.password,
						});
					}
				}
			);
		}

		describe('updateForgingStatus', () => {
			before(done => {
				defaultPassword = library.config.forging.defaultPassword;
				done();
			});

			it('should return error with invalid password', done => {
				node_module.internal.updateForgingStatus(
					testDelegate.publicKey,
					'Invalid password',
					true,
					err => {
						expect(err).to.equal('Invalid password and public key combination');
						done();
					}
				);
			});

			it('should return error with invalid publicKey', done => {
				var invalidPublicKey =
					'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';

				node_module.internal.updateForgingStatus(
					invalidPublicKey,
					defaultPassword,
					true,
					err => {
						expect(err).equal(
							'Delegate with publicKey: 9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a not found'
						);
						done();
					}
				);
			});

			it('should return error with non delegate account', done => {
				node_module.internal.updateForgingStatus(
					accountFixtures.genesis.publicKey,
					accountFixtures.genesis.password,
					true,
					err => {
						expect(err).equal(
							'Delegate with publicKey: c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f not found'
						);
						done();
					}
				);
			});

			it('should update forging from enabled to disabled', done => {
				updateForgingStatus(testDelegate, true, err => {
					expect(err).to.not.exist;

					node_module.internal.updateForgingStatus(
						testDelegate.publicKey,
						defaultPassword,
						false,
						(err, res) => {
							expect(err).to.not.exist;
							expect(res).to.eql({
								publicKey: testDelegate.publicKey,
								forging: false,
							});
							done();
						}
					);
				});
			});

			it('should update forging from disabled to enabled', done => {
				updateForgingStatus(testDelegate, false, err => {
					expect(err).to.not.exist;

					node_module.internal.updateForgingStatus(
						testDelegate.publicKey,
						defaultPassword,
						true,
						(err, res) => {
							expect(err).to.not.exist;
							expect(res).to.eql({
								publicKey: testDelegate.publicKey,
								forging: true,
							});
							done();
						}
					);
				});
			});
		});

		describe('getForgingStatus', () => {
			it('should return delegate full list when publicKey is not provided', done => {
				node_module.internal.getForgingStatus(null, (err, data) => {
					expect(err).to.be.null;
					expect(data[0]).to.deep.equal({
						forging: true,
						publicKey: testDelegate.publicKey,
					});
					expect(data.length).to.equal(genesisDelegates.delegates.length);
					done();
				});
			});

			it('should return delegate status when publicKey is provided', done => {
				node_module.internal.getForgingStatus(
					testDelegate.publicKey,
					(err, data) => {
						expect(err).to.be.null;
						expect(data[0]).to.deep.equal({
							forging: true,
							publicKey: testDelegate.publicKey,
						});
						expect(data.length).to.equal(1);
						done();
					}
				);
			});

			it('should return delegate status when publicKey is provided and updated forging from enabled to disabled', done => {
				node_module.internal.updateForgingStatus(
					testDelegate.publicKey,
					defaultPassword,
					false,
					(err, res) => {
						expect(err).to.not.exist;
						expect(res).to.eql({
							publicKey: testDelegate.publicKey,
							forging: false,
						});
						node_module.internal.getForgingStatus(
							testDelegate.publicKey,
							(err, data) => {
								expect(err).to.be.null;
								expect(data[0]).to.deep.equal({
									forging: false,
									publicKey: testDelegate.publicKey,
								});
								expect(data.length).to.equal(1);
								done();
							}
						);
					}
				);
			});

			it('should return updated delegate full list when publicKey is not provided and forging status was changed', done => {
				node_module.internal.getForgingStatus(null, (err, data) => {
					expect(err).to.be.null;
					expect(data[0]).to.deep.equal({
						forging: false,
						publicKey: testDelegate.publicKey,
					});
					expect(data.length).to.equal(genesisDelegates.delegates.length);
					done();
				});
			});

			it('should return empty array when invalid publicKey is provided', done => {
				var invalidPublicKey =
					'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
				node_module.internal.getForgingStatus(invalidPublicKey, (err, data) => {
					expect(err).to.be.null;
					expect(data.length).to.equal(0);
					done();
				});
			});
		});
	});

	describe('shared', () => {
		describe('getConstants', () => {
			describe('when loaded = false', () => {
				it('should call callback with error = "Blockchain is loading"');
			});

			describe('when loaded = true', () => {
				it('should call modules.blocks.lastBlock.get');

				it('should call callback with error = null');

				it('should call callback with result containing build = library.build');

				it(
					'should call callback with result containing commit = library.commit'
				);

				it(
					'should call callback with result containing epoch = constants.epochTime'
				);

				it('should call callback with result containing fees = constants.fees');

				it(
					'should call callback with result containing nethash = library.config.nethash'
				);

				it(
					'should call callback with result containing nonce = library.config.nonce'
				);

				it(
					'should call callback with result containing milestone = blockReward.calcMilestone result'
				);

				it(
					'should call callback with result containing reward = blockReward.calcReward result'
				);

				it(
					'should call callback with result containing supply = blockReward.calcSupply result'
				);

				it(
					'should call callback with result containing version = library.config.version'
				);
			});
		});

		describe('getStatus', () => {
			describe('when loaded = false', () => {
				it('should call callback with error = "Blockchain is loading"');
			});

			describe('when loaded = true', () => {
				it('should call callback with error = null');

				it(
					'should call callback with result containing broadhash = modules.system.getBroadhash result'
				);

				it(
					'should call callback with result containing consensus = modules.peers.calculateConsensus result'
				);

				it(
					'should call callback with result containing height = modules.blocks.lastBlock.get result'
				);

				it(
					'should call callback with result containing syncing = modules.loader.syncing result'
				);

				it('should call modules.loader.getNetwork');

				describe('when modules.loader.getNetwork fails', () => {
					it(
						'should call callback with result containing networkHeight = null'
					);
				});

				describe('when modules.loader.getNetwork succeeds and returns network', () => {
					it(
						'should call callback with result containing networkHeight = network.height'
					);
				});
			});
		});
	});

	describe('onBind', () => {
		describe('modules', () => {
			it('should assign blocks');

			it('should assign loader');

			it('should assign peers');

			it('should assign system');
		});

		it('should assign loaded = true');
	});
});
