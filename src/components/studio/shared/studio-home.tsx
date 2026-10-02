import Link from 'next/link'
import {
	StudioSelectionCard,
	StudioSelectionTile,
} from '@/components/studio/shared/studio-selection-card'
import { StudioWorkspacePage } from '@/components/studio/shared/studio-workspace'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Typography } from '@/components/ui/typography'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'

export type StudioHomeItem = {
	key: string | number
	name: string
	/** 이름 아래 한 줄 — 편집 화면 좌상단 카드의 부제와 같은 값을 준다. */
	subtitle?: string
	href: string
	previewImage?: StudioPreviewImage
}

export type StudioHomeGroup = {
	/** 묶음 제목 — 분류가 없는 스튜디오(Graphic·Image)는 비운다. */
	title?: string
	/** 넘어온 순서가 곧 배치 순서다 — 첫 항목이 좌상단에 선다. */
	items: readonly StudioHomeItem[]
}

type StudioHomeProps = {
	title: string
	description: string
	groups: readonly StudioHomeGroup[]
	empty: { title: string; description: string }
}

/**
 * 생성 스튜디오(Template·Graphic·Image)의 공통 첫 화면 — 고를 수 있는 것을 카드로 펼친다.
 * 카드는 딥링크(`/studio/<kind>/<slug>`)로 가는 링크일 뿐이고, 편집 세션은 딥링크 화면이 소유한다.
 */
export function StudioHome({ title, description, groups, empty }: StudioHomeProps) {
	const visibleGroups = groups.filter((group) => group.items.length > 0)

	return (
		<StudioWorkspacePage title={title} description={description}>
			<div data-slot="studio-home" className="min-h-0 overflow-y-auto px-4 pb-8 md:px-8">
				{visibleGroups.length === 0 ? (
					<Empty className="min-h-96 rounded-none border-t border-border">
						<EmptyHeader>
							<EmptyTitle>{empty.title}</EmptyTitle>
							<EmptyDescription>{empty.description}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="flex flex-col gap-8">
						{visibleGroups.map((group, index) => (
							<section key={group.title ?? index} className="flex flex-col gap-3">
								{group.title && (
									<Typography as="h2" size="sm" weight="medium">
										{group.title}
									</Typography>
								)}
								{/* 카드 폭은 Figma Select Card(320px) 근처에서 열 수가 따라간다. */}
								<div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
									{group.items.map((item) => (
										<StudioSelectionTile key={item.key} asChild>
											<Link href={item.href}>
												<StudioSelectionCard
													title={item.name}
													subtitle={item.subtitle}
													image={item.previewImage}
												/>
											</Link>
										</StudioSelectionTile>
									))}
								</div>
							</section>
						))}
					</div>
				)}
			</div>
		</StudioWorkspacePage>
	)
}
