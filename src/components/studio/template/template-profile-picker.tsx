'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ControllerBrowser } from '@/components/shared/controller'
import { Typography } from '@/components/ui/typography'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { cn } from '@/lib/utils'

/**
 * 자산 브라우저 본문의 템플릿 카드 그리드 — 킷(Controller.Browser)이 크롬을, 이 컴포넌트가 도메인을 갖는다.
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
							{category.templates.map((item) => {
								const current = item.id === config.id

								return (
									<ControllerBrowser.Close key={item.id} asChild>
										<button
											type="button"
											aria-current={current || undefined}
											onClick={() =>
												onSelect
													? onSelect(item.slug)
													: router.push(item.href)
											}
											className={cn(
												'flex h-64 flex-col overflow-hidden rounded-lg border bg-background/5 text-left outline-none focus-visible:ring-2 focus-visible:ring-background/50',
												current
													? 'border-2 border-background/60'
													: 'border-background/10 hover:bg-background/10',
											)}
										>
											<ControllerBrowser.Thumbnail
												image={item.previewImage}
											/>
											<div className="flex shrink-0 flex-col gap-2 bg-background/5 px-1.5 py-2">
												<Typography
													as="p"
													size="xs"
													weight="medium"
													className="truncate"
												>
													{item.name}
												</Typography>
											</div>
										</button>
									</ControllerBrowser.Close>
								)
							})}
						</div>
					</div>
				),
			)}
		</div>
	)
}
