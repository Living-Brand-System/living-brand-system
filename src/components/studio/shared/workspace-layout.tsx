import type { ReactNode } from 'react'
import { ControllerRoot } from '@/components/shared/controller/layout'

type WorkspaceLayoutProps = {
	left: ReactNode
	right: ReactNode
	children: ReactNode
}

/** 작업 영역은 세 열만 배치한다. 카드 구성과 스크롤은 각 패널이 소유한다. */
export function WorkspaceLayout({ left, right, children }: WorkspaceLayoutProps) {
	return (
		<div
			data-slot="studio-layout-workspace"
			className="grid min-h-0 lg:h-full lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-rows-[minmax(0,1fr)]"
		>
			<div data-slot="studio-layout-left" className="min-h-0 min-w-0">
				{left}
			</div>
			{children}
			{right}
		</div>
	)
}

type PanelProps = { top: ReactNode; bottom: ReactNode }

/** 왼쪽은 카드 묶음 전체가 스크롤된다. 콘텐츠가 비어도 두 카드는 남는다. */
export function SelectionPanel({ top, settings, bottom }: PanelProps & { settings?: ReactNode }) {
	return (
		<aside
			aria-label="작업 대상과 출력"
			data-slot="studio-layout-selection"
			className="scrollbar-none flex min-h-0 flex-col gap-4 p-4 lg:h-full lg:w-88 lg:overflow-y-auto"
		>
			<ControllerRoot
				data-slot="studio-layout-identity"
				className="aspect-square shrink-0 lg:h-auto"
			>
				{top}
			</ControllerRoot>
			{settings}
			<ControllerRoot
				data-slot="studio-layout-output"
				className="shrink-0 px-4 pt-1 pb-4 lg:h-auto"
			>
				{bottom}
			</ControllerRoot>
		</aside>
	)
}

type WorkspaceCanvasProps = { children: ReactNode; controls?: ReactNode }

/** 출력물과 보기 도구는 별도 행이다. 도구 높이를 제외한 공간에서 출력물을 맞춘다. */
export function WorkspaceCanvas({ children, controls }: WorkspaceCanvasProps) {
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
			{controls && (
				<div
					data-slot="studio-layout-canvas-controls"
					className="flex shrink-0 justify-center"
				>
					{controls}
				</div>
			)}
		</section>
	)
}
