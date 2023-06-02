/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';
import { orderBy } from 'lodash';
import './App.css';

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
	const filterKey = useRef<{ k: string, asc: boolean }>({ k: '', asc: true })

	const setFilterKey = (fn: (fk: any) => { k: string, asc: boolean }) => {
		filterKey.current = fn(filterKey.current)
	}

	useEffect(() => {
		fetch('/accountsAll').then((res) => res).then((r) => r.json().then((w) => setAccounts(w.map(({ _id, __v, ...other }: any) => ({
			...other,
			player: other.account?.split(':')[0],
			login: other.account?.split(':')[1],
			pass: other.account?.split(':')[2],
		})))))
	}, [])

	useEffect(() => {
		setAccounts(orderBy(accounts, filterKey.current.k, filterKey.current.asc ? 'asc' : 'desc'))
	}, [filterKey])

	return <>
		<table border={1}>
			<tr>{EKeys.map((v: any) => <td>{v}<button onClick={() => setFilterKey((k) => ({ k: v, asc: k.k === v ? !k.asc : true }))}>{`>`}</button></td>
			)}</tr>
			{accounts.map((a: any) =>
				<tr>
					{Object.values(EKeys).map((v: any, index) =>
						<td style={{ backgroundColor: a['del'] ? 'red' : a['parent'] ? 'green' : 'none' }}>
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
