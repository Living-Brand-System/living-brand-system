'use client'

import type { ReactNode } from 'react'
import { Controller } from '@/components/shared/controller'
import { cn } from '@/lib/utils'

/**
 * Studio 좌·우 패널의 공통 껍데기 — **한 패널은 둥근 상자 두 개다**(사용자 지시, 2026-09-10).
 *
 * ```
 * ┌─────────────┐  ← 상자 1. 남은 높이를 다 먹는다
 * │  top        │
 * └─────────────┘
 *      (gap)
 * ┌─────────────┐  ← 상자 2. 내용 높이만. 비어 있어도 상자는 남는다
 * │  bottom     │
 * └─────────────┘
 * ```
 *
 * 🔴 테두리는 **상자마다** 있다 — 겉 wrapper는 면도 테두리도 갖지 않는다. 두 블록을 한 테두리로
 *    묶었던 앞 판을 사용자가 바꿨다.
 * 🔴 `header`/`footer` 3슬롯 껍데기(`StudioSidebar`)와 다른 점은 **위 상자가 나뉘지 않는다**는
 *    것이다. 좌측은 「페이지 선택 + 공통」이 한 상자고, 우측은 「레이어 + 컨트롤러」가 한 상자다.
 *    그래서 그 안에서 무엇이 늘어날지는 상자를 채우는 쪽이 정한다(우측은 컨트롤러가 h=100%).
 * 🔑 상자에 무엇이 들어가는지 이 컴포넌트는 모른다 — 콘텐츠를 레이아웃에 박지 않는다.
 */
export function StudioPanel({
	slot,
	top,
	middle,
	bottom,
	grow = 'top',
	className,
}: {
	/**
	 * DOM에서 어느 쪽 패널인지 알려 주는 이름. 🔴 양쪽이 같은 껍데기를 쓰므로 이것이 없으면
	 * 테스트·디버깅에서 좌우를 구별할 수 없다(DOM 순서에 의존하게 된다).
	 */
	slot: 'studio-sidebar' | 'studio-left-panel'
	top: ReactNode
	/**
	 * 가운데 상자. 🔴 **넘기지 않으면 상자는 둘 그대로다** — 기존 호출자의 배치를 바꾸지 않으려고
	 *    선택적으로 두었다(이미지 스튜디오만 프로파일·본보기·내보내기 셋을 세운다).
	 */
	middle?: ReactNode
	/**
	 * 아래 상자. 🔴 비어 있어도 **자리를 지킨다** — 「레이아웃과 콘텐츠는 별개」(사용자 지시)라
	 * 상자 두 개인 골격은 채울 것이 없을 때도 그대로 보여야 한다.
	 */
	bottom?: ReactNode
	/**
	 * 남은 높이를 먹는 상자. 🔴 상자가 스스로 정하지 않는다 — 우측은 위(컨트롤러)가 늘어나고
	 * 좌측은 아래(공통)가 늘어난다. 위가 **내용만큼만** 차지해야 하는 패널이 있기 때문이다.
	 */
	grow?: 'top' | 'middle' | 'bottom'
	className?: string
}) {
	return (
		// 폭은 셸 열(auto)이 아니라 패널이 소유한다 — 22rem 열 − aside 패딩 32px = 320px 그대로.
		// 🔴 이 wrapper는 상자가 아니다(면·테두리 없음) — 두 상자를 세로로 세우고 사이를 띄우는 일만 한다.
		<div
			data-slot={slot}
			className={cn('flex min-h-0 flex-col gap-4 lg:h-full lg:w-80', className)}
		>
			{/* 🔴 `Controller.Root`가 `lg:h-full`을 갖는다 — 상자가 둘이므로 높이는 flex가 나눈다.
			    🔑 상자는 **테두리만** 갖고 패딩을 갖지 않는다 — 안쪽 여백은 채우는 쪽이 가져오고,
			       그래서 「요소가 상자를 꽉 채우는」 배치가 특례 없이 나온다. */}
			{/* 🔴 위 상자는 **넣을 것이 있을 때만** 그린다 — 상자가 패딩을 갖지 않으므로 빈 상자는
			    테두리 2px짜리 실선 조각으로 남는다(image·graphic 스튜디오가 아직 페이지 선택을
			    옛 껍데기에 두고 있어 실제로 그랬다). 아래 상자는 비어도 자리를 지킨다. */}
			{top && (
				<Controller.Root
					data-slot="studio-panel-top"
					className={cn('lg:h-auto', grow === 'top' ? 'min-h-0 flex-1' : 'shrink-0')}
				>
					{top}
				</Controller.Root>
			)}
			{middle && (
				<Controller.Root
					data-slot="studio-panel-middle"
					className={cn('lg:h-auto', grow === 'middle' ? 'min-h-0 flex-1' : 'shrink-0')}
				>
					{middle}
				</Controller.Root>
			)}
			<Controller.Root
				data-slot="studio-panel-bottom"
				className={cn(
					'lg:h-auto',
					// 위 상자가 없으면 아래가 남은 높이를 다 먹는다 — 혼자 남은 상자가 쪼그라들면 안 된다.
					grow === 'bottom' || (!top && !middle) ? 'min-h-0 flex-1' : 'shrink-0',
				)}
			>
				{bottom}
			</Controller.Root>
		</div>
	)
}

/**
 * 상자 안에서 **남은 높이를 먹고 스크롤되는** 영역. 여기에 컨트롤러 n개가 쌓인다
 * (「컨트롤러(비어 있을 수도 있음, h=100%)」).
 *
 * 🔴 위 경계선은 **상자 폭 전체**를 지른다(사용자 지시, 2026-09-10) — 좌우 패딩은 이 컨테이너가
 *    갖고 테두리는 그 바깥이라, 위의 고정 영역과 이 스크롤 영역이 상자 안에서 완전히 갈린다.
 *    그룹 목록의 간격은 Controller.GroupList가 소유한다.
 * 🔴 비어 있어도 자리를 지킨다 — 레이어를 고르지 않았을 때 상자가 줄어들면 안 된다.
 */
export function StudioPanelScroll({ children }: { children: ReactNode }) {
	return (
		<div
			data-slot="studio-panel-scroll"
			className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-border px-4 pb-4 first:border-t-0"
		>
			{children}
		</div>
	)
}

/**
 * 상자 안에서 **높이를 차지한 만큼만** 쓰는 고정 영역 — 스크롤 위에 앉는다.
 * 좌측은 페이지 선택이, 우측은 레이어 목록이 여기 온다.
 *
 * 🔑 여기 오는 것은 **항상 1~2개**다(사용자 지시) — 그래서 스크롤을 주지 않는다.
 * ponytail: 그래도 레이어가 아주 많은 템플릿에서는 이 영역이 스크롤을 밀어낼 수 있다. 지금은
 *   목록이 접히므로(`collapsible`) 그것으로 족하고, 실제로 밀리면 여기에 최대 높이 한 줄이다.
 */
export function StudioPanelFixed({
	children,
	className,
}: {
	children: ReactNode
	className?: string
}) {
	return (
		<div
			data-slot="studio-panel-fixed"
			className={cn('flex shrink-0 flex-col gap-1 px-4 pt-4 pb-4', className)}
		>
			{children}
		</div>
	)
}
