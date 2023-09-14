/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { orderBy } from 'lodash';
import './App.css';
import io from 'socket.io-client';
import _ from 'lodash';

const EKeys = [
	"parent",
	'player',
	"login",
	"pass",
	"del",
	"pause",
	"check",
	"parentId",
	"remove",
	"date",
	// "used",
	// "used2",
]

const EBtnKeys = [
	"parent",
	"del",
	"check",
	"pause",
	"remove",
]

const ECopyKeys = [
	"login",
	"pass",
]

const DoubleBtn = ({ label, callback }: any) => {
	const [active, setActive] = useState(false)

	return <>
		{!active && <button onClick={() => setActive(true)} >{label}</button>}
		{active && <button onClick={() => {
			callback?.()
			setActive(false)
		}}>Sure ?</button>}
	</>
}

const update = (account: string, key: string, value: string, cb: () => void) => {
	console.log(`http://149.102.132.27:3000/update?${account}/${key}/${value}`)
	fetch(`http://149.102.132.27:3000/update?${account}/${key}/${value}`).then(cb)
}

const Manage = () => {
	const [accounts, setAccounts] = useState<any>([])
	const [filterKey, setFilterKey] = useState<{ k: string, asc: boolean }>({ k: '', asc: true })
	const [searchValue, setSearchValue] = useState<{ [K: string]: any }>({ del: 'false' })
	const [socket, setSocket] = useState<any>()
	const [copy, setCopy] = useState(false)

	const setData = () => {
		fetch('/accountsAll').then((res) => res).then((r) => r.json().then((w) => setAccounts(
			_.keyBy(w.map(({ _id, __v, ...other }: any) => ({
				...other,
				player: other.account?.split(':')[0],
				login: other.account?.split(':')[1],
				pass: other.account?.split(':')[2],
			})), 'account')
		)))
	}

	useEffect(() => {
		setData()
		const socketio = io('http://149.102.132.27/manage:3001');
		setSocket(socketio)
	}, [])

	useEffect(() => {
		if (!socket) return
		console.log('socket connected')
	}, [socket])

	useEffect(() => {
		setAccounts(_.keyBy(orderBy(accounts, filterKey.k, filterKey.asc ? 'asc' : 'desc'), 'account'))
	}, [filterKey.k, filterKey.asc])

	const reg = (val: string, compareTo: any) => {
		const regexp = new RegExp(val, 'i')
		return !val || regexp.test(JSON.stringify(compareTo))
	}

	return <>
		{copy && <div style={{
			position: 'absolute',
			width: '100px',
			height: '25px',
			backgroundColor: 'green',
			left: '50%',
			top: '10px',
			padding: '5px',
			borderRadius: '5px',
			color: 'white',
			lineHeight: '25px',
			textAlign: 'center',
		}}>Copied !</div>}
		<table border={1}>
			<tr>
				{EKeys.map((v: string) =>
					<td>
						{v}
						<input onChange={(e) => setSearchValue((searchVals) => ({ ...searchVals, [v]: e.target.value }))} />
						<button onClick={() => setFilterKey((k) => ({ k: v, asc: k.k === v ? !k.asc : true }))}>{`>`}</button>
					</td>
				)}
			</tr>
			{Object.values(accounts).filter((a: any) => Object.entries(searchValue).filter(([k, searchVal]: any) => reg(searchVal, a[k])).length === Object.values(searchValue).length).map((a: any) =>
				<tr>
					{Object.values(EKeys).map((v, index) =>
						<td key={`${v}-${a.account}`} style={{ backgroundColor: v === 'del' && a[v] ? 'red' : /pause|check/.test(v) && a[v] ? 'orange' : v === 'parent' && a[v] ? 'blue' : 'none' }}>
							<span id={`${v}-${index}`} onClick={() => {
								if (!ECopyKeys.includes(v)) return

								const copyText = document.getElementById(`${v}-${index}`)
								navigator.clipboard.writeText(copyText?.textContent || '')
								setCopy(true)
								setTimeout(() => {
									setCopy(false)
								}, 2000);
							}}>
								{!EBtnKeys.includes(v) && <>
									<input id={`${v}-${index}-input`} value={a[v]} onChange={(e) => setAccounts((acc: any) => {
										const newAcc: any = _.clone(acc)
										newAcc[a.account][v] = e.target.value || undefined
										return newAcc
									})} />
									<DoubleBtn label="Up" callback={() => {
										const value = accounts[a.account][v]
										value && update(a.account, v, value, setData)
									}} /></>}
							</span>
							{EBtnKeys.includes(v) && <DoubleBtn label={!a[v] || a[v] === false ? 'false' : 'true'} callback={() => update(a.account, v, (!a[v]).toString(), setData)} />}
						</td>
					)}
				</tr>
			)}
		</table >
	</>
}

export default Manage;
