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
	country: String,
	parent: Boolean,
	parentId: String,
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
			const a = Ra[rand(Ra.length - 1)]
			callback(multi ? Ra || [] : a && a.account)
		}
	})
}

const getAllAccounts = async (callback) => {
	const findParams = {}

	MAccount.find(findParams, (err, Ra) => {
		if (!Ra || Ra.length === 0) {
			callback(false)
		} else {
			callback(Ra || [])
		}
	})
}

const findAccounts = (params, check, callback) => {
	MAccount.find({ "account": { "$regex": params, "$options": "i" }, check: { $ne: !check }, del: { $ne: true }, pause: { $ne: true } }, (err, Ra) => {
		callback(Ra || [])
	})
}

const getDelAccount = async (callback) => {
	const findParams = { del: true }

	MAccount.find(findParams, (err, Ra) => {
		if (!Ra || Ra.length === 0) {
			callback(false)
		} else {
			callback(Ra)
		}
	})
}

const update = async (acc, key, value, callback) => {
	MAccount.find({ account: { "$regex": acc, "$options": "i" } }, (err, Ra) => {
		if (err || !Ra || Ra.length === 0) return callback('notFound');

		Ra.forEach(a => {
			a[key] = value
			a.save()
		});

		callback(Ra)
	})
}

const check = async (account, bool, callback) => {
	MAccount.findOne({ account }, (err, Ra) => {
		if (err || !Ra) return callback('notFound');

		Ra.check = bool
		Ra.save((err, a) => { callback(Ra) })
	})
}

const del = async (account, bool, callback) => {
	MAccount.findOne({ account }, (err, Ra) => {
		if (err || !Ra) return callback('notFound');

		Ra.del = bool
		Ra.save((err, a) => { callback(Ra) })
	})
}

module.exports = {
	MAccount,
	MGain,
	MSong,
	MCard,
	getAccount,
	getAllAccounts,
	check,
	del,
	getDelAccount,
	findAccounts,
	update,
}