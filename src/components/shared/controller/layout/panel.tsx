import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ControllerPresence } from './presence'
import { ControllerTitle } from './title'

/**
 * 스튜디오 패널 규칙(docs/features/studio.md 「작업 영역 레이아웃」, 사용자 2026-10-16) —
 * **패널은 표면(Panel) 하나에 섹션(Section) 1..n을 담는다. 여백은 Section만, 패널 사이 간격은 열만,
 * 섹션 사이 선은 Panel만(`ControllerSections`), 제목은 Title만 갖는다. 높이는 전부 내용만큼이다.**
 * - 떨어진 카드 = Panel 여럿(간격은 열의 gap) · 합친 카드 = Panel 하나에 Section 여럿 · 썸네일 카드 = 정사각 Panel에 여백 없는 Section.
 * - 값의 기준은 왼쪽 Layers·Output 카드다: 좌우·아래 16px, 제목으로 시작하면 위 4px(아니면 16px), 줄 사이 4px, 섹션 사이 선 위 16px·아래 4px.
 * 🔴 셋 다 className·style을 받지 않는다 — 여백·표면·제목 색을 소비처가 덮을 길이 타입에 없다.
 */

const SURFACE =
	'flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg'
/**
 * 섹션 사이 선 — 앞 섹션 뒤에 오는 섹션 상자에만 위 선을 긋는다(좌우 16px 들여). 섹션이 생기고 빠질 때도 같은 펼침이다.
 * 패널 안 줄 간격(4px)은 변수로 내린다 — 그룹(`Controller.Group`)도 패널 안에서는 이 값을 쓴다.
 */
const SECTION_ITEM =
	'relative [&+&]:before:absolute [&+&]:before:inset-x-4 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-border'

type NoStyle<T> = Omit<T, 'className' | 'style'>

/** 패널 표면 한 장 — 여백이 없고 높이는 내용만큼이다. 자식은 Section이다. `square`는 썸네일 카드(정사각, 여백 없는 Section 하나). */
export function ControllerPanel({
	square = false,
	children,
	...props
}: NoStyle<ComponentProps<'div'>> & { square?: boolean }) {
	return (
		<div
			data-slot="controller-panel"
			{...props}
			data-panel="surface"
			className={cn(SURFACE, '[--controller-row-gap:0.25rem]', square && 'aspect-square')}
		>
			{square ? children : <ControllerSections>{children}</ControllerSections>}
		</div>
	)
}

/** 섹션 목록 — 섹션 사이 선과 펼침. Panel이 자기 자식에 쓰고, 섹션을 여럿 만드는 컴포넌트(패널 슬롯)가 안에서 쓴다. */
export function ControllerSections({ children }: { children: ReactNode }) {
	return <ControllerPresence itemClassName={SECTION_ITEM}>{children}</ControllerPresence>
}

type SectionProps = NoStyle<Omit<ComponentProps<'section'>, 'title'>> &
	(
		| {
				/** 섹션 제목 — 제목 아래 줄은 4px 간격으로 쌓이고 생기고 빠질 때 펼친다. */
				title: string
				/** 줄 묶음 아래 버튼·안내(위 16px). */
				actions?: ReactNode
				start?: never
				bleed?: never
		  }
		| {
				title?: never
				actions?: never
				/** 첫 줄이 제목 행(그룹 제목 등)이면 'title' — 위 여백 4px. 아니면 16px. */
				start?: 'title' | 'content'
				bleed?: never
		  }
		| { bleed: true; title?: never; actions?: never; start?: never }
	)

/** 패널 안 한 단위 — 여백을 갖는 유일한 자리다. `bleed`는 그림이 표면 끝까지 닿는 썸네일 카드다. */
export function ControllerSection({
	title,
	actions,
	start,
	bleed,
	children,
	...props
}: SectionProps) {
	if (bleed)
		return (
			<section data-panel="section" {...props} className="h-full min-h-0">
				{children}
			</section>
		)
	const titled = title !== undefined || start === 'title'
	return (
		<section
			data-panel="section"
			{...props}
			className={cn('flex flex-col px-4 pb-4', titled ? 'pt-1' : 'pt-4')}
		>
			{title !== undefined ? (
				<>
					<ControllerTitle>{title}</ControllerTitle>
					<ControllerPresence itemClassName="pt-1">{children}</ControllerPresence>
				</>
			) : (
				children
			)}
			{actions && <div className="flex flex-col gap-4 pt-4">{actions}</div>}
		</section>
	)
}
