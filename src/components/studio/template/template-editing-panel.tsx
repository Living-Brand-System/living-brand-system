'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { ControllerRoot } from '@/components/shared/controller/layout'
import {
	StudioSelectionCard,
	StudioSelectionChange,
} from '@/components/studio/shared/studio-selection-card'
import { TemplateSettings } from '@/components/studio/template/template-controls'
import {
	TemplateGraphicSelection,
	TemplateImageSelection,
} from '@/components/studio/template/template-media-controls'
import { Button } from '@/components/ui/button'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/** 두 화면의 편집 진입·이탈 UI. 값 복원과 요청 무효화는 Provider가 소유한다. */
export function TemplateEditingPanel({ children }: { children: ReactNode }) {
	const { editing, config } = useTemplateStudio()
	const panel = useRef<HTMLElement>(null)
	const targetId = editing.targetId
	useEffect(() => {
		if (!targetId) return
		const previous =
			document.activeElement instanceof HTMLElement ? document.activeElement : null
		const headers = Array.from(
			document.querySelectorAll<HTMLElement>(
				'[data-slot="navigation-header"], [data-slot="studio-layout-header"]',
			),
		)
		const states = headers.map((header) => header.inert)
		for (const header of headers) header.inert = true
		panel.current?.focus()
		return () => {
			headers.forEach((header, index) => {
				header.inert = states[index]
			})
			previous?.focus()
		}
	}, [targetId])
	const target = editing.target
	const graphic = target?.mode === 'graphic'
	const image = target?.mode === 'image'
	return (
		<div className="relative h-full min-h-0">
			<div
				inert={Boolean(targetId)}
				className={targetId ? 'h-full -translate-x-3 opacity-25' : 'h-full'}
			>
				{children}
			</div>
			{targetId && (
				<section
					ref={panel}
					tabIndex={-1}
					aria-label="선택한 레이어 편집"
					className="absolute inset-0 flex min-h-0 flex-col gap-3 bg-background p-4 outline-none"
				>
					<div className="min-h-0 flex-1 overflow-y-auto">
						<ControllerRoot className="mb-4 aspect-square shrink-0 lg:h-auto">
							<StudioSelectionCard
								title={
									target?.name ??
									(image ? 'Image' : graphic ? 'Graphic' : 'Background')
								}
								subtitle={config.name}
								image={target?.preview}
								onReset={editing.reset}
								disabled={editing.busy}
								actions={
									(image || graphic) && (
										<StudioSelectionChange
											label={graphic ? '그래픽 변경' : '이미지 프로파일 변경'}
											disabled={editing.busy}
										>
											{graphic ? (
												<TemplateGraphicSelection />
											) : (
												<TemplateImageSelection />
											)}
										</StudioSelectionChange>
									)
								}
							/>
						</ControllerRoot>
						<TemplateSettings />
					</div>
					<fieldset className="flex shrink-0 gap-2" aria-label="편집 완료 또는 취소">
						<Button variant="muted" className="h-11 flex-1" onClick={editing.cancel}>
							취소
						</Button>
						<Button
							className="h-11 flex-1"
							disabled={editing.busy}
							onClick={editing.complete}
						>
							완료
						</Button>
					</fieldset>
				</section>
			)}
		</div>
	)
}
