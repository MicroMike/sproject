const {
	MAccount,
	MCard,
	getAccount,
	check,
	getDelAccount,
} = require('./mongoSchema')
const { rand } = require('./helpers')
const fs = require('fs');

module.exports = (app) => {
	app.use((req, res) => {
		const url = req.url.split('?')[0]
		const params = req.url.split('?')[1] + req.url.hash
		const query = req.query

		switch (url) {
			case '/clearUsed': {
				MAccount.find({}, (err, Ra) => {
					Ra && Ra.forEach(account => {
						account.used = false
						account.used2 = false
						account.save()
					})
				})
				res.json({ ok: 'true' })
				break
			}

			case '/accounts': {
				if (query.del === 'true') {
					getDelAccount((r) => res.json(r))
				} else {
					getAccount(query.check === 'true', true, (r) => res.json(r))
				}

				break
			}

			case '/account': {
				getAccount(query.check === 'true', false, (r) => res.json(r))
				break
			}

			case '/check': {
				check(params, true, (r) => res.json(r))
				break
			}

			case '/uncheck': {
				if (params) {
					check(params, false, (r) => res.json(r))
				} else {
					MAccount.find({ check: true }, (err, Ra) => {
						Ra.forEach(r => {
							r.check = false
							r.save()
						})

						res.json(Ra)
					})
				}
				break
			}

			case '/addAccount': {
				const p = params && params.split('/')
				let accounts = {}
				p && p.forEach(a => {
					a && MAccount.findOne({ account: a }, (err, Ra) => {
						if (Ra) {
							accounts[a] = false
						}
						else {
							accounts[a] = true
							const r = new MAccount({ account: a, check: false, del: false });
							r.save((err, a) => { console.log(a) })
						}
					})
				})
				res.json({ accounts })
				break
			}

			case '/error': {
				try {
					const p = params && params.split('/')
					p[0] && p[1] && MAccount.findOne({ account: p[1] }, (err, Ra) => {
						if (err || !Ra) {
							res.json(err || 'notFound')
							return
						}

						Ra[p[0]] = true
						Ra.save((err, a) => {
							res.json(a)
						})
					})
				}
				catch (e) {
					res.json(e)
				}
				break
			}

			case '/checkOk': {
				params && MAccount.findOne({ account: params }, (err, Ra) => {
					if (Ra) {
						Ra.check = false
						Ra.save((err, a) => {
							res.json(a)
						})
					}
				})
				break
			}

			case '/listAccount': {
				const isV2 = params === 'v2'
				const filter = params && params !== ''
					? isV2
						? { used2: { $ne: true }, v2: true }
						: { account: params }
					: { v2: { $ne: true }, check: { $ne: true }, used: { $ne: true }, del: { $ne: true }, pause: { $ne: true } }

				MAccount.find(filter, (err, Ra) => {
					res.json(Ra)
				})
				break
			}

			case '/useAccount': {
				const isV2 = params === 'v2'
				const filter = params && params !== ''
					? isV2
						? { used2: { $ne: true }, v2: true }
						: { account: params }
					: { v2: { $ne: true }, check: { $ne: true }, used: { $ne: true }, del: { $ne: true }, pause: { $ne: true } }

				MAccount.find(filter, (err, Ra) => {
					const filter = rand(10);
					// const filter = 0;

					const randAccounts = Ra // && Ra.filter(ra => filter !== 0 || /apple|spotify|amazon|mbm|zetaf/.test(ra.account))

					if (!randAccounts) {
						res.json({ ok: 'true' })
					}

					const account = randAccounts && randAccounts.length > 0
						? randAccounts[rand(randAccounts.length)]
						: Ra[rand(Ra.length)]

					if (account) {
						if (isV2) {
							account.used2 = true
						}
						account.used = true
						account.save(() => {
							res.json(account)
						})
					}
				})
				break
			}

			case '/noUseAccount': {
				MAccount.findOne({ account: params }, (err, Ra) => {
					if (Ra) {
						Ra.used = false
						Ra.used2 = false
						Ra.save(() => {
							res.json(Ra)
						})
					}
					else {
						res.json({ ok: 'true' })
					}
				})
				break
			}

			case '/delAccount': {
				const p = params && params.split('/')
				let accounts = {}
				p && p.forEach(a => {
					a && MAccount.deleteMany({ account: new RegExp(a, 'i') }, (err, Ra) => { })
				})
				res.json({ accounts })
				break
			}

			case '/clear': {
				MAccount.deleteMany({ del: true }, (err, Ra) => {
					res.json(Ra)
				})
				break
			}

			case '/pause': {
				MAccount.find({ "account": { "$regex": "^" + params, "$options": "i" } }, (err, Ra) => {
					Ra.forEach(r => {
						r.pause = true
						r.save()
					})
				})
				break
			}

			case '/unpause': {
				MAccount.find({ "account": { "$regex": "^" + params, "$options": "i" } }, (err, Ra) => {
					Ra.forEach(r => {
						r.pause = false
						r.save()
					})
				})
				break
			}

			case '/card': {
				res.setHeader('Content-Type', 'application/json');

				// const p = params && params.split('/')
				// if (p) {
				// 	MCard.findOne({}, (err, old) => {
				// 		MCard.deleteMany({}, () => {
				// 			console.log(old)
				// 			const card = new MCard({ cardNumber: p[0], month: p[1] || old.month, year: p[2] || old.year, code: p[3] || old.code })
				// 			card.save((err, a) => { res.json(a)) })
				// 		})
				// 	})
				// }
				// else {
				// 	MCard.findOne({}, (err, Ra) => {
				// 		res.json(Ra))
				// 	})
				// }

				MCard.findOne({}, (err, Ra) => {
					res.json(Ra)
				})
				break
			}

			case '/cardForm': {
				fs.readFile(__dirname + '/card.html',
					function (err, data) {
						if (err) {
							res.writeHead(500);
							return res.end('Error loading index.html');
						}

						res.writeHead(200);
						res.end(data);
					});
				break
			}

			default:
				res.json({ default: 'true' })
				break
		}
	});

	return app
}
