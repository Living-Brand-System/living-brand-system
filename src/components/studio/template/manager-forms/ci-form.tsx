'use client'

import { ManagerLinkForm } from '@/components/studio/template/manager-forms/link-form'
import { updateTemplateNodeConfig } from '@/components/studio/template/manager-forms/template-html-writes'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CI_VARIANTS } from '@/features/template-core/domain/ci-variants'
import { templateSymbolColorId } from '@/features/template-customization/domain/template-layer-composition'
import {
	partitionTemplateSlots,
	type TemplateStudioConfig,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateManagerData } from '@/features/template-customization/hooks/use-template-manager-data'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import type { TemplateNodeConfigMap } from '@/types/template'

/** `control:<열쇠>`의 열쇠가 CI 레이어의 색 버전 줄(`<레이어 id>.color`)이면 그 레이어. `text.color` 등은 아니다. */
function findCiSlot(config: TemplateStudioConfig, controlId: string) {
	return partitionTemplateSlots(config.template.slots).vector.find(
		(slot) => templateSymbolColorId(slot.id) === controlId,
	)
}

/** 등록표의 `accepts` — 공용 컨트롤 줄 중 CI 색 버전 줄만 받는다. */
export function isTemplateCiColorKey(config: TemplateStudioConfig, controlId: string): boolean {
	return findCiSlot(config, controlId) !== undefined
}

/**
 * CI 색 버전 줄의 관리 폼(`control:<레이어 id>.color`) — 템플릿에 끼워 둘 색 버전(`overrides[레이어].vectorAsset`)을
 * 고른다. 로고 파일·색 버전 목록 자체는 파운데이션(「로고」)이라 링크로 보낸다.
 * ponytail: 단색 모델이 바뀔 예정이라(단색 한 장 + SVG 칠) 폼은 얇게 둔다.
 */
export function TemplateCiColorManagerForm({ controlId }: { controlId: string }) {
	const { config } = useTemplateStudio()
	const slot = findCiSlot(config, controlId)
	const manager = useTemplateManagerData<{ overrides?: TemplateNodeConfigMap | null }>(
		config.id,
		['overrides'],
	)
	if (!slot) return null
	// 발행본에서 푼 값(slot.variant)보다 방금 저장한 초안 값이 앞선다.
	const savedId = manager.data?.overrides?.[slot.id]?.vectorAsset?.id
	const current = slot.variants.find((option) => option.id === savedId)?.variant ?? slot.variant
	const currentLogoId = slot.variants.find((option) => option.variant === current)?.id
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1.5">
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					spacing={0}
					value={current ?? ''}
					disabled={manager.busy}
					onValueChange={(variant) => {
						const option = slot.variants.find((item) => item.variant === variant)
						if (!option || variant === current) return
						void manager.save(
							() =>
								updateTemplateNodeConfig(
									config.id,
									slot.id,
									(nodeConfig) => ({
										...nodeConfig,
										vectorAsset: {
											collection: 'brand-logos',
											id: option.id,
											src: option.src,
										},
									}),
									'기본 색 버전을 저장하지 못했어요.',
								),
							'기본 색 버전을 저장하지 못했어요.',
						)
					}}
					aria-label={`${slot.label}: 기본 색 버전`}
					className="w-full flex-wrap"
				>
					{slot.variants.map(({ variant }) => (
						<ToggleGroupItem key={variant} value={variant}>
							{CI_VARIANTS.find(({ value }) => value === variant)?.label ?? variant}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<FormNote
					error={manager.error}
					busy={manager.busy}
					note="템플릿에 끼워 둘 색 버전이에요. 고르면 모든 사용자에게 바로 반영돼요."
				/>
			</div>
			<ManagerLinkForm
				note="색 버전 목록과 로고 파일은 「로고」에서 관리해요. 같은 CI 모양에 CI 색상을 지정한 로고가 여기 선택지로 나와요."
				links={[
					{
						label: '로고 열기',
						href:
							currentLogoId === undefined
								? '/admin/collections/brand-logos'
								: `/admin/collections/brand-logos/${currentLogoId}`,
					},
				]}
			/>
		</div>
	)
}
