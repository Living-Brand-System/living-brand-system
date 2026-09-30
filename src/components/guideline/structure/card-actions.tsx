'use client'

import { ColorPalette, Copy, WarningAlt } from '@carbon/icons-react'
import { type ComponentProps, Fragment, type ReactNode, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import styles from './card-actions.module.css'
import { GuidelineSelection, type GuidelineSelectionProps } from './selection'

export type GuidelineCardToggle = GuidelineSelectionProps & { kind: 'toggle' }

export type GuidelineCardBreadcrumb = {
	kind: 'breadcrumb'
	label: string
	items: readonly { id: string; label: string }[]
	onNavigate: (id: string) => void
}

const ON_OFF_OPTIONS = [
	{ value: 'off', label: 'Off' },
	{ value: 'on', label: 'On' },
] as const

/** 카드마다 Off로 시작하며, 라벨·값 변환은 공통으로 관리합니다. */
export function useGuidelineOnOff(label: string) {
	const [enabled, setEnabled] = useState(false)
	const toggle: GuidelineCardToggle = {
		kind: 'toggle',
		label,
		value: enabled ? 'on' : 'off',
		options: ON_OFF_OPTIONS,
		onValueChange: (value) => setEnabled(value === 'on'),
	}
	return { enabled, toggle }
}

type IconAction = { label: string; icon: ReactNode }
export type GuidelineColorAction = {
	kind: 'color'
	label: string
	value: string
	presets: readonly { label: string; value: string }[]
	onValueChange: (value: string) => void
}
export type GuidelineEndAction =
	| (IconAction & { kind: 'button'; onClick: () => void; disabled?: boolean })
	| (IconAction & { kind: 'link'; href: string; download?: string | boolean })
	| { kind: 'copy'; label: string; value: string }
	| GuidelineColorAction

type EndGroup = {
	kind: 'group'
	label: string
	actions: readonly (GuidelineEndAction & { id: string })[]
}
export type GuidelineCardAction =
	| GuidelineCardToggle
	| GuidelineCardBreadcrumb
	| GuidelineEndAction
	| EndGroup
	| (IconAction & { kind: 'badge'; variant?: ComponentProps<typeof Badge>['variant'] })

type Props = {
	start?: Extract<GuidelineCardAction, { kind: 'badge' }>
	center?: GuidelineCardToggle | GuidelineCardBreadcrumb
	end?: GuidelineEndAction | EndGroup
}

/** CMS 카드의 상태·다운로드와 디스플레이 고유 조작을 한 액션 레이어에 합칩니다. */
export type GuidelineDisplayActions = Pick<Props, 'start' | 'end'>

export function combineEndActions(base: Props['end'], extra: Props['end']): Props['end'] {
	if (!base) return extra
	if (!extra) return base
	return {
		kind: 'group',
		label: '카드 액션',
		actions: [base, extra].flatMap((action, index) =>
			action.kind === 'group'
				? action.actions.map((item) => ({ ...item, id: `${index}-${item.id}` }))
				: [{ ...action, id: String(index) }],
		),
	}
}

/** 카드 전체와 개별 항목의 복사 결과를 같은 어휘로 전달합니다. */
export function useGuidelineCopy() {
	const [status, setStatus] = useState<'idle' | 'pending' | 'copied' | 'failed'>('idle')
	useEffect(() => {
		if (status !== 'copied') return
		const timer = setTimeout(() => setStatus('idle'), 2000)
		return () => clearTimeout(timer)
	}, [status])
	const busy = useRef(false)
	const copy = async (value: string) => {
		if (busy.current) return
		busy.current = true
		setStatus('pending')
		try {
			await navigator.clipboard.writeText(value)
			setStatus('copied')
		} catch {
			setStatus('failed')
		} finally {
			busy.current = false
		}
	}
	const message = {
		idle: '',
		pending: '복사 중',
		copied: '복사 완료',
		failed: '복사 실패 · 다시 시도하세요',
	}[status]
	return { status, message, copy }
}

/** 배치만 소유하며 선택값과 실행 동작은 소비처에서 받습니다. */
export function GuidelineCardActions({ start, center, end }: Props) {
	if (!start && !center && !end) return null
	return (
		<div data-slot="guideline-card-actions" className={styles.actions}>
			{Object.entries({ start, center, end }).map(([position, action]) =>
				action ? (
					<div key={position} data-position={position} className={styles.position}>
						<Action action={action} />
					</div>
				) : null,
			)}
		</div>
	)
}

function Action({ action }: { action: GuidelineCardAction }) {
	if (action.kind === 'breadcrumb') return <CardBreadcrumb action={action} />
	if (action.kind === 'toggle') return <GuidelineSelection {...action} />
	if (action.kind === 'group')
		return (
			<fieldset
				aria-label={action.label}
				className="m-0 flex min-w-0 items-center gap-1 border-0 p-0"
			>
				{action.actions.map((item) => (
					<Action key={item.id} action={item} />
				))}
			</fieldset>
		)
	if (action.kind === 'copy') return <CopyAction action={action} />
	if (action.kind === 'color') return <ColorAction action={action} />
	const icon = (
		<span aria-hidden="true" className="flex size-6 items-center justify-center">
			{action.icon}
		</span>
	)
	if (action.kind === 'badge') {
		return (
			<Badge
				variant={action.variant}
				shape="pill"
				role="img"
				aria-label={action.label}
				title={action.label}
				className="size-9 p-0"
			>
				{icon}
			</Badge>
		)
	}
	const shared = {
		'aria-label': action.label,
		title: action.label,
		variant: 'muted' as const,
		shape: 'pill' as const,
		size: 'icon-lg' as const,
		className:
			"bg-border text-foreground hover:bg-border/80 [&_svg:not([class*='size-'])]:size-auto",
	}
	return action.kind === 'link' ? (
		<Button {...shared} asChild>
			<a href={action.href} download={action.download}>
				{icon}
			</a>
		</Button>
	) : (
		<Button {...shared} type="button" onClick={action.onClick} disabled={action.disabled}>
			{icon}
		</Button>
	)
}

function CopyAction({ action }: { action: Extract<GuidelineEndAction, { kind: 'copy' }> }) {
	const { status, message, copy } = useGuidelineCopy()
	return (
		<div className="relative">
			<Button
				type="button"
				variant="muted"
				shape="pill"
				size={status === 'copied' ? 'lg' : 'icon-lg'}
				aria-label={action.label}
				disabled={status === 'pending'}
				onClick={() => void copy(action.value)}
				className="bg-border text-foreground hover:bg-border/80 [&_svg:not([class*='size-'])]:size-auto"
			>
				{status === 'copied' ? (
					<span className="font-semibold">Copied</span>
				) : status === 'failed' ? (
					<WarningAlt size={20} aria-hidden />
				) : (
					<Copy size={18} aria-hidden />
				)}
			</Button>
			<span
				role="status"
				className={
					status === 'failed'
						? 'pointer-events-none absolute top-full right-0 mt-2 w-max max-w-48 rounded bg-background px-2 text-xs text-foreground shadow-sm'
						: 'sr-only'
				}
			>
				{message}
			</span>
		</div>
	)
}

function ColorAction({ action }: { action: GuidelineColorAction }) {
	return (
		<fieldset
			aria-label={action.label}
			className="m-0 flex min-w-0 items-center gap-1 border-0 p-0"
		>
			{action.presets.map((preset) => (
				<button
					key={preset.value}
					type="button"
					aria-label={preset.label}
					title={preset.label}
					aria-pressed={action.value.toLowerCase() === preset.value.toLowerCase()}
					onClick={() => action.onValueChange(preset.value)}
					className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
					style={{
						backgroundColor: preset.value,
						opacity:
							action.value.toLowerCase() === preset.value.toLowerCase() ? 1 : 0.3,
					}}
				></button>
			))}
			<label className={styles.colorPicker} title="사용자 색상 선택">
				<ColorPalette size={24} aria-hidden />
				<input
					type="color"
					aria-label={`${action.label} 직접 입력`}
					value={action.value}
					onChange={(event) => action.onValueChange(event.target.value)}
					className={styles.colorInput}
				/>
			</label>
		</fieldset>
	)
}

function CardBreadcrumb({ action }: { action: GuidelineCardBreadcrumb }) {
	if (!action.items.length) return null
	return (
		<Breadcrumb aria-label={action.label} className={styles.breadcrumb}>
			<BreadcrumbList className="flex-nowrap gap-0">
				{action.items.map((item, index) => (
					<Fragment key={item.id}>
						{index > 0 && (
							<BreadcrumbSeparator className="size-6 shrink-0 justify-center" />
						)}
						<BreadcrumbItem className="min-h-9 min-w-9 shrink-0 justify-center px-0.5">
							{index === action.items.length - 1 ? (
								<BreadcrumbPage className="font-semibold text-base whitespace-nowrap">
									{item.label}
								</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									asChild
									className="font-semibold text-base text-foreground whitespace-nowrap"
								>
									<button
										type="button"
										onClick={() => action.onNavigate(item.id)}
										className="min-h-9 rounded focus-visible:outline-2 focus-visible:outline-ring"
									>
										{item.label}
									</button>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	)
}
