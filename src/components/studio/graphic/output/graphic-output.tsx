'use client'

import { useState } from 'react'
import { StudioOutput } from '@/components/studio/shared/studio-output'
import { useGraphicStudio } from '@/features/graphic-generation/hooks/use-graphic-studio'
import type { GraphicExportView } from '@/features/studio-export/hooks/use-graphic-export'
import { resolveDefaultPrintPpi } from '@/features/studio-export/print-policy'
import { acceptsPrintPpi } from '@/features/studio-export/studio-output'
import type { OutputMode } from './output-presets'
import { type GraphicOutputSize, GraphicResolution, GraphicSizeEditor } from './size-editor'

/** 그래픽 Output 카드 — 판 크기(모드·프리셋·W/H·해상도)를 직접 편집한다. 형식·영상·저장은 공용 부품이다. */
export function GraphicOutput({ output }: { output: GraphicExportView }) {
	const { config } = useGraphicStudio()
	const [selectedMode, setSelectedMode] = useState<OutputMode>('digital')
	const [notice, setNotice] = useState('')
	const { view, draft, setSize } = output
	if (!draft) return null
	// 인쇄 계약이 없으면 Mode를 숨기고 Digital로만 다룬다.
	const printable = view.print !== null
	const mode = printable ? selectedMode : 'digital'
	const size: GraphicOutputSize = {
		width: draft.width ?? 300,
		height: draft.height ?? 300,
		ppi: view.print?.ppi ?? resolveDefaultPrintPpi(config.output.print?.ppi),
	}
	const resize = (next: GraphicOutputSize) => {
		// 해상도는 바뀔 때만 계약에 견준다 — print 계약이 없는 프로파일(예: SVG만 허용)에서
		// 크기만 고쳐도 거절되던 문제를 막는다.
		const ppiChanged = next.ppi !== size.ppi
		// 🔴 크기를 먼저 확정한다 — 「픽셀을 다시 잡고 → ppi 확정」 한 쌍에서 앞쪽이 거부되면 뒤쪽도 멈춰야
		//    판형이 조용히 바뀌지 않는다(`setSize`가 거부를 돌려주는 이유).
		if (
			(ppiChanged && !acceptsPrintPpi(config.output, next.ppi)) ||
			!setSize({ width: next.width, height: next.height })
		)
			return setNotice('이 프로파일에서 지원하지 않는 크기 또는 해상도입니다.')
		if (ppiChanged) view.print?.set(next.ppi)
		setNotice('')
	}
	const sizeProps = { mode, size, onResize: resize, onNotice: setNotice }
	return (
		<StudioOutput.Root
			footer={
				<>
					<StudioOutput.Actions save={view.save} busy={view.busy} />
					<StudioOutput.Messages
						error={view.error}
						notices={notice ? [notice, ...view.notices] : view.notices}
					/>
				</>
			}
		>
			<GraphicSizeEditor
				{...sizeProps}
				printable={printable}
				onModeChange={(next) => {
					setSelectedMode(next)
					setNotice('')
				}}
			/>
			<StudioOutput.Format {...view.format} />
			{mode === 'print' && <GraphicResolution {...sizeProps} />}
			{view.video && <StudioOutput.Video {...view.video} />}
		</StudioOutput.Root>
	)
}
