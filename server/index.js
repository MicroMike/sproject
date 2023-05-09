const {
	getCheckAccounts,
	getAccounts,
	findAccounts,
	check,
	del,
	actions,
} = require('./mongo')
const routes = require('./routes')
const { wait } = require('./helpers')
const { rand } = require('./helpers')

const express = require("express");
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const _ = require("lodash");

const app = express(); // create express app
app.use(express.static("build"));

const http = require('http').createServer(routes(app));

const io = new Server(http, {
	pingTimeout: 1000 * 60 * 5
});

// MongoDB Connection
mongoose.set('strictQuery', false)
mongoose.connect(
	process.env.MONGODB_URI || encodeURI('mongodb+srv://root:123456Ff@cluster0.zix0h.mongodb.net/Music'),
	{
		useNewUrlParser: true,
		useUnifiedTopology: true,
	},
	(error) => {
		if (error) {
			console.error('Please make sure Mongodb is installed and running!'); // eslint-disable-line no-console
			throw error;
		}
	}
);

let usedAccounts = []
let checkAccounts = []
let plays = 0
let nexts = 0
let time = 0

let imgs = {}
let streams = {}
let parents = {}
let webs = {}
let used = {}
let errs = []
let accounts = []

actions('gain', body => {
	const r = body.g
	if (!body.new) {
		plays = r.plays
		nexts = r.nexts
		time = r.time
	}
})

let gain = 0
let gain2 = 0
let gain3 = 0
let gain3temp = plays
let tempPlays = []
let tempCalc = plays
let serverPlays = {}
let waitForLoad = true

const calcRatio = {}
const resultRatio = {}

setTimeout(async () => {
	accounts = await getAccounts(false)
	checkAccounts = await getAccounts(true)
}, 1000);

setInterval(async () => {
	accounts = await getAccounts(false)
	checkAccounts = await getAccounts(true)
}, 20 * 1000);

setTimeout(() => {
	waitForLoad = false
}, 30 * 1000);

setInterval(async () => {
	gain = plays * 0.004 * 0.9 / ++time
	gain3 = (plays - gain3temp) * 0.004 * 0.9
	gain3temp = plays

	Object.values(streams).forEach(c => {
		if (!c.emit) {
			delete streams[c.uniqId]
			c.account && actions('noUseAccount?' + c.account)
			return
		}

		const freeze = c.infos && c.infos.time === 'PLAY' && c.freeze > 2
		if (freeze) {
			c.emit('Cdisconnect')
			return
		}

		if (c.infos.time === 'PLAY') {
			c.freeze = c.freeze ? c.freeze + 1 : 1;
		}
		else {
			c.freeze = 0;
		}
	})
}, 1000 * 60)

const timer = 5
setInterval(async () => {
	const calcul = plays - tempCalc
	tempCalc = plays
	const minutes = 2

	if (tempPlays.length === 60 / timer * minutes) {
		tempPlays.shift()
	}
	tempPlays.push(calcul)

	gain2 = tempPlays.reduce((a, b) => a + b, 0) * 0.004 * 0.9 / minutes
}, 1000 * timer)

const getNumbers = (id) => {
	let array = {}
	Object.keys(parents).forEach(key => { array[key] = 0 })
	const numbers = Object.values(streams).map(s => s.parentId).reduce((arr, s) => { arr[s] = arr[s] ? arr[s] + 1 : 1; return arr }, array)
	return id ? (numbers[id] || 0) : numbers
}

const maxs = () => {
	let pmax = {}
	Object.values(parents).forEach(p => pmax[p.uniqId] = Number(p.max))
	return pmax
}

const playing = (id = false) => {
	let p = {}
	Object.keys(parents).forEach(key => { p[key] = 0 })
	Object.values(streams).forEach(s => {
		if (s.infos && s.infos.countPlays && s.infos.countPlays >= 0) {
			p[s.parentId] = p[s.parentId] ? p[s.parentId] + 1 : 1
		}
	})
	return id ? p[id] : p
}

