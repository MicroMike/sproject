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
	date: Date,
	expire: Number,
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

	if (!multi) {
		const dNow = new Date()
		findParams.expire = { $lt: dNow.getTime() }
	}

	MAccount.find(findParams, (err, Ra) => {
		if (!Ra || Ra.length === 0) {
			callback(false)
		} else {
			const a = Ra[rand(Ra.length - 1)]

			if (!multi && a) {
				const d = new Date()
				const time = d.getTime()
				const delay = rand(120, 60) * 60 * 1000

				const newTime = time + delay

				a.expire = newTime
				a.save()
			}

			callback(multi ? Ra || [] : a)
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
	const options = { "account": { "$regex": params.replaceAll('+', '\\+'), "$options": "i" }, del: { $ne: true } }

	if (check) {
		options.pause = { $ne: true }
	}

	MAccount.find(options, (err, Ra) => {
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
	if (key === 'remove') {
		MAccount.deleteOne({ account: { "$regex": acc, "$options": "i" } }, (err, Ra) => {
			if (err || !Ra || Ra.length === 0) return callback('notFound');
			return callback('removed');
		})

		return
	}

	MAccount.find({ account: { "$regex": acc, "$options": "i" } }, (err, Ra) => {
		if (err || !Ra || Ra.length === 0) return callback('notFound');

		Ra.forEach(a => {
			if (key === 'login') {
				const [p, l, pa] = a.account.split(':')
				a.account = `${p}:${value}:${pa}`
			} else if (key === 'pass') {
				const [p, l, pa] = a.account.split(':')
				a.account = `${p}:${l}:${value}`
			}
			else {
				a[key] = value
			}
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