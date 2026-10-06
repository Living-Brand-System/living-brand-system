'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Controller } from '@/components/shared/controller'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Typography } from '@/components/ui/typography'
import {
	type AccountTokenLimit,
	type DefaultTokenLimit,
	resolveTokenLimit,
	TOKEN_LIMIT_PERIODS,
	type TokenLimitPeriod,
	type TokenUsage,
} from '@/modules/ai-usage/token-limit'

type Limits<T> = Record<TokenLimitPeriod, T>

export type TokenLimitAccount = {
	id: number
	email: string
	role: string
	limits: Limits<AccountTokenLimit>
	usage: TokenUsage
}

const PERIOD_TITLES: Record<TokenLimitPeriod, string> = { daily: '일 한도', monthly: '월 한도' }
const NUMBER = new Intl.NumberFormat('ko-KR')
const MODE_LABELS = { default: '기본값 따름', unlimited: '제한 없음', limit: '한도 지정' } as const

const formatLimit = (limit: number | null) => (limit === null ? '제한 없음' : NUMBER.format(limit))

/** Payload REST 응답에서 사람이 읽을 오류 문구를 꺼낸다. */
async function failureMessage(response: Response) {
	const body = (await response.json().catch(() => null)) as {
		errors?: { message?: string; data?: { errors?: { message?: string }[] } }[]
	} | null
	const first = body?.errors?.[0]
	return first?.data?.errors?.[0]?.message ?? first?.message ?? '저장하지 못했습니다.'
}

/**
 * 계정별 AI 토큰 한도 — 전체 기본값과 계정별 설정을 고친다(manager 이상).
 * 저장은 Payload REST로 바로 간다 — 필드 권한(manager 이상)과 검증을 Payload가 그대로 강제한다.
 */
export function TokenLimitsEditor({
	defaults,
	accounts,
}: {
	defaults: Limits<DefaultTokenLimit>
	accounts: TokenLimitAccount[]
}) {
	return (
		<div className="flex flex-col gap-4">
			<DefaultsPanel defaults={defaults} />
			<Controller.Root className="gap-3 px-3 pt-6 pb-3 lg:h-auto">
				<header className="flex flex-col gap-1 px-2">
					<Typography as="h2" size="xl" weight="medium">
						계정별 한도
					</Typography>
					<Typography size="sm" tone="muted">
						사용량은 합계 토큰이고, 일은 한국 시간 0시에 다시 시작합니다. 한도에 닿으면
						새 AI 요청이 막힙니다.
					</Typography>
				</header>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>계정</TableHead>
							<TableHead>오늘 사용 / 일 한도</TableHead>
							<TableHead>이번 달 사용 / 월 한도</TableHead>
							<TableHead>일 한도 설정</TableHead>
							<TableHead>월 한도 설정</TableHead>
							<TableHead>
								<span className="sr-only">저장</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{accounts.map((account) => (
							<AccountRow key={account.id} account={account} defaults={defaults} />
						))}
					</TableBody>
				</Table>
			</Controller.Root>
		</div>
	)
}

function DefaultsPanel({ defaults }: { defaults: Limits<DefaultTokenLimit> }) {
	const router = useRouter()
	const [draft, setDraft] = useState(defaults)
	const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null)
	const [saving, setSaving] = useState(false)

	const save = async () => {
		setSaving(true)
		setStatus(null)
		const response = await fetch('/api/globals/ai-token-limits', {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(draft),
		}).catch(() => null)
		setSaving(false)
		if (!response?.ok) {
			setStatus({
				error: true,
				text: response ? await failureMessage(response) : '저장하지 못했습니다.',
			})
			return
		}
		setStatus({ error: false, text: '저장했습니다.' })
		router.refresh()
	}

	return (
		<Controller.Root className="gap-3 px-3 pt-6 pb-3 lg:h-auto">
			<header className="flex flex-col gap-1 px-2">
				<Typography as="h1" size="2xl" weight="medium">
					AI 토큰 한도
				</Typography>
				<Typography size="sm" tone="muted">
					전체 기본값입니다. 계정에서 따로 정하지 않으면 이 값을 따릅니다.
				</Typography>
			</header>
			<div className="flex flex-col gap-1">
				{TOKEN_LIMIT_PERIODS.map((period) => (
					<Controller.Row key={period} label={PERIOD_TITLES[period]}>
						<LimitInput
							label={`기본 ${PERIOD_TITLES[period]}`}
							modes={['unlimited', 'limit']}
							value={draft[period]}
							onChange={(next) =>
								setDraft((current) => ({ ...current, [period]: next }))
							}
						/>
					</Controller.Row>
				))}
			</div>
			<div className="flex items-center justify-end gap-3 px-2">
				{status && (
					<Typography
						role="status"
						size="sm"
						tone={status.error ? 'destructive' : 'muted'}
					>
						{status.text}
					</Typography>
				)}
				<Button disabled={saving} onClick={save}>
					{saving ? '저장 중…' : '기본값 저장'}
				</Button>
			</div>
		</Controller.Root>
	)
}

