'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Controller } from '@/components/shared/controller'
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
import { Toggle } from '@/components/ui/toggle'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import {
	type AccountTokenLimits,
	parseTokenInput,
	resolveTokenLimits,
	TOKEN_LIMIT_PERIODS,
	type TokenLimitPeriod,
	type TokenUsage,
	tokenUsageRatio,
} from '@/modules/ai-usage/token-limit'

export type TokenLimitAccount = {
	id: number
	email: string
	role: string
	limits: AccountTokenLimits
	usage: TokenUsage
}

type Limits = Record<TokenLimitPeriod, number>
/** 계정 한 줄의 편집 값 — 저장된 값과 같으면 저장 버튼이 꺼진다. */
type AccountDraft = { unlimited: boolean; daily: number | null; monthly: number | null }

const PERIOD_TITLES: Record<TokenLimitPeriod, string> = { daily: '일 한도', monthly: '월 한도' }
const USAGE_TITLES: Record<TokenLimitPeriod, string> = {
	daily: '오늘 사용',
	monthly: '이번 달 사용',
}
const NUMBER = new Intl.NumberFormat('ko-KR')
const PERCENT = new Intl.NumberFormat('ko-KR', { style: 'percent', maximumFractionDigits: 0 })

const toDraft = (limits: AccountTokenLimits): AccountDraft => ({
	unlimited: Boolean(limits.unlimited),
	daily: limits.daily ?? null,
	monthly: limits.monthly ?? null,
})

const sameDraft = (a: AccountDraft, b: AccountDraft) =>
	a.unlimited === b.unlimited && a.daily === b.daily && a.monthly === b.monthly

/** Payload REST 응답에서 사람이 읽을 오류 문구를 꺼낸다. 성공이면 null. */
async function failureOf(response: Response | null): Promise<string | null> {
	if (response?.ok) return null
	const body = response
		? ((await response.json().catch(() => null)) as {
				errors?: { message?: string; data?: { errors?: { message?: string }[] } }[]
			} | null)
		: null
	const first = body?.errors?.[0]
	return first?.data?.errors?.[0]?.message ?? first?.message ?? '저장하지 못했습니다.'
}

const sendJson = (url: string, method: 'POST' | 'PATCH', body: unknown) =>
	fetch(url, {
		method,
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}).catch(() => null)

/**
 * 계정별 AI 토큰 한도 — 전체 기본값과 계정별 설정을 고친다(manager 이상).
 * 저장은 Payload REST로 바로 간다 — 필드 권한(manager 이상)과 검증을 Payload가 그대로 강제한다.
 * 🔑 저장 버튼은 바뀐 것이 있을 때만 켜진다 — 저장이 끝나 서버 값이 편집 값과 같아지면 다시 꺼진다.
 */
export function TokenLimitsEditor({
	defaults,
	accounts,
}: {
	/** 지금 걸리는 기본값(저장값, 없으면 LBS 기본값). */
	defaults: Limits
	accounts: TokenLimitAccount[]
}) {
	return (
		<div className="flex flex-col gap-4">
			<DefaultsPanel defaults={defaults} />
			<AccountsPanel defaults={defaults} accounts={accounts} />
		</div>
	)
}

function DefaultsPanel({ defaults }: { defaults: Limits }) {
	const router = useRouter()
	const [draft, setDraft] = useState<Record<TokenLimitPeriod, number | null>>(defaults)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const dirty = TOKEN_LIMIT_PERIODS.some((period) => draft[period] !== defaults[period])

	const save = async () => {
		setSaving(true)
		const failure = await failureOf(
			await sendJson('/api/globals/ai-token-limits', 'POST', draft),
		)
		setSaving(false)
		setError(failure)
		if (!failure) router.refresh()
	}

	return (
		<Controller.Root className="gap-3 px-3 pt-6 pb-3 lg:h-auto">
			<header className="flex flex-col gap-1 px-2">
				<Typography as="h1" size="2xl" weight="medium">
					AI 토큰 한도
				</Typography>
				<Typography size="sm" tone="muted">
					모든 계정의 기본값입니다(합계 토큰). 일 한도는 한국 시간 0시에 다시 시작합니다.
					저장한 적이 없으면 LBS 기본값(일 1만·월 10만)이 걸립니다.
				</Typography>
			</header>
			<div className="flex flex-col gap-1">
				{TOKEN_LIMIT_PERIODS.map((period) => (
					<Controller.Row key={period} label={PERIOD_TITLES[period]}>
						<TokenInput
							label={`기본 ${PERIOD_TITLES[period]} 토큰 수`}
							className="w-20"
							invalid={error !== null}
							value={draft[period]}
							onChange={(tokens) =>
								setDraft((current) => ({ ...current, [period]: tokens }))
							}
						/>
					</Controller.Row>
				))}
			</div>
			<div className="flex items-center justify-end gap-3 px-2">
				<FailureAnnouncement message={error} />
				<Button disabled={!dirty || saving} onClick={save}>
					기본값 저장
				</Button>
			</div>
		</Controller.Root>
	)
}