const countByPlayer = (list) => {
	let listToReturn

	try {
		listToReturn = list.reduce((prev, a) => {
			const playerKey = a.account.split(':')[0]
			const d = prev[playerKey]
			return { ...prev, [playerKey]: d ? d + 1 : 1 }
		}, {})
	}
	catch (e) { }

	return listToReturn
}

const getAllData = () => ({
	streams: Object.values(accounts).length,
	playing: Object.values(streams).filter(s => s.infos).length,
	used: Object.values(usedAccounts).length,
	webs: Object.values(webs).length,
	checkLeft: checkAccounts && checkAccounts.length,
	...countByPlayer(accounts),
	plays: plays * 0.004 * 0.9 + '€ (' + plays + ' / ' + nexts + ') ' + String(nexts / plays * 100).split('.')[0] + '%',
	gain: gain + '€/min ' + String(gain * 60 * 24).split('.')[0] + '€/jour ' + String(gain * 60 * 24 * 30).split('.')[0] + '€/mois',
	gain2: gain2 + '€/min ' + String(gain2 * 60 * 24).split('.')[0] + '€/jour ' + String(gain2 * 60 * 24 * 30).split('.')[0] + '€/mois',
	gain3: gain3 + '€/min ' + String(gain3 * 60 * 24).split('.')[0] + '€/jour ' + String(gain3 * 60 * 24 * 30).split('.')[0] + '€/mois',
	numbers: getNumbers(),
	numbersPlaying: playing(),
	resultRatio,
	errs,
	parentsMax: maxs(),
})

setInterval(() => {
	Object.keys(parents).forEach(key => {
		if (!calcRatio[key]) { calcRatio[key] = [] }

		calcRatio[key].push(serverPlays[key] || 0)
		serverPlays[key] = 0

		if (calcRatio[key].length > 60) { calcRatio[key].shift() }

		const calc = calcRatio[key].reduce((a, b) => a + b, 0) / playing(key)
		resultRatio[key] = Math.floor(calc * 10) / 10
	})
}, 1000);

let gettingAccount = false

const getAccountNotUsed = async (c, checkAccount, check) => {
	if (!check) {
		if (waitForLoad || gettingAccount) {
			await wait(3 * 1000)
			c.emit('loaded')
		}

		gettingAccount = true
	}

	const isCheck = /check/.test(c.parentId)
	const checkA = checkAccount && await findAccounts(checkAccount)

	// const appleAccounts = accounts.filter((f) => /^apple/.test(f.account))
	// const otherAccounts = accounts.filter((f) => !/^apple/.test(f.account))
	// const finalAccounts = rand(6, 1) % 6 === 0 && appleAccounts.length > 0 ? appleAccounts : otherAccounts
	const finalAccounts = accounts

	const Ra = (checkAccount ? checkA : isCheck ? checkAccounts : finalAccounts) || []

	usedAccounts = Object.values(streams).map((c) => c.account)

	const { account, country = 'fr' } = _.shuffle(Ra.filter((a) => !usedAccounts.includes(a.account)))[0] || {}
	// const account = await getAccount(isCheck)

	const accountAlreadyUsed = usedAccounts.includes(account)

	if (accountAlreadyUsed || !account) {
		await wait(3 * 1000)
		c.emit('loaded')
		// await getAccountNotUsed(c)
	} else {
		usedAccounts.push(account)
		c.infos.account = account
		c.country = country
		c.emit('canRun', account)
	}
}

