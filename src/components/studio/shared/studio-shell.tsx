'use client'

import type { ReactNode } from 'react'
import { ControllerBrowser } from '@/components/shared/controller'
import {
	ControlPanel,
	type ControlPanelComposition,
	type ControlPanelExtras,
} from '@/components/studio/shared/control-panel'
import { PanelRenderScope } from '@/components/studio/shared/panel-render'
import {
	StudioSelectionCard,
	type StudioSelectionCardProps,
} from '@/components/studio/shared/studio-selection-card'
import {
	SelectionPanel,
	WorkspaceCanvas,
	WorkspaceLayout,
} from '@/components/studio/shared/workspace-layout'

/**
 * 스튜디오 한 화면의 표면 모델 — 무엇을 어디에 그리나는 셸이, 무엇을 그리나는 이 모델이 정한다.
 * 스튜디오(Template·Image·Graphic)는 세션에서 이 모델을 만들기만 하고 셸을 조립하지 않는다.
 */
export type StudioSurface = {
	/** 왼쪽 위 — 작업 대상 카드(Figma 448:9791 Select Card). */
	selection: StudioSelectionCardProps
	/** 왼쪽 아래 카드 — Output(템플릿은 레이어 목록 + Output). */
	output: ReactNode
	/**
	 * 왼쪽 위에 겹치는 자리 — 템플릿의 편집 오버레이(대상 카드·설정 카드·완료/취소)가 기본 카드 묶음을 감싼다.
	 * 없으면 기본 카드 묶음만 선다.
	 */
	frame?: (master: ReactNode) => ReactNode
	/** 가운데 — 작업 결과. */
	canvas: ReactNode
	panel: {
		/**
		 * 오른쪽 패널이 무엇을 편집하나 — 바뀌면 패널을 새로 시작한다(위젯 내부 상태·탭 선택이 이어지지 않게).
		 * 프로파일을 바꾸면 바뀌고, 같은 대상 안의 조작으로는 바뀌지 않는다.
		 */
		identity: string | number
		/** 자리마다 앞쪽부터 먼저 채운 것이 그린다(`ControlPanel`). */
		compositions: readonly ControlPanelComposition[]
		extras?: ControlPanelExtras
		/** 같은 패널 안에서 편집 대상이 바뀌는 스튜디오(템플릿의 레이어) — 바뀌면 탭 선택만 Basic으로 돌아간다. */
		target?: string
	}
}

/**
 * 스튜디오 공통 셸(docs/10 §3.7) — 왼쪽(대상 카드·Output), 가운데(캔버스), 오른쪽(패널)을 **한 번만** 조립한다.
 * 🔑 패널은 셸이 소유하는 인스턴스 하나다. 화면 갈래마다 패널을 따로 그리면 갈래가 바뀔 때 패널·레일·고정 카드가
 *    통째로 다시 마운트된다(템플릿에서 실측). 패널 렌더 범위도 여기 깔아 둔다 — 첫 진입만 움직이지 않는다.
 */
export function StudioShell({ surface }: { surface: StudioSurface }) {
	const { selection, output, frame, canvas, panel } = surface
	const master = <SelectionPanel top={<StudioSelectionCard {...selection} />} bottom={output} />
	return (
		<WorkspaceLayout
			left={
				<ControllerBrowser.Root className="min-h-0">
					{frame ? frame(master) : master}
				</ControllerBrowser.Root>
			}
			right={
				<div data-slot="studio-sidebar" className="h-full min-h-0">
					<PanelRenderScope>
						<ControllerBrowser.Root className="min-h-0 h-full">
							<ControlPanel
								key={panel.identity}
								compositions={panel.compositions}
								extras={panel.extras}
								target={panel.target}
							/>
						</ControllerBrowser.Root>
					</PanelRenderScope>
				</div>
			}
		>
			<WorkspaceCanvas>{canvas}</WorkspaceCanvas>
		</WorkspaceLayout>
	)
}
