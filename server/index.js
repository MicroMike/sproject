const {
	getCheckAccounts,
	getAccount,
	check,
	actions,
} = require('./mongo')
const routes = require('./routes')
const { wait } = require('./helpers')

// const fs = require('fs');
// const path = require("path");
const express = require("express");
const mongoose = require('mongoose');

const app = express(); // create express app
app.use(express.static("build"));
const http = require('http').Server(routes(app));

const io = require('socket.io')(http, {
	pingTimeout: 1000 * 60 * 5
});

// MongoDB Connection
mongoose.connect(
	process.env.MONGODB_URI || 'mongodb+srv://root:123456Ff@cluster0.zix0h.mongodb.net/Music?retryWrites=true&w=majority',
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
let accounts
let checkAccounts = null
let plays = 0
let nexts = 0
let time = 0

let imgs = {}
let streams = {}
let parents = {}
let webs = {}
let used = {}
let errs = []
let playerCount

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

const calcRatio = {}
const resultRatio = {}

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

const playerCountPlaying = () => {
	const arr = {}
	Object.values(streams).forEach(s => {
		const player = s.account && s.account.split(':')[0]
		arr[player] = arr[player] ? arr[player] + 1 : 1
	})
	return arr
}

const getAllData = () => ({
	accounts: accounts && accounts.length,
	streams: Object.values(streams).length,
	playing: Object.values(streams).filter(s => s.infos).length,
	used: Object.values(used).length,
	webs: Object.values(webs).length,
	checkLeft: checkAccounts && checkAccounts.length,
	...playerCountPlaying(),
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

const getAccountNotUsed = async (c) => {
	const isCheck = /check/.test(c.parentId)
	const account = await getAccount(isCheck)
	const accountAlreadyUsed = usedAccounts.includes(account) // Object.values(streams).find(s => s.account === account)

	if (accountAlreadyUsed) {
		console.log(account, 'already used')
		await wait(3 * 1000)
		await getAccountNotUsed(c)
	} else {
		usedAccounts.push(account)
		c.infos.account = account
		c.emit('canRun', account)
	}
}

const isWaiting = async (props, client) => {
	const { parentId, streamId, max } = props

	const tooManyLoad = Object.values(streams).filter(s => s.parentId === parentId && s.infos && s.infos.other).length > 0
	const isMax = Object.values(streams).filter(s => s.parentId === parentId).length >= max

	if (/check/.test(client.parentId) || (!tooManyLoad && !isMax)) {
		client.uniqId = streamId
		client.parentId = parentId
		client.max = max
		client.infos = { streamId, parentId, account: 'loading', time: 'WAIT', other: true }
		streams[streamId] = client

		getAccountNotUsed(client)
	} else {
		await wait(5 * 1000)
		await isWaiting(props, client)
	}
}

try {
	io.on('connect', client => {
		client.on('isWaiting', async (props) => {
			await isWaiting(props, client)
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

			if (!/checklive/.test(parentId) && !back) {
				client.emit('mRun')
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

		client.on('playerInfos', datas => {
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

		client.on('disconnect', why => {
			client.account && actions('noUseAccount?' + client.account)

			if (streams[client.uniqId]) {
				usedAccounts = usedAccounts.filter(a => a !== client.account)
				delete streams[client.uniqId]
				const noMore = Object.values(streams).filter(s => s.parentId === client.parentId).length === 0
				if (noMore) { delete parents[client.parentId] }
			}

			if (webs[client.id]) { delete webs[client.id] }

			client.removeAllListeners()
		})

		client.on('web', () => {
			webs[client.id] = client

			Object.values(imgs).forEach(d => {
				Object.values(webs).forEach(c => {
					c.emit('stream', d)
				})
			})

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
						c.emit('Cdisconnect')
					}
				})
			})

			client.emit('webActivate', client.id)
		})

		client.emit('activate', client.id)
	});
} catch (e) {
	console.log('ERROR', e)
}

app.listen(3000, () => {
	console.log("server started on port 3000");
});