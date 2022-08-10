const {
	MAccount,
	MGain,
	MSong,
	getAccount,
	check,
} = require('./mongoSchema')

module.exports = {
	getAccount: (isCheck) => new Promise((res) => {
		getAccount(isCheck, false, (a) => res(a))
	}),
	check: (account, bool) => new Promise((res) => {
		check(account, bool, (a) => res(a))
	}),
	reset: async () => {
		return new Promise(res => {
			MAccount.find({}, function (err, Ra) {
				if (err) return console.error(err);
				const Taccounts = Ra.map(a => {
					a.check = false
					a.del = false
					a.save()
					return a.account
				})
				res(Taccounts)
			})
		})
	},
	actions: (req, callback) => {
		const action = req.split('?')[0]
		const params = req.split('?')[1]

		switch (action) {
			case 'reset':
				// getAccounts(a => callback && callback(a), true)
				break

			case 'listen':
				params && MSong.findOne({ song: params }, (err, Ra) => {
					if (!Ra) {
						const r = new MSong({ song: params, plays: 1 })
						r.save((err, g) => callback && callback(g))
					}
					else {
						Ra.plays = Ra.plays + 1
						Ra.save((err, a) => callback && callback(a))
					}
				})
				break

			case 'useAccount': {
				if (params) {
					MAccount.findOne({ account: params }, (err, Ra) => {
						if (Ra) {
							Ra.used = true
							Ra.save()
						}
					})
				}
				break
			}

			case 'noUseAccount': {
				if (params) {
					MAccount.findOne({ account: params }, (err, Ra) => {
						if (Ra) {
							Ra.used = false
							Ra.used2 = false
							Ra.save()
						}
					})
				}
				break
			}

			case 'gain':
				const date = new Date()
				const month = date.getMonth() + 1
				const year = date.getFullYear()

				if (params) {
					const p = params.split('/')

					p[0] && p[1] && MGain.findOne({ month, year }, (err, Rg) => {
						if (err) return console.error(err);

						if (!Rg) {
							const r = new MGain({ plays: 0, nexts: 0, time: 0, month, year })
							r.save((err, g) => callback && callback({ new: true, g }))
						}
						else {
							Rg.plays += 1
							Rg.save((err, g) => callback && callback({ g }))
						}
					})
				}
				else {
					MGain.findOne({ month, year }, function (err, Rg) {
						if (err) return console.error(err);

						if (!Rg) {
							const r = new MGain({ plays: 0, nexts: 0, time: 0, month, year })
							r.save((err, g) => callback && callback({ new: true, g }))
						}
						else {
							callback && callback({ g: Rg })
						}
					})
				}
				break

			default:
				break
		}
	}
}