function AccountsPanel({
	defaults,
	accounts,
}: {
	defaults: Limits
	accounts: TokenLimitAccount[]
}) {
	const router = useRouter()
	const [drafts, setDrafts] = useState<Record<number, AccountDraft>>({})
	const [errors, setErrors] = useState<Record<number, string>>({})
	const [savingIds, setSavingIds] = useState<readonly number[]>([])
	const draftOf = (account: TokenLimitAccount) => drafts[account.id] ?? toDraft(account.limits)
	const dirtyIds = accounts
		.filter((account) => !sameDraft(draftOf(account), toDraft(account.limits)))
		.map((account) => account.id)

	const save = async (ids: readonly number[]) => {
		setSavingIds(ids)
		const results = await Promise.all(
			ids.map(async (id) => {
				const account = accounts.find((candidate) => candidate.id === id)
				const draft = account ? draftOf(account) : undefined
				const failure = draft
					? await failureOf(
							await sendJson(`/api/users/${id}`, 'PATCH', { tokenLimits: draft }),
						)
					: null
				return [id, failure] as const
			}),
		)
		setSavingIds([])
		setErrors((current) => {
			const next = { ...current }
			for (const [id, failure] of results) {
				if (failure) next[id] = failure
				else delete next[id]
			}
			return next
		})
		if (results.some(([, failure]) => !failure)) router.refresh()
	}

	return (
		<Controller.Root className="gap-3 px-3 pt-6 pb-3 lg:h-auto">
			<header className="flex items-start justify-between gap-3 px-2">
				<div className="flex flex-col gap-1">
					<Typography as="h2" size="xl" weight="medium">
						계정별 한도
					</Typography>
					<Typography size="sm" tone="muted">
						칸을 비우면 기본값을 따릅니다. 한도에 닿으면 새 AI 요청이 막힙니다.
					</Typography>
				</div>
				<Button
					disabled={dirtyIds.length === 0 || savingIds.length > 0}
					onClick={() => save(dirtyIds)}
				>
					모두 저장
				</Button>
			</header>
			{/* 🔑 열 폭은 내용이 아니라 화면 폭이 정한다(table-fixed + 비율) — 값을 고치거나 버튼이 켜져도 표가 흔들리지 않는다. */}
			<Table className="table-fixed">
				<colgroup>
					<col className="w-[24%]" />
					<col className="w-[16%]" />
					<col className="w-[16%]" />
					<col className="w-[34%]" />
					<col className="w-[10%]" />
				</colgroup>
				<TableHeader>
					<TableRow>
						<TableHead>계정</TableHead>
						{TOKEN_LIMIT_PERIODS.map((period) => (
							<TableHead key={period}>{USAGE_TITLES[period]}</TableHead>
						))}
						<TableHead className="pl-8">
							{/* 일·월 한도와 「한도 없음」은 성격이 같아 한 칸에 붙인다 — 머리글도 입력 폭에 맞춘다.
							    정렬은 왼쪽이다 — 오른쪽 정렬은 입력칸 안의 숫자에만 건다. */}
							<div className="flex items-center gap-1">
								{TOKEN_LIMIT_PERIODS.map((period) => (
									<span key={period} className="w-18">
										{PERIOD_TITLES[period]}
									</span>
								))}
							</div>
						</TableHead>
						<TableHead>
							<span className="sr-only">저장</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{accounts.map((account) => {
						const draft = draftOf(account)
						const limits = resolveTokenLimits(account.limits, defaults)
						const update = (patch: Partial<AccountDraft>) =>
							setDrafts((current) => ({
								...current,
								[account.id]: { ...draft, ...patch },
							}))
						return (
							<TableRow key={account.id}>
								<TableCell>
									{/* 한 줄로 자른다 — 긴 이메일이 줄을 바꾸면 그 행만 높아진다. */}
									<div className="flex min-w-0 flex-col">
										<span className="truncate text-sm" title={account.email}>
											{account.email}
										</span>
										<span className="text-muted-foreground text-xs">
											{account.role}
										</span>
									</div>
								</TableCell>
								{TOKEN_LIMIT_PERIODS.map((period) => (
									<TableCell key={period}>
										{/* 그래프는 저장된 값으로 그린다 — 입력 중인 값은 아직 적용되지 않았다. */}
										<UsageBar
											label={`${account.email} ${USAGE_TITLES[period]}`}
											used={account.usage[period]}
											limit={limits[period]}
										/>
									</TableCell>
								))}
								<TableCell className="pl-8">
									<div className="flex items-center gap-1">
										{TOKEN_LIMIT_PERIODS.map((period) => (
											<TokenInput
												key={period}
												label={`${account.email} ${PERIOD_TITLES[period]} 토큰 수`}
												className="w-18"
												invalid={Boolean(errors[account.id])}
												disabled={draft.unlimited}
												placeholder={NUMBER.format(defaults[period])}
												value={draft[period]}
												onChange={(tokens) => update({ [period]: tokens })}
											/>
										))}
										<Toggle
											size="sm"
											variant="outline"
											aria-label={`${account.email} 한도 없음`}
											pressed={draft.unlimited}
											onPressedChange={(unlimited) => update({ unlimited })}
										>
											한도 없음
										</Toggle>
									</div>
								</TableCell>
								<TableCell>
									<div className="flex items-center justify-end">
										<FailureAnnouncement message={errors[account.id] ?? null} />
										<Button
											size="sm"
											variant="outline"
											aria-label={`${account.email} 한도 저장`}
											disabled={
												!dirtyIds.includes(account.id) ||
												savingIds.includes(account.id)
											}
											onClick={() => save([account.id])}
										>
											저장
										</Button>
									</div>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</Controller.Root>
	)
}

/**
 * 저장 실패 안내 — 보조기기에만 읽힌다. 화면에 글자를 띄우면 그 행·카드의 폭과 높이가 바뀐다.
 * 눈에 보이는 신호는 입력칸의 빨간 테두리(`aria-invalid`)와, 켜진 채 남은 저장 버튼이다.
 */
function FailureAnnouncement({ message }: { message: string | null }) {
	return (
		<span role="alert" className="sr-only">
			{message}
		</span>
	)
}

const formatTokens = (value: number | null) => (value === null ? '' : NUMBER.format(value))

/**
 * 토큰 수 입력 — 콤마로 묶어 오른쪽 정렬한다.
 * 🔑 입력 중에는 무엇이든 칠 수 있다. 반영은 Enter나 칸을 벗어날 때 한 번이고, 그때 유효하지 않으면
 *    반영하지 않고 직전 값으로 되돌린다(`parseTokenInput`). 반영 전의 글자는 「바뀐 것」으로 치지 않는다.
 * 🔑 `type="number"`를 쓰지 않는다 — 콤마를 못 넣고, 1씩 오르내리는 화살표는 토큰 한도에 뜻이 없다.
 */
function TokenInput({
	label,
	value,
	onChange,
	className,
	disabled,
	placeholder,
	invalid,
}: {
	label: string
	value: number | null
	onChange: (tokens: number | null) => void
	className?: string
	disabled?: boolean
	placeholder?: string
	/** 저장에 실패했다 — 글자를 띄우지 않고 테두리로만 알린다(배치가 흔들리지 않게). */
	invalid?: boolean
}) {
	const [text, setText] = useState(() => formatTokens(value))
	// 바깥 값이 바뀌면(저장 뒤 새로고침 등) 칸의 글자도 따라간다 — effect 대신 렌더 중에 맞춘다.
	const [shown, setShown] = useState(value)
	if (shown !== value) {
		setShown(value)
		setText(formatTokens(value))
	}
	const commit = () => {
		const tokens = parseTokenInput(text)
		if (tokens === undefined) {
			setText(formatTokens(value))
			return
		}
		setText(formatTokens(tokens))
		if (tokens !== value) onChange(tokens)
	}
	return (
		<Input
			type="text"
			inputMode="numeric"
			aria-label={label}
			aria-invalid={invalid || undefined}
			disabled={disabled}
			placeholder={placeholder}
			className={cn('h-7 px-1.5 text-right text-xs tabular-nums', className)}
			value={text}
			onChange={(event) => setText(event.target.value)}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === 'Enter') commit()
			}}
		/>
	)
}

/**
 * 사용 비율 막대 — 퍼센트를 막대 안에 쓴다. 숫자는 title과 보조기기 문구로 준다.
 * 🔑 퍼센트는 100%를 넘으면 넘는 그대로 쓴다(진행 중 요청이 한도를 조금 넘길 수 있다). 채움은 100%에서 멈춘다.
 */
function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
	const ratio = tokenUsageRatio(used, limit)
	const detail =
		limit === null
			? `${NUMBER.format(used)} 토큰 사용 · 한도 없음`
			: `${NUMBER.format(used)} / ${NUMBER.format(limit)} 토큰`
	return (
		<div
			role="progressbar"
			aria-label={label}
			aria-valuetext={detail}
			{...(ratio === null
				? {}
				: {
						'aria-valuemin': 0,
						'aria-valuemax': 100,
						'aria-valuenow': Math.round(ratio * 100),
					})}
			title={detail}
			className="relative h-4 w-full max-w-32 overflow-hidden rounded-md bg-muted"
		>
			{ratio !== null && (
				<div
					aria-hidden="true"
					className={cn(
						'absolute inset-y-0 left-0',
						ratio >= 1 ? 'bg-destructive/40' : 'bg-primary/30',
					)}
					style={{ width: `${ratio * 100}%` }}
				/>
			)}
			<span
				aria-hidden="true"
				className="relative flex h-full items-center justify-center text-xs tabular-nums"
			>
				{limit === null ? '한도 없음' : PERCENT.format(used / limit)}
			</span>
		</div>
	)
}
