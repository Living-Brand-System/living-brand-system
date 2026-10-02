'use client'

import { Fragment } from 'react'
import { ControllerBrowser } from '@/components/shared/controller'
import {
	StudioSelectionCard,
	StudioSelectionTile,
} from '@/components/studio/shared/studio-selection-card'
import { Typography } from '@/components/ui/typography'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'

export type StudioProfileCard = {
	id: number | string
	name: string
	image?: StudioPreviewImage
	badges: readonly string[]
}

/**
 * 자산 브라우저 본문의 프로파일 카드 그리드 — 독립 스튜디오와 템플릿의 「변경」이 같은 모양이다.
 * 카드는 홈·편집 화면 좌상단과 같은 `StudioSelectionCard`이고, 배지는 카드의 부제 줄에 선다.
 * 킷(Controller.Browser)이 크롬과 열림을, 이 컴포넌트가 카드를, 부르는 쪽이 후보와 교체를 갖는다.
 * 고른 뒤 닫기는 카드를 감싼 Controller.Browser.Close가 받는다.
 */
export function StudioProfileCards({
	slot,
	cards,
	currentId,
	disabled = false,
	empty,
	onSelect,
}: {
	slot: string
	cards: readonly StudioProfileCard[]
	currentId: StudioProfileCard['id'] | undefined
	disabled?: boolean
	/** 후보가 없을 때 그리드 대신 보이는 문구. */
	empty?: string
	onSelect: (id: StudioProfileCard['id']) => void
}) {
	if (!cards.length && empty)
		return (
			<Typography size="sm" className="text-background/60">
				{empty}
			</Typography>
		)
	return (
		<div data-slot={slot} className="grid shrink-0 grid-cols-3 gap-3 pr-1">
			{cards.map((card) => (
				<ControllerBrowser.Close key={card.id} asChild>
					<StudioSelectionTile
						aria-current={card.id === currentId || undefined}
						disabled={disabled}
						onClick={() => onSelect(card.id)}
						className="disabled:opacity-50"
					>
						<StudioSelectionCard
							title={card.name}
							subtitle={card.badges.length > 0 && <BadgeLine badges={card.badges} />}
							image={card.image}
						/>
					</StudioSelectionTile>
				</ControllerBrowser.Close>
			))}
		</div>
	)
}

/** 배지를 ` · `로 잇는다 — 배지마다 따로 읽히도록 낱낱의 span으로 둔다. */
function BadgeLine({ badges }: { badges: readonly string[] }) {
	return badges.map((badge, index) => (
		<Fragment key={badge}>
			{index > 0 && ' · '}
			<span>{badge}</span>
		</Fragment>
	))
}
