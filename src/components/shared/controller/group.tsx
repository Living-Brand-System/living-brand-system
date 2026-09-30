'use client'

import { ChevronDown } from '@carbon/icons-react'
import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import * as React from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

/**
 * 섹션 활성화 배선 한 묶음. 정의 기반 렌더러(`ControllerGroupRenderer`)가 이것을 그대로 얹으므로
 * 프롭을 하나씩 늘리지 않는다.
 */
export type ControllerGroupSectionProps = {
	/** 이 섹션이 지금 만지는 대상임을 면으로 표시한다. */
	active?: boolean
	/** 🔴 주면 chevron만 접기 트리거가 되고 나머지 클릭은 여기로 온다. */
	onActivate?: () => void
	onFocusCapture?: React.FocusEventHandler
	onBlurCapture?: React.FocusEventHandler
}

type ControllerGroupProps =
	| (Omit<React.ComponentProps<'section'>, 'title'> & {
			title: string
			collapsible: false
			/**
			 * 제목 행 오른끝의 표시 하나(디자인 56:2087의 Summary 옆 상태 타일).
			 * 🔴 접히는 그룹에는 줄 수 없다 — 그 자리는 chevron이 쓰고 있고, 트리거 안에 다른 요소를
			 *    넣으면 눌리는 영역이 갈린다.
			 */
			trailing?: React.ReactNode
			defaultOpen?: never
			disabled?: never
			attached?: never
			/** 접히지 않는 그룹에도 활성 표시는 붙는다 — 접힘 정책과 무관한 축이다. */
			active?: boolean
			/** chevron이 없으므로 트리거를 가를 것이 없다 — 섹션 클릭이 그대로 여기로 온다. */
			onActivate?: () => void
	  })
	| (Omit<
			React.ComponentProps<typeof Collapsible>,
			'title' | 'open' | 'onOpenChange' | 'disabled'
	  > & {
			title: string
			collapsible?: true
			defaultOpen?: boolean
			/** 잠긴 그룹 — 강제로 닫히고 토글할 수 없다. 풀리면 저장된 열림 상태로 복귀한다. */
			disabled?: boolean
			/**
			 * 앞 컨트롤을 소유하는 그룹에 붙는 하위 섹션 — 구분선 없이 여백만 둔다(디자인 SSOT 1:1838).
			 * 중첩 자체는 신호가 아니다. 나란한 하위 그룹(Graphic의 Rays·Pulse·Glass)은 구분선을 유지한다.
			 */
			attached?: boolean
			/**
			 * 이 섹션이 지금 만지는 대상임을 면으로 표시한다 — 「어디부터 어디까지가 이 섹션인지」를
			 * 누르는 것으로 알게 한다(사용자 지정 2026-08-24).
			 */
			active?: boolean
			/**
			 * 🔴 이 값을 주면 **chevron만** 접기 트리거가 되고 헤더의 나머지·본문 클릭은 여기로 온다.
			 *    주지 않으면 헤더 전체가 토글하는 기존 동작이다 — 이 컴포넌트를 쓰는 16곳의 기본은
			 *    바뀌지 않는다.
			 */
			onActivate?: () => void
	  })

/** 제목과 컨트롤을 묶고, Admin이 허용한 그룹만 접힘 상태를 소유한다. */
export function ControllerGroup(props: ControllerGroupProps) {
	if (props.collapsible !== false) return <ControllerCollapsibleGroup {...props} />

	const {
		title,
		collapsible: _collapsible,
		trailing,
		active,
		onActivate,
		className,
		children,
		...sectionProps
	} = props
	return (
		/*
		 * 🔴 a11y 두 규칙을 억제한다 — 이 클릭은 **동작이 아니라 「지금 이 섹션을 만진다」는 표시**이고,
		 *    키보드 경로가 따로 있다: 섹션 안 컨트롤로 탭하면 `onFocusCapture`가 같은 일을 한다.
		 *    role을 주면 이 컨테이너가 버튼처럼 읽혀 안쪽 컨트롤의 의미를 가린다.
		 */
		// biome-ignore lint/a11y/noStaticElementInteractions: 위 주석 — 키보드 경로는 onFocusCapture다
		// biome-ignore lint/a11y/useKeyWithClickEvents: 위 주석 — 키보드 경로는 onFocusCapture다
		<section
			data-slot="controller-group"
			data-active={active || undefined}
			onClick={onActivate}
			className={cn(
				'group/controller-group flex shrink-0 flex-col gap-1 pb-3',
				// 활성 면은 패널 폭 전체로 번진다 — 접히는 갈래와 같은 규칙이다.
				'data-[active]:-mx-4 data-[active]:bg-primary/5 data-[active]:px-4',
				className,
			)}
			{...sectionProps}
		>
			<header className="flex h-9 shrink-0 items-center justify-between gap-2 pt-1">
				{/* 제목 스타일은 span이 갖는다 — header에 두면 trailing이 muted 색을 물려받는다. */}
				<span className="font-semibold text-muted-foreground text-sm">{title}</span>
				{trailing}
			</header>
			{children}
		</section>
	)
}

