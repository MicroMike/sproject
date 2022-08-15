/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import './App.css';
import io from 'socket.io-client';

var socket = io('http://216.158.239.199:3000');

interface IData {
	numbers?: any
	numbersPlaying?: any
	errs?: any
	resultRatio?: any
	parentsMax?: any
}

interface IStreamsInfo {
	account?: any
	time?: any
	streamId?: any
	freeze?: any
	other?: any
	out?: any
	ok?: any
	nope?: any
	warn?: any
	countPlays?: any
	code?: any
	parentId?: any
}

interface IStream {
	streamOn: any
	streamId: any
	img: any
	log: any
}

function App() {
	const [data, setData] = React.useState<IData>({})
	const [leftData, setLeftData] = React.useState<any>({})
	const [streams, setStreams] = React.useState<{ ok?: IStreamsInfo[], other?: IStreamsInfo[], freeze?: IStreamsInfo[] }>({})
	const [screenshots, setScreenshots] = React.useState<IStream[]>([])

	React.useEffect(() => {
		socket.on('activate', () => {
			socket.emit('web')
		})

		socket.on('webActivate', () => {
			setInterval(() => {
				socket.emit('getAllData')
				socket.emit('getPlayerInfos')
			}, 5 * 1000)
		})

		socket.on('allData', d => {
			const {
				numbers,
				numbersPlaying,
				errs,
				resultRatio,
				parentsMax,
				...leftData
			} = d

			setData({
				numbers,
				numbersPlaying,
				errs,
				resultRatio,
				parentsMax,
			})

			setLeftData(leftData)

			for (let key in errs) {
				const errors = errs[key]
				for (let error in errors) {
					const nbError = errors[error]
					// document.querySelector('#errs').insertAdjacentHTML('beforeend', `<span>${key} ${error} => ${nbError}</span>`)
				}
			}
		})

		socket.on('playerInfos', (streams: IStreamsInfo[]) => {
			const replace = (key: string, curr: any, prev: any) => {
				return curr[key] ? [...prev[key], curr] : prev[key]
			}

			const filter = streams.reduce((prev, curr) => {
				return {
					ok: replace('ok', curr, prev),
					other: replace('other', curr, prev),
					freeze: replace('freeze', curr, prev),
				}
			}, { ok: [], other: [], freeze: [] })

			setStreams(filter)
		})
	}, [])

	React.useEffect(() => {
		// console.log('data', data)
		// console.log('leftData', leftData)
		// console.log('streams', streams)
	}, [data, leftData, streams])

	const updateAccounts = () => {
		socket.emit('updateAccounts')
	}

	const screenshot = (id: string) => {
		socket.emit('screenshot', id)
	}

	const clearData = () => {
		socket.emit('clearData')
	}

	const restart = (id?: string) => {
		// document.querySelector('#errs').innerHTML = ''
		// document.querySelector('.screenshot').innerHTML = ''
		// document.querySelector('.players').innerHTML = ''
		// document.querySelector('.freezedPlayers').innerHTML = ''
		// document.querySelector('.others').innerHTML = ''
		// document.querySelector('.codes').innerHTML = ''
		socket.emit('restart', id)
	}

	const killall = (id?: string) => {
		socket.emit('killall', id)
	}

	const kill = (id = null) => {
		socket.emit('kill', id)
	}

	const stop = (id = null) => {
		socket.emit('stop', id)
	}

	const spotifyPause = () => {
		socket.emit('spotifyPause')
	}

	const clearScreen = () => {
		// document.querySelector('.screenshot').innerHTML = ''
		socket.emit('clearScreen')
	}

	const clearErrs = () => {
		// document.querySelector('#errs').innerHTML = ''
		socket.emit('clearErrs')
	}

	const check = () => {
		socket.emit('check')
	}

	const endCheck = () => {
		socket.emit('endCheck')
	}

	socket.on('endStream', streamId => {
		// const isDom = streamId && document.querySelector('#class' + streamId)
		// isDom && isDom.parentElement.remove()
	})

	const toggleBtn = (btn: any) => {
		socket.emit(btn.innerText, btn.className)
		btn.innerText = btn.innerText === 'streamOn' ? 'streamOff' : 'streamOn'
	}

	const runScript = (btn: any) => {
		// const scriptText = document.querySelector('#script' + btn.className).value
		// socket.emit('runScript', { streamId: btn.className, scriptText })
	}

	const runCode = (btn: any) => {
		// const scriptText = document.querySelector('#scriptCode' + btn.className).value
		// socket.emit('runCode', { id: btn.className, scriptText })
	}

	socket.on('clearStream', (delList) => {
		// document.querySelector('#del').innerHTML = delList
	})

	socket.on('delList', (delList) => {
		// document.querySelector('#del').innerHTML = delList
	})

	socket.on('stream', (props: IStream) => {
		setScreenshots((s) => [...s, props])
	})

	const displayPlays = (streams: IStreamsInfo[]) => {
		return (
			<>
				{streams.map(({ streamId, freeze, time, warn, parentId, account, countPlays }) => {
					const [player, login, pass] = account.split(':')
					return (
						<div id={`players-${streamId}`} className={freeze ? 'freeze' : ''}>
							<div style={{ width: `${time}%` }}></div>
							<span style={{ color: `${(warn && 'orange') || (freeze && 'red')}` }}>{`${parentId} - ${player}:${login} : ${time}`}</span> ({countPlays || ''})
							<button onClick={() => screenshot(streamId)}>V</button>
							<button onClick={() => kill(streamId)}>K</button>
						</div>
					)
				})}
			</>
		)
	}

	const displayByKey = (key: 'ok' | 'other' | 'freeze') => {
		return displayPlays(streams[key] || [])
	}

	const displayData = () => {
		return (
			<>
				{data.numbers && Object.entries(data.numbers).map(([k, v], i) => {
					const val = v
					const val2 = data.numbersPlaying[k]
					const ratio = data.resultRatio[k]

					return (
						<span style={{ color: ratio < 0.5 ? 'orange' : 'black' }}>
							{k} <br /> {'=>'} <br /> ({val}) <br /> {val2}/{data.parentsMax[k]} <br /> {'=>'} <br /> {ratio} <br />
							<button id={`R_${k}`} onClick={() => restart(k)}>R</button>
							<button id={`C_${k}`} onClick={() => killall(k)}>K</button>
						</span>
					)
				})}
			</>
		)
	}

	const displayInfos = () => {
		return (
			<>
				{Object.entries(leftData).map(([k, v]) => (
					<div>{`${k} => ${v}`}</div>
				))}
			</>
		)
	}

	return (
		<div className="App">
			<body>
				<div id="servers">{displayData()}</div>
				<div id="errs"></div>
				<div id="data">{displayInfos()}</div>
				<button onClick={() => restart()}>RESTART</button>
				<button onClick={clearScreen}>CLEAR SCREENSHOT</button>
				{/* <button onClick={clearErrs}>CLEAR ERRORS</button> */}
				{/* <button onClick={getData}>GET DATA</button> */}
				{/* <button onClick={updateAccounts}>UPDATE ACCOUNTS</button> */}
				<div id="del"></div>
				<div className="count"></div>
				<div style={{ display: 'flex' }}>
					<div id="players">
						<div className="count">{streams.ok?.length}</div>
						<div className="players">{displayByKey('ok')}</div>
					</div>
					<div id="freezedPlayers">
						<div className="count">{streams.freeze?.length}</div>
						<div className="freezedPlayers">{displayByKey('freeze')}</div>
					</div>
					<div id="others">
						<div className="count">{streams.other?.length}</div>
						<div className="others">{displayByKey('other')}</div>
					</div>
					<div>
						<div className="codes"></div>
					</div>
				</div>
				<div className="screenshot">
					{screenshots.map(({ log, streamId, img }) => {
						return (
							<>
								<h2>{log} :</h2>
								<img alt="screenshot" className={`screen-${streamId}`} src={`data:image/png;base64,${img}`} />
							</>
						)
					})}
				</div>
			</body>
		</div>
	);
}

export default App;
