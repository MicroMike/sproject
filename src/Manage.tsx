/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
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
	const [checkedAccounts, setCheckedAccounts] = useState<any[]>([])
	const [filterKey, setFilterKey] = useState<{ k: string, asc: boolean }>({ k: '', asc: true })

	useEffect(() => {
		fetch('/accounts').then((res) => res).then((r) => r.json().then((w) => setAccounts(w.map(({ _id, __v, ...other }: any) => ({
			...other,
			player: other.account?.split(':')[0],
			login: other.account?.split(':')[1],
			pass: other.account?.split(':')[2],
		})))))

		fetch('/accounts?check=true').then((res) => res).then((r) => r.json().then((w) => setCheckedAccounts(w.map(({ _id, __v, ...other }: any) => ({
			...other,
			player: other.account?.split(':')[0],
			login: other.account?.split(':')[1],
			pass: other.account?.split(':')[2],
		})))))
	}, [])

	return <>
		<table border={1}>
			<tr>{EKeys.map((v: any) => <td>{v}<button onClick={() => setFilterKey((k) => ({ k: v, asc: k.k === v ? !k.asc : true }))}>{`>`}</button></td>
			)}</tr>
			{orderBy({ ...accounts, ...checkedAccounts }, filterKey.k, filterKey.asc ? 'asc' : 'desc').map((a: any) =>
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