function ControllerCollapsibleGroup({
	title,
	collapsible: _collapsible,
	defaultOpen = true,
	disabled = false,
	attached = false,
	active = false,
	onActivate,
	className,
	children,
	...props
}: Exclude<ControllerGroupProps, { collapsible: false }>) {
	// disabled 동안에도 사용자의 열림 의사를 보존한다 — 잠금이 풀리면 원래 상태로 돌아온다.
	const [open, setOpen] = React.useState(defaultOpen)
	const reducedMotion = useReducedMotion()
	const resolvedOpen = disabled ? false : open

	/* 디자인 SSOT(2:2071): 펼침 = ˅, 접힘 = ˄. */
	const chevron = (
		<m.span
			aria-hidden
			className="size-4 shrink-0 text-muted-foreground"
			initial={false}
			animate={{ rotate: resolvedOpen ? 0 : 180 }}
			transition={
				reducedMotion
					? { duration: 0 }
					: { type: 'spring', visualDuration: 0.35, bounce: 0.15 }
			}
		>
			<ChevronDown className="size-4" />
		</m.span>
	)

	return (
		<Collapsible
			data-slot="controller-group"
			// 속성이 있을 때만 붙인다 — Tailwind의 `data-[active]`가 존재 여부로 걸린다.
			data-active={active || undefined}
			open={resolvedOpen}
			onOpenChange={setOpen}
			disabled={disabled}
			// 헤더든 본문이든 이 섹션 안을 누르면 활성화된다. chevron만 stopPropagation으로 빠진다.
			onClick={onActivate}
			className={cn(
				// 그룹 사이 간격은 컨테이너 gap이 아니라 펼쳐졌을 때의 하단 패딩(12px)이 만든다 — 접힌 그룹은 다음 구분선에 바로 붙는다.
				'group/controller-group flex shrink-0 flex-col border-t border-border pt-1',
				resolvedOpen && 'pb-3',
				attached && 'border-t-0 pt-2',
				/*
				 * 🔑 활성 면은 패널 폭 **전체로 번진다** — `Controller.Content`의 `px-4`를 음수 마진으로
				 *    상쇄하고 같은 값을 패딩으로 되돌린다. 안쪽 콘텐츠 폭이 그대로라 리플로가 없고,
				 *    면이 좌우 끝까지 닿아야 「어디부터 어디까지」가 읽힌다.
				 * 🔴 색은 `primary`만 쓴다 — hover가 `bg-muted`이므로 `accent`(=`muted`)로 칠하면
				 *    활성과 hover가 구별되지 않는다(docs/09 §5).
				 */
				'data-[active]:-mx-4 data-[active]:bg-primary/5 data-[active]:px-4',
				className,
			)}
			{...props}
		>
			<LazyMotion features={domAnimation}>
				{onActivate ? (
					<div className="flex h-9 w-full items-center justify-between gap-1.5">
						<span className="font-semibold text-muted-foreground text-sm group-data-[active]/controller-group:text-foreground">
							{title}
						</span>
						<CollapsibleTrigger
							// 아이콘만 남으면 접기 트리거의 이름이 사라진다 — 제목으로 만들어 준다.
							aria-label={`${title} 섹션 접고 펴기`}
							// 🔴 시각 크기는 16px인데 히트 영역은 32px로 넓힌다 — 아이콘 크기 그대로는
							//    누르기 어렵다(docs/08). 음수 마진으로 헤더 높이를 늘리지 않는다.
							onClick={(event) => event.stopPropagation()}
							className="-m-2 flex size-8 shrink-0 items-center justify-center rounded-md p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
						>
							{chevron}
						</CollapsibleTrigger>
					</div>
				) : (
					<CollapsibleTrigger className="flex h-9 w-full items-center justify-between gap-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50">
						<span className="font-semibold text-muted-foreground text-sm">{title}</span>
						{chevron}
					</CollapsibleTrigger>
				)}
				<AnimatePresence initial={false}>
					{resolvedOpen && (
						<m.div
							data-slot="controller-group-content"
							initial={reducedMotion ? false : { height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0, pointerEvents: 'none' }}
							transition={
								reducedMotion
									? { duration: 0 }
									: { type: 'spring', visualDuration: 0.35, bounce: 0.1 }
							}
							style={{ clipPath: 'inset(0 -20px)' }}
						>
							{/*
							 * 위아래 4px은 바깥 gap이 아니라 여기 패딩이다 — 위 clipPath가 이 박스 끝에서
							 * 세로를 자르므로, 바깥 간격은 첫·마지막 행의 포커스 링(바깥 2px)을 구해 주지
							 * 못한다. 패딩은 접힘 애니메이션이 재는 height 안쪽이라 접혔을 때 새지 않는다.
							 */}
							<CollapsibleContent forceMount className="flex flex-col gap-1 py-1">
								{children}
							</CollapsibleContent>
						</m.div>
					)}
				</AnimatePresence>
			</LazyMotion>
		</Collapsible>
	)
}
