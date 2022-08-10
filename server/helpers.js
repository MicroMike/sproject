const wait = (time) => new Promise(async (res, rej) => {
	setTimeout(async () => {
		res(true)
	}, time)
})

const rand = (max, min = 0) => {
	return Math.floor(Math.random() * Math.floor(max + 1 - min)) + min
}

module.exports = {
	rand,
	wait,
}