function AccountRow({
	account,
	defaults,
}: {
	account: TokenLimitAccount
	defaults: Limits<DefaultTokenLimit>
}) {
	const router = useRouter()
	const [draft, setDraft] = useState(account.limits)
	const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null)
	const [saving, setSaving] = useState(false)

	const save = async () => {
		setSaving(true)
		setStatus(null)
		const response = await fetch(`/api/users/${account.id}`, {
			method: 'PATCH',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tokenLimits: draft }),
		}).catch(() => null)
		setSaving(false)
		if (!response?.ok) {
			setStatus({
				error: true,
				text: response ? await failureMessage(response) : '저장하지 못했습니다.',
			})
			return
		}
		setStatus({ error: false, text: '저장했습니다.' })
		router.refresh()
	}

	return (
		<TableRow>
			<TableCell>
				<div className="flex flex-col">
					<span className="text-sm">{account.email}</span>
					<span className="text-muted-foreground text-xs">{account.role}</span>
				</div>
			</TableCell>
			{TOKEN_LIMIT_PERIODS.map((period) => (
				<TableCell key={period} className="text-sm tabular-nums">
					{NUMBER.format(account.usage[period])} /{' '}
					{formatLimit(resolveTokenLimit(account.limits[period], defaults[period]))}
				</TableCell>
			))}
			{TOKEN_LIMIT_PERIODS.map((period) => (
				<TableCell key={period}>
					<LimitInput
						label={`${account.email} ${PERIOD_TITLES[period]}`}
						modes={['default', 'unlimited', 'limit']}
						value={draft[period]}
						onChange={(next) => setDraft((current) => ({ ...current, [period]: next }))}
					/>
				</TableCell>
			))}
			<TableCell>
				<div className="flex items-center justify-end gap-2">
					{status && (
						<Typography
							role="status"
							size="xs"
							tone={status.error ? 'destructive' : 'muted'}
						>
							{status.text}
						</Typography>
					)}
					<Button
						size="sm"
						variant="outline"
						aria-label={`${account.email} 한도 저장`}
						disabled={saving}
						onClick={save}
					>
						저장
					</Button>
				</div>
			</TableCell>
		</TableRow>
	)
}

/** 방식(기본값 따름·제한 없음·한도 지정)과, 한도 지정일 때만 토큰 수. */
function LimitInput<Mode extends keyof typeof MODE_LABELS>({
	label,
	modes,
	value,
	onChange,
}: {
	label: string
	modes: readonly Mode[]
	value: { mode?: string | null; tokens?: number | null }
	onChange: (next: { mode: Mode; tokens: number | null }) => void
}) {
	const mode = (modes.includes(value.mode as Mode) ? value.mode : modes[0]) as Mode
	return (
		<div className="flex items-center gap-2">
			<Select
				value={mode}
				onValueChange={(next) =>
					onChange({ mode: next as Mode, tokens: value.tokens ?? null })
				}
			>
				<SelectTrigger size="sm" aria-label={`${label} 방식`}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{modes.map((option) => (
						<SelectItem key={option} value={option}>
							{MODE_LABELS[option]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{mode === 'limit' && (
				<Input
					type="number"
					min={1}
					step={1}
					inputMode="numeric"
					aria-label={`${label} 토큰 수`}
					className="h-7 w-32"
					value={value.tokens ?? ''}
					onChange={(event) =>
						onChange({
							mode,
							tokens: event.target.value === '' ? null : Number(event.target.value),
						})
					}
				/>
			)}
		</div>
	)
}
