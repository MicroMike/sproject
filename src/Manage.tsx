/* eslint-disable @typescript-eslint/no-unused-vars */
import { createRef, useEffect, useRef, useState } from 'react';
import { orderBy } from 'lodash';
import './App.css';
import { io } from 'socket.io-client';

const EKeys = [
	'player',
	"login",
	"pass",
	"check",
	"del",
	"pause",
	"parent",
	"used",
	"used2",
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

const update = (account: string, key: string, value: string) => {
	console.log(`http://149.102.132.27:3000/update?${account}/${key}/${value}`)
	fetch(`http://149.102.132.27:3000/update?${account}/${key}/${value}`)
}

const Manage = () => {
	const [accounts, setAccounts] = useState<any[]>([])
	const [filterKey, setFilterKey] = useState<{ k: string, asc: boolean }>({ k: '', asc: true })
	const [searchValue, setSearchValue] = useState<{ [K: string]: any }>([])
	const [socket, setSocket] = useState<any>()

	useEffect(() => {
		fetch('/accountsAll').then((res) => res).then((r) => r.json().then((w) => setAccounts(w.map(({ _id, __v, ...other }: any) => ({
			...other,
			player: other.account?.split(':')[0],
			login: other.account?.split(':')[1],
			pass: other.account?.split(':')[2],
		})))))

		const socketio = io('http://149.102.132.27:3001');
		setSocket(socketio)
	}, [])

	useEffect(() => {
		if (!socket) return
		console.log('socket connected')
	}, [socket])

	useEffect(() => {
		setAccounts(orderBy(accounts, filterKey.k, filterKey.asc ? 'asc' : 'desc'))
	}, [filterKey.k, filterKey.asc])

	const reg = (val: string, compareTo: any) => {
		const regexp = new RegExp(val, 'i')
		return !val || regexp.test(JSON.stringify(compareTo))
	}

	console.log('searchValue', Object.values(searchValue).length)

	return <>
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
			{(accounts).filter((a) => Object.entries(searchValue).filter(([k, searchVal]: any) => reg(searchVal, a[k])).length === Object.values(searchValue).length).map((a: any) =>
				<tr>
					{Object.values(EKeys).map((v: any, index) =>
						<td>
							{index < 3 && a[v]}
							{index >= 3 && <DoubleBtn label={!a[v] || a[v] === false ? 'false' : 'true'} callback={() => update(a.account, v, (!a[v]).toString())} />}
						</td>
					)}
				</tr>
			)}
		</table>
	</>
}

export default Manage;
