'use client'

import type * as React from 'react'
import { cn } from '@/lib/utils'

// 🔴 button 전용 props(ComponentProps<'button'>)로 두면 안 된다 — 렌더 태그가 div로도 갈리므로
//    ref와 이벤트 핸들러 타입이 HTMLButtonElement에 묶여 div 분기에서 깨진다. Typography와 같은
//    HTMLElement 기반 속성만 받는다(button 전용 속성은 내부에서만 붙인다).
type ControllerListRowProps = React.HTMLAttributes<HTMLElement> & {
	/** 제목 위의 작은 보조 줄(디자인의 Scenario Name). 없으면 한 줄 행이 아니라 두 줄 자리를 그대로 비운다. */
	caption?: React.ReactNode
	label: React.ReactNode
	/** 행 끝의 상태 타일이나 버튼 — `Controller.Status` / `Controller.Action`이 들어온다. */
	trailing?: React.ReactNode
	selected?: boolean
}

/**
 * 두 줄 목록 행 — 48px. 디자인 59:2757 "Item".
 *
 * `Controller.Row`(36px 한 줄)와 면·포커스 링·트레일링 자리는 같고 높이와 줄 수만 다르다.
 * Row의 한 줄 계약을 흐리지 않으려고 파츠를 나눴다 — Row는 라벨과 컨트롤이 가로로 마주 앉는
 * 자리이고, 이 행은 **읽기용 항목**이라 컨트롤을 품지 않는다(그래서 RowControlProvider도 없다).
 *
 * 🔴 `onClick`이 있으면 `button`, 없으면 `div`로 렌더한다. 목록의 파일 행은 눌러서 들어가지만
 *    요약 화면 상단에 남는 선택 행은 정보 표시라, 후자를 button으로 두면 눌러도 아무 일이 없는
 *    거짓 어포던스가 된다(`Controller.Row`의 `readonly`가 label을 span으로 바꾸는 것과 같은 이유).
 */
export function ControllerListRow({
	caption,
	label,
	trailing,
	selected = false,
	className,
	onClick,
	...props
}: ControllerListRowProps) {
	const interactive = Boolean(onClick)
	const Comp: React.ElementType = interactive ? 'button' : 'div'

	return (
		<Comp
			data-slot="controller-list-row"
			data-selected={selected || undefined}
			{...(interactive ? { type: 'button', onClick } : {})}
			className={cn(
				// 오른쪽 패딩만 6px인 이유: 36px 트레일링 타일이 행 끝에서 같은 여백을 갖는다(디자인 59:2798).
				'flex h-12 w-full items-center gap-2 rounded-lg bg-muted pr-1.5 pl-3 text-left',
				interactive &&
					'transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none',
				'data-[selected]:bg-foreground/10',
				className,
			)}
			{...props}
		>
			<span className="flex min-w-0 flex-1 flex-col">
				{caption && (
					<span className="truncate text-muted-foreground text-xs">{caption}</span>
				)}
				<span className="truncate font-medium text-sm">{label}</span>
			</span>
			{trailing}
		</Comp>
	)
}
