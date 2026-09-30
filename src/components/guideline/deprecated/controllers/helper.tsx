'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ControllerBar } from '@/components/shared/controller/index'
import { useGuidelineHelper } from '@/features/guideline/hooks/use-guideline-helper'
import { cn } from '@/lib/utils'
import { helperLabel } from './helper-label'

/**
 * 하단 Floating Controller("Helper") — 지금 보고 있는 블록의 컨트롤만 화면 아래 알약에 띄운다.
 *
 * 🔴 **이 바는 값을 갖지 않는다.** 값은 그대로 블록이 소유하고(`providers/guideline-controller-provider.tsx`),
 *    여기는 빈 자리(slot)와 "누가 활성인가"만 안다. 바가 값을 중계하면 화면에 하나뿐인 바가
 *    블록마다 다른 값을 하나로 합쳐 버려, 슬라이더 하나가 여러 블록의 판형을 함께 움직인다
 *    (2026-08-04에 실제로 12개가 함께 움직였다 — `guideline-controller-provider.tsx`의 주석이 같은 사고를 가리킨다).
 *    그래서 컨트롤은 자기 블록의 React 트리 안에서 렌더되고 **DOM만** portal로 내려온다.
 *    context는 트리를 따라가므로 portal 너머에서도 자기 블록의 스코프를 그대로 읽는다.
 */

/**
 * 바가 앉는 자리. `absolute inset-0`으로 본문 높이만큼 자리를 잡고 그 안에서 바가 sticky로 뜬다.
 * `fixed`가 아닌 이유는 사이드바 폭이 접힘에 따라 변해서, 뷰포트 기준으로 가운데를 잡으면
 * 본문 가운데와 어긋나기 때문이다.
 *
 * 🔴 `mt-auto`가 없으면 붙지 않는다. sticky는 지정한 모서리 **쪽으로만** 당긴다 — `bottom`은
 *    자연 위치가 기준선보다 아래일 때 위로 끌어올리는 것이지, 위에 있는 것을 아래로 밀지 않는다.
 *    정렬 없이 자리 상자 맨 위에 두면 본문 꼭대기에 그대로 남아 화면에서 보이지 않는다(실측).
 */
export function GuidelineHelperSlot() {
	const registry = useGuidelineHelper()

	return (
		// 바가 자기 sticky를 갖는다(`ControllerBar`의 placement="scroll"). 이 상자는 **세로로 꽉 찬
		// flex 열**만 준다 — 그래야 바의 `mt-auto`가 바닥을 잡고 sticky가 위로 당길 거리가 생긴다.
		<div
			ref={registry?.setSlot}
			className="pointer-events-none absolute inset-0 flex flex-col items-center px-4"
		/>
	)
}

/**
 * 컨트롤을 가진 블록이 자기 **관측 영역**을 선언한다. 영역이 화면에 걸려 있는 동안에만
 * `controls`가 하단 바로 올라간다. 영역은 제목·본문이 아니라 **조작 대상이 놓인 면**이어야 한다 —
 * 판형이 화면 밖인데 슬라이더만 남으면 움직여도 아무 변화가 안 보인다.
 */
export function GuidelineHelperRegion({
	label,
	className,
	controls,
	children,
}: {
	label?: string | null
	className?: string
	controls: ReactNode
	children: ReactNode
}) {
	const registry = useGuidelineHelper()
	const regionRef = useRef<HTMLDivElement>(null)
	const observe = registry?.observe

	useEffect(() => {
		const element = regionRef.current
		if (!element || !observe) return
		return observe(element)
	}, [observe])

	const active = registry?.activeRegion != null && registry.activeRegion === regionRef.current

	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: 폼 필드 묶음이 아니라 조작할 표본을 선택하는 영역이다. */}
			<div
				ref={regionRef}
				role="group"
				aria-label={helperLabel(label)}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: 포커스로 이 카드의 외부 컨트롤러를 활성화한다.
				tabIndex={0}
				onPointerDown={() =>
					regionRef.current && registry?.setActiveRegion(regionRef.current)
				}
				onFocus={() => regionRef.current && registry?.setActiveRegion(regionRef.current)}
				className={cn(
					'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
					className,
				)}
			>
				{children}
			</div>
			{active && registry?.slot
				? createPortal(
						// portal로 내려와 자기 그림에서 DOM상 떨어지므로, 어느 블록의 컨트롤인지는
						// 이름이 유일한 단서다.
						<ControllerBar
							placement="scroll"
							aria-label={helperLabel(label)}
							// 문구 편집은 Head/Sub/Body 세 칸을 같은 폭으로, 초기화는 내용 폭으로 배치한다.
							className="flex max-h-[50vh] max-w-full flex-wrap justify-center overflow-y-auto has-[textarea]:grid has-[textarea]:w-full has-[textarea]:grid-cols-1 has-[textarea]:items-start sm:has-[textarea]:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
						>
							{controls}
						</ControllerBar>,
						registry.slot,
					)
				: null}
		</>
	)
}
