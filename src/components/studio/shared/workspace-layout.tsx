import type { ReactNode } from 'react'
import { Controller } from '@/components/shared/controller'

type WorkspaceLayoutProps = {
	left: ReactNode
	right: ReactNode
	children: ReactNode
	/** 세 열 전체 위에 겹치는 층(플로팅 층) — 열 배치에 끼지 않는다. */
	layer?: ReactNode
}

/** 작업 영역은 세 열만 배치한다. 카드 구성과 스크롤은 각 패널이 소유한다. */
export function WorkspaceLayout({ left, right, children, layer }: WorkspaceLayoutProps) {
	return (
		<div
			data-slot="studio-layout-workspace"
			className="relative grid min-h-0 lg:h-full lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-rows-[minmax(0,1fr)]"
		>
			<div data-slot="studio-layout-left" className="min-h-0 min-w-0">
				{left}
			</div>
			{children}
			{right}
			{layer}
		</div>
	)
}

type PanelProps = {
	top: ReactNode
	/** `Controller.Section`들 — 패널 규칙(docs/features/studio.md). */
	bottom: ReactNode
}

/** 왼쪽 카드 묶음 — 카드는 내용 높이이고 스크롤하지 않는다(docs/features/studio.md 패널 높이 규칙). 콘텐츠가 비어도 두 카드는 남는다. */
export function SelectionPanel({ top, bottom }: PanelProps) {
	return (
		<aside
			aria-label="작업 대상과 출력"
			data-slot="studio-layout-selection"
			className="flex min-h-0 flex-col gap-4 p-4 lg:h-full lg:w-88"
		>
			<Controller.Panel data-slot="studio-layout-identity" square>
				<Controller.Section bleed>{top}</Controller.Section>
			</Controller.Panel>
			{/* 아래 카드의 내용은 Section들이다 — 템플릿은 Layers·Output 둘(사이 선은 Panel이 긋는다), 다른 스튜디오는 Output 하나. */}
			<Controller.Panel data-slot="studio-layout-output">{bottom}</Controller.Panel>
		</aside>
	)
}

/** 가운데 작업 결과 — 출력물을 남은 공간 안에 맞춘다. */
export function WorkspaceCanvas({ children }: { children: ReactNode }) {
	return (
		<section
			aria-label="작업 결과"
			data-slot="studio-layout-canvas"
			className="flex min-h-96 min-w-0 flex-col gap-4 p-4 md:p-6 lg:h-full lg:min-h-0"
		>
			<div
				data-slot="studio-layout-stage"
				className="flex min-h-0 flex-1 items-center justify-center overflow-auto"
			>
				{children}
			</div>
		</section>
	)
}
