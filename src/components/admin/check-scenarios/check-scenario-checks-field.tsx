'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { fetchAvailableScenarioChecks } from '@/features/quality-rule/services/list-available-scenario-checks.client'
import type { AvailableScenarioCheck } from '@/features/quality-rule/services/list-available-scenario-checks.service'

const HEAD_CLASS = 'align-top text-sm font-semibold text-muted-foreground'
const CELL_CLASS = 'align-top'

export const CheckScenarioChecksField: JSONFieldClientComponent = ({ path }) => {
	const { disabled, errorMessage, setValue, showError, value } = useField<unknown>({ path })
	const checkKeys = Array.isArray(value)
		? value.filter((key): key is string => typeof key === 'string')
		: []
	const [available, setAvailable] = useState<AvailableScenarioCheck[]>([])
	const [query, setQuery] = useState('')
	const [loadError, setLoadError] = useState('')

	useEffect(() => {
		const controller = new AbortController()
		void fetchAvailableScenarioChecks(controller.signal)
			.then(setAvailable)
			.catch((error: unknown) => {
				if (!controller.signal.aborted) {
					setLoadError(
						error instanceof Error
							? error.message
							: 'Check 목록을 불러오지 못했습니다.',
					)
				}
			})
		return () => controller.abort()
	}, [])

	const byKey = new Map(available.map((check) => [check.key, check]))
	const selected = checkKeys.map((key) => byKey.get(key) ?? { key, title: key })
	const selectedKeys = new Set(checkKeys)
	const normalizedQuery = query.trim().toLowerCase()
	const candidates = available.filter(
		(check) =>
			!selectedKeys.has(check.key) &&
			(!normalizedQuery ||
				check.key.toLowerCase().includes(normalizedQuery) ||
				check.title.toLowerCase().includes(normalizedQuery)),
	)

	const update = (next: string[]) => setValue(next)
	const move = (index: number, offset: -1 | 1) => {
		const next = [...checkKeys]
		const target = index + offset
		;[next[index], next[target]] = [next[target], next[index]]
		update(next)
	}

	return (
		<div className="field-type json mb-5">
			<FieldLabel htmlFor={`${path}-search`} label="포함된 Check" path={path} required />
			<FieldError message={errorMessage} path={path} showError={showError} />
			{loadError ? <p role="alert">{loadError}</p> : null}

			<Table aria-label="포함된 Check" className="min-w-[760px] border-collapse">
				<TableHeader>
					<TableRow>
						<TableHead scope="col" className={HEAD_CLASS}>
							순서
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							Check
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							실행 방식
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							관리
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{selected.length > 0 ? (
						selected.map((check, index) => (
							<TableRow key={check.key}>
								<TableCell className={CELL_CLASS}>{index + 1}</TableCell>
								<TableCell className={CELL_CLASS}>
									<span className="flex flex-col gap-0.5 whitespace-normal">
										<strong>{check.title}</strong>
										<code>{check.key}</code>
									</span>
								</TableCell>
								<TableCell className={CELL_CLASS}>
									{check.executor ? (
										<Badge variant="outline">{check.executor}</Badge>
									) : (
										'-'
									)}
								</TableCell>
								<TableCell className={CELL_CLASS}>
									<span className="flex gap-1.25">
										<Button
											type="button"
											variant="outline"
											size="icon-xs"
											disabled={disabled || index === 0}
											onClick={() => move(index, -1)}
											aria-label={`${check.title} 위로 이동`}
										>
											↑
										</Button>
										<Button
											type="button"
											variant="outline"
											size="icon-xs"
											disabled={disabled || index === selected.length - 1}
											onClick={() => move(index, 1)}
											aria-label={`${check.title} 아래로 이동`}
										>
											↓
										</Button>
										<Button
											type="button"
											variant="muted"
											size="xs"
											disabled={disabled}
											onClick={() =>
												update(checkKeys.filter((key) => key !== check.key))
											}
										>
											제외
										</Button>
									</span>
								</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={4} className={CELL_CLASS}>
								아직 포함된 Check가 없습니다.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			<label htmlFor={`${path}-search`} className="mt-5 block">
				Check 검색
			</label>
			<Input
				id={`${path}-search`}
				type="search"
				value={query}
				onChange={(event) => setQuery(event.currentTarget.value)}
				disabled={disabled}
				className="mb-2.5 w-full"
			/>
			<Table aria-label="추가 가능한 Check" className="min-w-[760px] border-collapse">
				<TableHeader>
					<TableRow>
						<TableHead scope="col" className={HEAD_CLASS}>
							Check
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							실행 방식
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							관리
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{candidates.length > 0 ? (
						candidates.map((check) => (
							<TableRow key={check.key}>
								<TableCell className={CELL_CLASS}>
									<span className="flex flex-col gap-0.5 whitespace-normal">
										<strong>{check.title}</strong>
										<code>{check.key}</code>
									</span>
								</TableCell>
								<TableCell className={CELL_CLASS}>
									{check.executor ? (
										<Badge variant="outline">{check.executor}</Badge>
									) : (
										'-'
									)}
								</TableCell>
								<TableCell className={CELL_CLASS}>
									<Button
										type="button"
										variant="muted"
										size="xs"
										disabled={disabled}
										onClick={() => update([...checkKeys, check.key])}
									>
										포함
									</Button>
								</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={3} className={CELL_CLASS}>
								추가 가능한 Check가 없습니다.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
			<FieldDescription
				description="발행된 검수 규칙만 선택할 수 있으며 위에서부터 실행 순서를 결정합니다."
				path={path}
			/>
		</div>
	)
}
