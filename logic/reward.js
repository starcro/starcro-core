/*
 * Copyright © 2018 Lisk Foundation
 * Copyright © 2018 Starcronus Foundation
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

const slots = require('../helpers/slots.js');
const bignum = require('../helpers/bignum.js');
const constants = require('../helpers/constants.js');

let modules;
let library;

/**
 * Main reward logic.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires helpers/bignum
 * @requires helpers/slots
 * @param {Object} logger
 * @param {Object} schema
 * @todo Add description for the params
 */
class Reward {
	constructor(logger, schema) {
		library = {
			logger,
			schema,
		};
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Binds input parameters to private variable modules.
 *
 * @param {Accounts} accounts
 * @todo Add description for the params
 */
Reward.prototype.bind = function(accounts) {
	modules = {
		accounts
	};
};

/**
 * Returns send fees from constants.
 *
 * @returns {bignumber} Transaction fee
 * @todo Add description for the params
 */
Reward.prototype.calculateFee = function() {
	const fee = new bignum(constants.fees.reward);
	return Number(fee.toString());
};

/**
 * Verifies recipientId and amount greather than 0.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} error, transaction
 * @todo Add description for the params
 */
Reward.prototype.verify = function(transaction, sender, cb) {
	if (!transaction.recipientId) {
		return setImmediate(cb, 'Missing recipient');
	}

	const amount = new bignum(transaction.amount);
	if (amount.lessThanOrEqualTo(0)) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	return setImmediate(cb, null, transaction);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} null, transaction
 * @todo Add description for the params
 */
Reward.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates a buffer with asset.reward.data.
 *
 * @param {transaction} transaction
 * @throws {Error}
 * @returns {buffer}
 * @todo Add description for the params
 */
Reward.prototype.getBytes = function(transaction) {
	try {
		return transaction.asset && transaction.asset.data
			? Buffer.from(transaction.asset.data, 'utf8') : null;
	} catch (ex) {
		throw ex;
	}
};

/**
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed transaction amount.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
Reward.prototype.apply = function(transaction, block, sender, cb, tx) {
	modules.accounts.setAccountAndGet(
		{ address: transaction.recipientId },
		setAccountAndGetErr => {
			if (setAccountAndGetErr) {
				return setImmediate(cb, setAccountAndGetErr);
			}

			modules.accounts.mergeAccountAndGet(
				{
					address: transaction.recipientId,
					balance: transaction.amount,
					u_balance: transaction.amount,
					round: slots.calcRound(block.height),
				},
				mergeAccountAndGetErr => setImmediate(cb, mergeAccountAndGetErr),
				tx
			);
		},
		tx
	);
};

/**
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed transaction amount and balance negative.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
Reward.prototype.undo = function(transaction, block, sender, cb, tx) {
	modules.accounts.setAccountAndGet(
		{ address: transaction.recipientId },
		setAccountAndGetErr => {
			if (setAccountAndGetErr) {
				return setImmediate(cb, setAccountAndGetErr);
			}

			modules.accounts.mergeAccountAndGet(
				{
					address: transaction.recipientId,
					balance: -transaction.amount,
					u_balance: -transaction.amount,
					round: slots.calcRound(block.height),
				},
				mergeAccountAndGetErr => setImmediate(cb, mergeAccountAndGetErr),
				tx
			);
		},
		tx
	);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
 */
Reward.prototype.applyUnconfirmed = function(transaction, sender, cb) {
	return setImmediate(cb);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
 */
Reward.prototype.undoUnconfirmed = function(transaction, sender, cb) {
	return setImmediate(cb);
};

/**
 * @typedef {Object} reward
 * @property {string} data
 */
Reward.prototype.schema = {
	id: 'reward',
	type: 'object',
	properties: {
		data: {
			type: 'string',
			format: 'additionalData',
			minLength: constants.additionalData.minLength,
			maxLength: constants.additionalData.maxLength,
		},
	},
};

/**
 * Deletes blockId from transaction, and validates schema if asset exists.
 *
 * @param {transaction} transaction
 * @returns {transaction}
 * @todo Add description for the params
 */
Reward.prototype.objectNormalize = function(transaction) {
	delete transaction.blockId;

	if (!transaction.asset) {
		return transaction;
	}

	const report = library.schema.validate(
		transaction.asset,
		Reward.prototype.schema
	);

	if (!report) {
		throw `Failed to validate reward schema: ${library.schema.getLastErrors().map(err => err.message).join(', ')}`;
	}

	return transaction;
};

/**
 * Checks if asset exists, if so, returns value, otherwise returns null.
 *
 * @param {Object} raw
 * @returns {rewardAsset|null}
 * @todo Add description for the params
 */
Reward.prototype.dbRead = function(raw) {
	if (raw.tf_data) {
		return { data: raw.tf_data };
	}

	return null;
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @returns {boolean} true - If transaction signatures greather than sender multimin, or there are no sender multisignatures
 * @todo Add description for the params
 */
Reward.prototype.ready = function(transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	}
	return true;
};

module.exports = Reward;
