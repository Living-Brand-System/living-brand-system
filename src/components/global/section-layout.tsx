import { SidePanelOpen } from '@carbon/icons-react'
import type React from 'react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type SectionLayoutProps = {
	/** 없으면 본문만 그린다 — 진입점을 GlobalHeader가 이미 갖는 섹션(스튜디오)이 그렇다. */
	nav?: React.ReactNode
	children: React.ReactNode
	variant?: 'document' | 'workspace'
}

/**
 * 섹션(가이드라인·검수·제작) 공통 레이아웃 셸 — 사이드 nav + 스크롤 main.
 * 이 셸은 nav·스크롤·랜드마크만 소유하고, 본문 폭과 여백은 ContentFrame이 맡는다.
 */
export function SectionLayout({ nav, children, variant = 'document' }: SectionLayoutProps) {
	// nav가 없으면 사이드바 상태·모바일 트리거·단축키가 전부 대상 없는 기제가 된다 — 셸을 통째로 걷는다.
	if (!nav) {
		return (
			<SectionBody mobileNavigation={false} variant={variant}>
				{children}
			</SectionBody>
		)
	}

	return (
		<SidebarProvider className="h-full min-h-0">
			{/*
			 * 🔴 상단 여백을 셸(SidebarProvider)이 아니라 **두 슬롯이 각각** 갖는다. 셸에 두면
			 * 스크롤 영역 자체가 헤더 아래에서 시작해 본문이 헤더 밑으로 흘러갈 공간이 없다.
			 * nav는 여백을 그대로 유지하고(헤더에 가리면 안 된다), 본문만 헤더까지 올라간다.
			 * 🔴 nav(`Sidebar.Root`)는 `h-full`인 flex 아이템이라 이 상자의 안쪽 높이를 따른다 —
			 *    fixed가 아니므로 여백을 걷으면 함께 올라간다(실측).
			 */}
			<div className="flex shrink-0 pt-[50px] xl:pt-(--global-header-height)">{nav}</div>
			<SectionBody mobileNavigation variant={variant}>
				{children}
			</SectionBody>
		</SidebarProvider>
	)
}

/** nav 옆의 남은 화면을 차지하며 본문·페이지 이동의 세로 크기를 결정한다. */
function SectionBody({
	children,
	mobileNavigation,
	variant,
}: {
	children: React.ReactNode
	mobileNavigation: boolean
	variant: 'document' | 'workspace'
}) {
	return (
		<div
			data-slot="section-scroll-container"
			className={cn(
				'flex h-full min-h-0 min-w-0 flex-1 flex-col items-center overflow-y-auto motion-safe:scroll-smooth',
				variant === 'workspace' && 'lg:overflow-hidden',
			)}
		>
			{mobileNavigation && (
				<SidebarTrigger
					aria-label="목차 접기 또는 펼치기"
					className="mx-4 mt-4 self-start md:hidden"
					size="icon"
				>
					<SidePanelOpen data-icon="inline-start" />
				</SidebarTrigger>
			)}
			{/* 첫 화면은 헤더에 가리지 않고, 스크롤하면 콘텐츠가 헤더 뒤로 지나간다. */}
			<main className="min-h-0 w-full flex-1 pt-[50px] xl:pt-(--global-header-height)">
				{children}
			</main>
		</div>
	)
}
