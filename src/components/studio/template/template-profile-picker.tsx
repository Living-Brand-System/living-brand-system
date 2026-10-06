'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ControllerBrowser } from '@/components/shared/controller'
import {
	StudioSelectionCard,
	StudioSelectionTile,
} from '@/components/studio/shared/studio-selection-card'
import { Typography } from '@/components/ui/typography'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/**
 * 자산 브라우저 본문의 템플릿 카드 그리드 — 킷(Controller.Browser)이 크롬을, 이 컴포넌트가 도메인을 갖는다.
 * 카드는 홈·편집 화면 좌상단과 같은 `StudioSelectionCard`다.
 * 이미지·그래픽과 달리 교체가 라우팅이다: 템플릿마다 HTML과 슬롯이 달라 편집 세션을 이어받을 수 없어
 * 고른 템플릿의 화면으로 이동한다. 목록은 패널이 열릴 때 온다.
 */
export function TemplateProfilePicker({ onSelect }: { onSelect?: (slug: string) => void }) {
	const router = useRouter()
	const { config, navigation } = useTemplateStudio()
	const { load } = navigation.browse
	// 이 컴포넌트는 패널이 열릴 때 마운트된다(radix가 닫힌 콘텐츠를 언마운트한다) — mount가 곧 "열림"이다.
	useEffect(() => {
		load()
	}, [load])

	return (
		<div data-slot="template-profile-picker" className="flex shrink-0 flex-col gap-4 pr-1">
			{(navigation.browse.data ?? []).map((category) =>
				category.templates.length === 0 ? null : (
					<div key={category.id} className="flex flex-col gap-2">
						<Typography
							as="p"
							size="xs"
							weight="medium"
							className="text-inverted-foreground/60"
						>
							{category.title}
						</Typography>
						<div className="grid grid-cols-3 gap-3">
							{category.templates.map((item) => (
								<ControllerBrowser.Close key={item.id} asChild>
									<StudioSelectionTile
										aria-current={item.id === config.id || undefined}
										onClick={() =>
											onSelect ? onSelect(item.slug) : router.push(item.href)
										}
									>
										<StudioSelectionCard
											title={item.name}
											subtitle={category.title}
											image={item.previewImage}
										/>
									</StudioSelectionTile>
								</ControllerBrowser.Close>
							))}
						</div>
					</div>
				),
			)}
		</div>
	)
}
