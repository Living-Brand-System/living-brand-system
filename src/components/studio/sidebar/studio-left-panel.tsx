'use client'

import type { ReactNode } from 'react'
import { Controller } from '@/components/shared/controller'
import { StudioPanel, StudioPanelScroll } from '@/components/studio/sidebar/studio-panel'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'

/**
 * 캔버스 왼쪽 패널 — 상자 두 개다. **위 = 페이지 선택 · 아래 = 공통된 것**(사용자 지시, 2026-09-10).
 *
 * 🔴 위 상자는 페이지 선택 요소가 **꽉 채운다.** 패딩으로 가둔 카드가 아니라 그 요소 자체가
 *    상자다 — 그래서 `page`는 여백 래퍼 없이 그대로 들어가고, 안쪽 여백은 넣는 쪽이 갖는다.
 * 🔴 늘어나는 쪽이 **아래**다(`grow="bottom"`). 위는 카드 높이만 차지한다.
 *
 * 🔴 **레이아웃은 콘텐츠와 별개다.** 그릴 것이 없어도 패널은 자리를 지킨다 — 프로파일을 못
 *    불러와도, 아직 아무 축도 선언하지 않았어도 화면 골격이 바뀌지 않는다. 빈 자리는 패널을
 *    지우는 대신 **패널 안에서** 말한다.
 * 🔑 좌측이 갖는 것: 페이지 선택 · 스타일 · 판 전체에 걸리는 공통 컨트롤.
 *    우측이 갖는 것: 레이어 · 그 레이어의 컨트롤 · settings + 내보내기.
 */
export function StudioLeftPanel({
	page,
	empty,
	children,
	footer,
}: {
	/** 페이지(템플릿·프로파일) 선택 — 위 상자를 그대로 채운다(여백 래퍼 없음). */
	page?: ReactNode
	/** 공통된 것이 없을 때 아래 상자에 세울 문구. */
	empty?: { title: string; description?: string }
	/** 공통된 것 — 판 전체에 걸리는 컨트롤. */
	children?: ReactNode
	/**
	 * 맨 아래 상자. 🔴 **넘길 때만 상자가 셋이 된다** — 넘기지 않으면 지금까지처럼 둘이고
	 *    `children`이 늘어나는 상자를 차지한다(graphic·template이 그렇게 쓴다).
	 */
	footer?: ReactNode
}) {
	const body = children ?? (
		<Empty>
			<EmptyHeader>
				<EmptyTitle>{empty?.title ?? '이 화면에는 공통 컨트롤이 없습니다'}</EmptyTitle>
				{empty?.description && <EmptyDescription>{empty.description}</EmptyDescription>}
			</EmptyHeader>
		</Empty>
	)

	return (
		// 🔴 자산 브라우저(Change)의 프레임이다. **상자 밖**에 있어야 한다 — 상자는
		//    `overflow-hidden`이라 그 안에 두면 패널이 잘려 열려도 아무것도 안 보인다.
		//    프레임이 없으면 패널이 portal되지 않아 엉뚱한 조상 기준으로 떠오른다.
		<Controller.Browser.Root>
			<StudioPanel
				slot="studio-left-panel"
				grow={footer ? 'middle' : 'bottom'}
				top={page}
				middle={footer ? <StudioPanelScroll>{body}</StudioPanelScroll> : undefined}
				bottom={footer ?? <StudioPanelScroll>{body}</StudioPanelScroll>}
			/>
		</Controller.Browser.Root>
	)
}
