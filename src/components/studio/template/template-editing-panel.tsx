'use client'

import { ControllerRoot } from '@/components/shared/controller'
import type { ControlPanelComposition } from '@/components/studio/panel/control-panel'
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

/**
 * 프로파일 조정 층(플로팅 층)의 왼쪽 카드 — 대상 카드와 설정 카드(방식 행·취소/완료).
 * 층을 띄우고 아래 층을 밀어내는 것은 셸(`StudioFloatingLayer`)이, 값 복원과 요청 무효화는 Provider가 소유한다.
 */
export function TemplateEditingPanel({
	settings,
}: {
	/** 설정 카드의 방식 행 — 패널 모델(`useTemplatePanel`)의 settings 슬롯. */
	settings: ControlPanelComposition | null
}) {
	const { editing } = useTemplateStudio()
	const targetId = editing.targetId
	const target = editing.target
	const graphic = target?.mode === 'graphic'
	const image = target?.mode === 'image'
	return (
		<>
			<ControllerRoot className="aspect-square shrink-0 lg:h-auto">
				<StudioSelectionCard
					title={target?.name ?? (image ? 'Image' : graphic ? 'Graphic' : 'Background')}
					subtitle={target?.subtitle}
					image={target?.preview}
					onReset={editing.reset}
					disabled={editing.busy}
					managerTarget={`profile:${targetId}`}
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
			<TemplateSettings
				settings={settings}
				actions={
					<fieldset className="flex gap-2" aria-label="편집 완료 또는 취소">
						<Button
							variant="outline"
							className="h-11 flex-1 rounded-lg border-border"
							onClick={editing.cancel}
						>
							취소
						</Button>
						<Button
							variant="muted"
							className="h-11 flex-1 rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/15"
							disabled={editing.busy}
							onClick={editing.complete}
						>
							완료
						</Button>
					</fieldset>
				}
			/>
		</>
	)
}
