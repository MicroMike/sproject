const mongoose = require('mongoose');
const { rand } = require('./helpers')

const SAccount = new mongoose.Schema({
	account: String,
	pending: Boolean,
	check: Boolean,
	pause: Boolean,
	del: Boolean,
	used: Boolean,
	used2: Boolean,
	v2: Boolean,
});
const MAccount = mongoose.model('Account', SAccount, 'accounts');

const SGain = new mongoose.Schema({
	plays: Number,
	nexts: Number,
	time: Number,
	month: Number,
	year: Number,
});
const MGain = mongoose.model('Gain', SGain, 'gain');

const SSong = new mongoose.Schema({
	song: String,
	plays: Number,
});
const MSong = mongoose.model('Song', SSong, 'songs');

const SCard = new mongoose.Schema({
	cardNumber: Number,
	month: Number,
	year: Number,
	code: String,
});
const MCard = mongoose.model('Card', SCard, 'cards');

const getAccount = async (isCheck = false, multi = false, callback) => {
	const findParams = { check: { $ne: isCheck ? false : true }, del: { $ne: true }, pause: { $ne: true } }

	MAccount.find(findParams, (err, Ra) => {
		if (!Ra || Ra.length === 0) {
			callback(false)
		} else {
			let accounts = Ra

			if (isCheck) {
				accounts = accounts.map((a) => /amazon|tidal/.test(a))
			}

			// if (rand(2) === 1) {
			// 	accounts = Ra.filter((a) => /amazon/.test(a))
			// }

			// if (accounts.length === 0) {
			// 	accounts = Ra
			// }

			const a = accounts[rand(accounts.length - 1)]
			callback(multi ? Ra : a.account)
		}
	})
}

const check = async (account, bool, callback) => {
	MAccount.findOne({ account }, (err, Ra) => {
		if (err || !Ra) return callback('notFound');

		Ra.check = bool
		Ra.save((err, a) => { callback(Ra) })
	})
}

module.exports = {
	MAccount,
	MGain,
	MSong,
	MCard,
	getAccount,
	check,
}