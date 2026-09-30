'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Sidebar } from '@/components/global/sidebar/sidebar'
import { CopyPageLink } from '@/components/shared/copy-page-link'
import {
	scrollToGuidelineSection,
	useActiveSectionAnchor,
} from '@/features/guideline/hooks/use-guideline-section-navigation'
import type { GetGuidelineNavigationOutput } from '@/features/guideline/services/get-guideline-navigation.service'

/**
 * 좌측 가이드라인 탐색 — chapter → topic → 현재 topic의 섹션 앵커를 표시한다.
 * 🔴 **이것이 유일한 목차다.** 우측에 따로 있던 "On this page"는 2026-08-18에 지웠다 —
 *    같은 앵커를 같은 scroll-spy(`guideline-section-navigation`)로 두 곳에 그리고 있었다.
 */
export function GuidelineSideNavigation({
	chapters,
}: {
	chapters: GetGuidelineNavigationOutput['chapters']
}) {
	const pathname = usePathname()
	const currentTopic = chapters
		.flatMap((chapter) => chapter.topics)
		.find((topic) => pathname === topic.href || pathname.startsWith(`${topic.href}/`))
	const currentSections = currentTopic?.sections ?? []
	const activeAnchor = useActiveSectionAnchor(currentSections.map((section) => section.anchor))

	const sectionItems = currentSections
		.filter(
			(section) =>
				!section.parentSectionId ||
				!currentSections.some((parent) => parent.id === section.parentSectionId),
		)
		.map((section) => {
			const children = currentSections.filter((child) => child.parentSectionId === section.id)
			return (
				<SectionNavigationItem
					key={section.id}
					section={section}
					activeAnchor={activeAnchor}
				>
					{children.length > 0 && (
						<Sidebar.Children>
							{children.map((child) => (
								<SectionNavigationItem
									key={child.id}
									section={child}
									activeAnchor={activeAnchor}
								/>
							))}
						</Sidebar.Children>
					)}
				</SectionNavigationItem>
			)
		})

	return (
		<Sidebar.Root
			aria-label="가이드라인 목차"
			className="md:w-[265px]"
			data-slot="guideline-side-navigation"
			footer={<CopyPageLink />}
		>
			<Sidebar.Content>
				<Sidebar.Group>
					{chapters.map((chapter) => {
						// 🔴 챕터는 자기 화면이 없다(2026-08-26). 분류일 뿐이라 인덱스로 보낸다 —
						//    인덱스가 전 챕터의 카드와 토픽 칩을 이미 그린다.
						// 🔴 현재 위치로 강조하지 않는다(2026-09-04). 인덱스에서는 모든 챕터가 같은 링크라
						//    전부 "현재"가 되어 버린다. 챕터는 늘 같은 톤의 링크다.
						return (
							<Sidebar.Item
								key={chapter.id}
								current={false}
								depth={0}
								href="/guideline"
								label={chapter.title}
								tone="subtle"
							>
								<Sidebar.Children>
									{chapter.topics.map((topic) => {
										const topicActive =
											pathname === topic.href ||
											pathname.startsWith(`${topic.href}/`)
										const { sections } = topic

										return (
											<Sidebar.Item
												key={topic.id}
												current={topicActive && !activeAnchor}
												depth={1}
												href={topic.href}
												label={topic.title}
												tone={topicActive ? 'emphasized' : 'subtle'}
											>
												{topicActive && sections.length > 0 && (
													<Sidebar.Children>
														{sectionItems}
													</Sidebar.Children>
												)}
											</Sidebar.Item>
										)
									})}
								</Sidebar.Children>
							</Sidebar.Item>
						)
					})}
				</Sidebar.Group>
			</Sidebar.Content>
		</Sidebar.Root>
	)
}

function SectionNavigationItem({
	section,
	activeAnchor,
	children,
}: {
	section: GetGuidelineNavigationOutput['chapters'][number]['topics'][number]['sections'][number]
	activeAnchor: string | null
	children?: ReactNode
}) {
	const current = section.anchor === activeAnchor
	return (
		<Sidebar.Item
			aria-current={current ? 'location' : undefined}
			current={current}
			depth={section.headingLevel}
			href={section.href}
			label={section.title}
			onClick={(event) => scrollToGuidelineSection(event, section.anchor)}
			tone={current ? 'emphasized' : 'subtle'}
		>
			{children}
		</Sidebar.Item>
	)
}
