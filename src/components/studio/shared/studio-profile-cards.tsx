'use client'

import { ControllerBrowser } from '@/components/shared/controller'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'

export type StudioProfileCard = {
	id: number | string
	name: string
	image?: StudioPreviewImage
	badges: readonly string[]
}

/**
 * 자산 브라우저 본문의 프로파일 카드 그리드(Figma HD_LBS_UI 19:12907) — 독립 스튜디오와 템플릿의 「변경」이 같은 모양이다.
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
			{cards.map((card) => {
				const current = card.id === currentId
				return (
					<ControllerBrowser.Close key={card.id} asChild>
						<button
							type="button"
							// 브라우저는 현재 선택을 보여야 한다 — 테두리 두께와 aria-current로 함께 알린다.
							aria-current={current || undefined}
							disabled={disabled}
							onClick={() => onSelect(card.id)}
							className={cn(
								'flex h-64 flex-col overflow-hidden rounded-lg border bg-background/5 text-left outline-none focus-visible:ring-2 focus-visible:ring-background/50 disabled:opacity-50',
								current
									? 'border-2 border-background/60'
									: 'border-background/10 enabled:hover:bg-background/10',
							)}
						>
							<ControllerBrowser.Thumbnail image={card.image} />
							<div className="flex shrink-0 flex-col gap-2 bg-background/5 px-1.5 py-2">
								<Typography as="p" size="xs" weight="medium" className="truncate">
									{card.name}
								</Typography>
								{/* 배지가 없어도 자리 높이를 유지한다 — 카드마다 이름 위치가 흔들리지 않는다. */}
								<div className="flex h-5 items-center gap-0.5">
									{card.badges.map((badge) => (
										<Badge key={badge} variant="muted" shape="rounded">
											{badge}
										</Badge>
									))}
								</div>
							</div>
						</button>
					</ControllerBrowser.Close>
				)
			})}
		</div>
	)
}
