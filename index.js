import shell from 'shelljs'

const l = shell.exec('pidof node', { silent: true })
const nodePids = l.stdout.split(' ').map(p => String(Number(p)))

shell.exec('npm run s', { silent: true })

setInterval(() => {
	const list = shell.exec('pidof node', { silent: true })
	const pids = list.stdout.split(' ').map(p => String(Number(p))).filter((p) => !nodePids.includes(p))

	shell.exec(`kill -9 ${pids.join(' ')}`, { silent: true })

	shell.exec('npm run s', { silent: true })
}, 1000 * 60 * 60 * 24)