const isWaiting = (props, client) => {
	const { parentId, streamId, max, checkAccount } = props

	const tooManyLoad = Object.values(streams).filter(s => s.parentId === parentId && s.infos && s.infos.other).length > 0
	const isMax = Object.values(streams).filter(s => s.parentId === parentId).length >= max

	if (checkAccount || /check/.test(client.parentId) || (!tooManyLoad && !isMax)) {
		client.uniqId = streamId
		client.parentId = parentId
		client.max = max
		client.infos = { streamId, parentId, account: 'loading', time: 'WAIT', other: true }
		client.timeout = setTimeout(() => {
			exit(client)
		}, 5 * 60 * 1000);
		streams[streamId] = client

		getAccountNotUsed(client, checkAccount)
	} else {
		client.emit('loaded')
	}
}

const exit = (client) => {
	if (streams[client.uniqId]) {
		usedAccounts = usedAccounts.filter(a => a !== client.account)
		delete streams[client.uniqId]
		const noMore = Object.values(streams).filter(s => s.parentId === client.parentId).length === 0
		if (noMore) { delete parents[client.parentId] }
	}

	if (webs[client.id]) {
		delete webs[client.id]
	}

	client.removeAllListeners()
	client.disconnect()
}

try {
	io.on('connection', client => {
		client.on('isWaiting', (props) => {
			isWaiting(props, client)
		})

		client.on('client', async ({ parentId, streamId, account, max, back }) => {
			client.uniqId = streamId
			client.parentId = parentId
			client.account = account
			client.max = max

			const alreadyPlaying = back && account ? { parentId, streamId, account, time: 'PLAY', ok: true } : {}
			client.infos = client.infos || alreadyPlaying

			streams[streamId] = client
			parents[parentId] = { uniqId: parentId, max }

			if (back) {
				usedAccounts.push(account)
				client.timeout = setTimeout(() => {
					exit(client)
				}, 5 * 60 * 1000);
			} else if (!/check/.test(parentId)) {
				gettingAccount = false
			}

			if (!/checklive/.test(parentId) && !back) {
				client.emit('mRun', client.country)
			}
		})

		client.on('outLog', e => {
			if (!errs[client.uniqId]) { errs[client.uniqId] = [] }

			if (!errs[client.uniqId][e]) { errs[client.uniqId][e] = 0 }
			else { errs[client.uniqId][e] = errs[client.uniqId][e] + 1 }
		})

		client.on('log', log => {
			console.log(log)
		})

		client.on('time', datas => {
			if (!client.infos) { return }

			if (isNaN(client.infos.time)) { client.infos.time = 0 }
			if (isNaN(client.infos.countPlays)) { client.infos.countPlays = 0 }

			if (time > client.infos.time) {
				client.pauseCount = 0

				client.infos = {
					...datas,
					ok: true,
					countPlays: client.infos.countPlays
				}

				if (!client.next && time > 30) {
					client.next = true
					client.infos.countPlays = client.infos.countPlays + 1
				}
			} else if (time < client.infos.time) {
				client.next = false
			} else {
				client.pauseCount = client.pauseCount + 1

				client.infos = {
					...datas,
					freeze: true,
					warn: client.pauseCount < 3,
					countPlays: client.infos.countPlays
				}
			}

			if (client.infos.countPlays > 1) {
				client.emit('outlog') // update to changeAlbum after test correct
			}
		})

		client.on('playerInfos', datas => {
			clearTimeout(client.timeout)

			if (datas.ok) {
				delete imgs[datas.streamId];
			}

			if (streams[datas.streamId]) {
				streams[datas.streamId].infos = { ...datas }
			}
			else {
				streams[datas.streamId] = { uniqId: datas.streamId, parentId: datas.parentId, account: datas.account, infos: { ...datas } }
			}
		})

		client.on('tidalError', ({ account }) => {
			const checklive = Object.values(streams).find(({ parentId }) => parentId === 'checklive')
			checklive && checklive.emit('mRun', { account })
		})

		client.on('errorcheck', ({ account }) => {
			check(account, true)
		})

		client.on('checkok', ({ account }) => {
			check(account, false)
		})

		client.on('del', ({ account }) => {
			del(account, true)
		})

		client.on('parent', async ({ parentId, connected, env, max }) => {
			console.log(parentId + ' => ' + client.id)
			if (env.CHECK) { checkAccounts = await getCheckAccounts() }

			if (!connected) {
				Object.values(streams).forEach(s => {
					if (s.parentId === parentId) { delete streams[s.id] }
				})
			}
			console.log(parentId, 'reconnected', connected)

			client.uniqId = parentId
			client.max = max
			client.env = env
			// client.inter = setInterval(() => {
			//   runLoop(client, { parentId, env, max })
			// }, 1000 * 60 + rand(1000 * 60));

			parents[parentId] = client
		})

		client.on('used', ({ streamId, account }) => {
			used[streamId] = account
			setTimeout(() => { delete used[streamId] }, 1000 * 60 * 10);
		});

		client.on('retryOk', ({ streamId }) => {
			delete imgs[streamId]

			Object.values(webs).forEach(w => {
				w.emit('endStream', streamId)
			})

			client.emit('retryOk')
		})

		client.on('screen', data => {
			imgs[data.streamId] = data
			Object.values(webs).forEach(c => {
				c.emit('stream', data)
			})
		})

		client.on('plays', ({ streamId, parentId, next, currentAlbum, countPlays }) => {
			plays++
			if (next) { nexts++ }

			serverPlays[parentId] = serverPlays[parentId] ? serverPlays[parentId] + 1 : 1
			if (streams[streamId] && streams[streamId].infos) {
				streams[streamId].infos.countPlays = countPlays
			}

			actions('listen?' + currentAlbum)
			actions('gain?' + plays + '/' + nexts + '/' + time, body => {
				if (body.new) {
					plays = 0
					nexts = 0
					time = 0
				}
			})
		})

		client.on('web', () => {
			webs[client.id] = client

			client.on('screenshot', streamId => {
				const stream = streams[streamId]
				if (stream && stream.emit) {
					stream.emit('screenshot')
				}
			})

			client.on('streamOn', streamId => {
				try {
					streams[streamId].emit('streamOn')
				}
				catch (e) {
					delete imgs[streamId]
					client.emit('endStream', streamId)
				}
			})

			client.on('streamOff', streamId => {
				try {
					streams[streamId].emit('streamOff')
				}
				catch (e) {
					delete imgs[streamId]
					client.emit('endStream', streamId)
				}
			})

			client.on('getAllData', () => {
				client.emit('allData', getAllData())
			})

			client.on('getPlayerInfos', () => {
				client.emit('playerInfos', Object.values(streams).map(s => s.infos))
			})

			client.on('clearScreen', () => {
				imgs = {}
			})

			client.on('clearErrs', () => {
				errs = []
			})

			client.on('runScript', ({ streamId, scriptText }) => {
				const stream = streams[streamId]
				stream && stream.emit('runScript', scriptText)
			})

			client.on('kill', async streamId => {
				const stream = streams[streamId]
				stream && stream.emit && stream.emit('forceOut')
			})

			client.on('killall', async parentId => {
				const parent = parents[parentId]
				parent && parent.emit('killall')
			})

			client.on('restart', async cid => {
				Object.values(streams).forEach(c => {
					if (!c.emit) {
						console.log(c.uniqId, c.account, c.infos)
						return
					}

					if (!cid || c.parentId === cid) {
						c.emit('forceOut')
					}
				})
			})

			client.emit('webActivate', client.id)

			Object.values(imgs).forEach(d => {
				client.emit('stream', d)
			})
		})

		client.on('over', (why) => {
			exit(client)
		})

		// client.on('reset', (why) => {
		// 	Object.values(streams).forEach(s => {
		// 		exit(s)
		// 	})
		// })

		client.on('disconnect', (why) => {
			exit(client)
		})

		setTimeout(() => {
			client.emit('activate', client.id)
		}, 5000);
	});
} catch (e) {
	console.log('ERROR', e)
}

http.listen(3000, () => {
	console.log("server started on port 3000");
});