'use client'

import { domAnimation, LazyMotion } from 'motion/react'
import * as m from 'motion/react-m'
import * as React from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMotionTransition } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { ControllerOption } from '@/modules/studio-controller/controller-definition'
import { useRowControl } from '../compose/row'

/**
 * toggle(boolean)의 표현은 세그먼트 On|Off 하나뿐이다 — 계약 밖 boolean 행(레이어 가시성·어드민 스위치)도 이걸 쓴다.
 * 순서는 디자인 SSOT(Figma HD_LBS_UI 4:5822 "Toggle")가 정한다 — On이 왼쪽이다.
 */
export const CONTROLLER_TOGGLE_OPTIONS = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const

type ControllerSegmentedProps<T extends string> = {
	options: readonly ControllerOption<T>[]
	value: T
	onChange: (value: T) => void
	'aria-label': string
	/** 어드민 고정 값 — 포커스·조작이 막힌다. Row 안에서는 행의 disabled를 자동으로 따른다. */
	disabled?: boolean
	/** 컴파운드 헤더의 24px 알약형 선택 표시. */
	compact?: boolean
}

/**
 * 세그먼트 토글(Preset|Generate, On|Off) — dialkit segmented 구조를 그대로 옮겼다:
 * 트랙(relative) 위에 투명 버튼들이 놓이고, 선택 배경은 별도의 pill 하나가
 * 활성 버튼 위치로 미끄러진다(dialkit-segmented-pill). 트랙은 행의 오른끝에서
 * 2px 인셋으로 앉는다(-mr-2.5 = 행 패딩 12px − 2px).
 *
 * pill은 헤더 nav의 체이서(`navigation-header-link-chaser`)와 같은 방식이다 — 항목마다
 * 붙였다 떼는 게 아니라 하나가 살아남아 활성 항목의 실측 위치·폭으로 이동한다.
 */
export function ControllerSegmented<T extends string>({
	options,
	value,
	onChange,
	'aria-label': ariaLabel,
	disabled,
	compact = false,
}: ControllerSegmentedProps<T>) {
	const row = useRowControl()
	const resolvedDisabled = disabled ?? row?.disabled
	const groupRef = React.useRef<HTMLDivElement>(null)
	const [pill, setPill] = React.useState<{ left: number; width: number } | null>(null)
	const transition = useMotionTransition('indicator')

	// 버튼의 실측 폭을 따라가므로 라벨 길이가 달라도 pill이 정확히 맞는다.
	React.useLayoutEffect(() => {
		const target = groupRef.current?.querySelector<HTMLElement>(`[data-pill-value="${value}"]`)
		setPill(target ? { left: target.offsetLeft, width: target.offsetWidth } : null)
	}, [value])

	return (
		<div
			data-slot="controller-segmented"
			className={cn('flex h-9 shrink-0 items-center', compact ? 'py-1.5' : '-mr-2.5 py-0.5')}
		>
			<LazyMotion features={domAnimation}>
				<ToggleGroup
					ref={groupRef}
					type="single"
					value={value}
					// 세그먼트는 항상 하나가 선택돼 있다 — 같은 칩 재클릭(빈 값)은 무시.
					onValueChange={(next) => next && onChange(next as T)}
					aria-label={ariaLabel}
					disabled={resolvedDisabled}
					spacing={0}
					className="relative h-full"
				>
					{pill && (
						<m.div
							aria-hidden
							data-slot="controller-segmented-pill"
							className={cn(
								'pointer-events-none absolute inset-y-0 z-0 bg-foreground/10',
								compact ? 'rounded-lg' : 'rounded-sm',
							)}
							initial={false}
							animate={pill}
							transition={transition}
						/>
					)}
					{options.map((option) => (
						<ToggleGroupItem
							key={option.value}
							data-pill-value={option.value}
							value={option.value}
							size="sm"
							className="relative z-10 h-full rounded-sm bg-transparent px-2 text-muted-foreground text-sm transition-colors hover:bg-transparent motion-reduce:transition-none aria-pressed:bg-transparent aria-pressed:text-foreground data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:hover:bg-transparent data-[state=on]:hover:text-foreground"
						>
							{option.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</LazyMotion>
		</div>
	)
}
