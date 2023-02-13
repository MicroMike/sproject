const shell = require('shelljs')

const l = shell.exec('pidof node', { silent: true })
const nodePids = l.stdout.split(' ').map(p => String(Number(p)))

shell.exec('npm run s')

setInterval(() => {
	const list = shell.exec('pidof node', { silent: true })
	const pids = list.stdout.split(' ').map(p => String(Number(p))).filter((p) => !nodePids.includes(p))

	shell.exec(`kill -9 ${pids.join(' ')}`, { silent: true })

	shell.exec('node --trace-warnings server/index')
}, 1000 * 60 * 60 * 3)