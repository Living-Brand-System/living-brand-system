'use client'

import { Save } from '@carbon/icons-react'
import { useState } from 'react'
import { useStudioCapabilities } from '@/components/studio/shared/studio-capabilities'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { saveTemplateDefaults } from '@/features/template-customization/services/save-template-defaults.client'

/**
 * 「지금 이 상태를 템플릿 기본값으로」 — 썸네일 갱신과 같은 매니저 전용 동작이라 그 옆에 같은 조건으로 둔다.
 * 표시는 여기(`canManageProfiles`)가, 강제는 Payload 템플릿 access가 한다.
 */
export function useTemplateDefaults() {
	const { canManageProfiles } = useStudioCapabilities()
	const { config, canvas } = useTemplateStudio()
	const [saving, setSaving] = useState(false)
	const [message, setMessage] = useState<string | null>(null)

	const save = () => {
		if (saving) return
		setSaving(true)
		setMessage(null)
		void saveTemplateDefaults({ templateId: config.id, ...canvas.defaults() })
			.then(() => setMessage('지금 상태를 이 템플릿의 기본값으로 저장했어요.'))
			.catch((cause: unknown) =>
				setMessage(cause instanceof Error ? cause.message : '기본값을 저장하지 못했어요.'),
			)
			.finally(() => setSaving(false))
	}

	return { canSave: canManageProfiles, saving, message, save }
}

export function TemplateDefaultsButton({
	defaults,
}: {
	defaults: ReturnType<typeof useTemplateDefaults>
}) {
	if (!defaults.canSave) return null
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="지금 상태를 기본값으로 저장"
					disabled={defaults.saving}
					onClick={defaults.save}
					className="text-inverted-foreground hover:bg-transparent hover:text-inverted-foreground/70"
				>
					<Save aria-hidden />
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom" sideOffset={8} className="flex-col items-start">
				<span className="font-medium">지금 상태를 기본값으로 저장</span>
				<span>
					문구·로고 색·생성 이미지(위치·크기·색 포함)를 이 템플릿의 기본값으로 바꿔요.
					모든 사용자가 다음부터 이 상태로 시작해요.
				</span>
				<span>
					배경·텍스트 색·디밍·레이어 표시는 저장되지 않고, 샘플 이미지는 저장할 수 없어요.
					되돌리기는 admin의 버전 기록에서 해요.
				</span>
			</TooltipContent>
		</Tooltip>
	)
}
