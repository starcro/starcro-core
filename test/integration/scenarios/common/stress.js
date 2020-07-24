'use strict';

const getTransaction = require('../../utils/http').getTransaction;

const confirmTransactionsOnAllNodes = function(transactions, params) {
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

module.exports = {
	confirmTransactionsOnAllNodes,
};
