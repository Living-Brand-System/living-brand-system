'use client'

import { Controller } from '@/components/shared/controller'
import { browseEmptyMessage } from '@/components/studio/shared/browse-status'
import { PreviewRefreshSlot } from '@/components/studio/shared/preview-refresh-slot'
import type { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import { StudioLeftPanel } from '@/components/studio/sidebar/studio-left-panel'
import { TemplateLayerPanel } from '@/components/studio/sidebar/template-layer-panel'
import { TemplateProfilePicker } from '@/components/studio/template/template-profile-picker'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/**
 * Template 스튜디오의 왼쪽 패널 — **페이지 선택**과 **공통된 것**이 앉는다.
 *
 * 🔑 좌우 기준은 「좌 → 우로 갈수록 구체적이고 자주 만지는 것」이다(사용자 지시, 2026-09-10).
 *    LTR 읽기 방향과 같다.
 * 🔴 아래 상자는 **레이어 패널**이다(사용자 지시, 2026-09-10). 무엇을 고르는 자리는 좌측이고,
 *    고른 것을 만지는 자리가 우측이다 — 「좌 → 우로 갈수록 구체적이고 자주 만지는 것」.
 * 🔴 값은 prop으로 받지 않고 컨텍스트에서 직접 읽는다 — 사이드바가 넘겨 주던 22개 prop이
 *    전부 `useTemplateStudio()`에서 나오던 것이라, 옮기면서 그 경유를 없앤다.
 */
export function TemplateLeftPanel({
	preview,
}: {
	/** 프로파일 미리보기 갱신 — 페이지 선택 카드가 자기 그림을 다시 굽는다. */
	preview: ReturnType<typeof useProfilePreview>
}) {
	const { navigation, config } = useTemplateStudio()

	const templateCount = (navigation.browse.data ?? []).reduce(
		(total, category) => total + category.templates.length,
		0,
	)

	return (
		<StudioLeftPanel
			// 🔑 페이지 선택은 위 상자 맨 위에 고정된다 — 공통된 것이 그 아래에 쌓인다.
			page={
				<PreviewRefreshSlot error={preview.error} messageClassName="px-4 pb-4">
					<Controller.AssetCard
						title={config.name}
						subtitle={navigation.categoryTitle ?? undefined}
						buttonLabel="Change"
						// 🔴 카드가 왼쪽 패널에 있으므로 브라우저는 **오른쪽**(캔버스 쪽)으로 뜬다.
						panelSide="right"
						aria-label="템플릿 변경"
						tabs={['Templates']}
						previewImage={preview.image ?? config.previewImage}
						onRefreshPreview={preview.canRefresh ? preview.refresh : undefined}
						refreshingPreview={preview.refreshing}
						empty={browseEmptyMessage(
							navigation.browse.status,
							templateCount > 1,
							'교체할 다른 템플릿이 없습니다.',
						)}
						// 🔴 상자를 꽉 채운다 — 자기 radius를 버리고 상자의 `overflow-hidden`이
						//    잘라 주게 둔다(안 그러면 모서리에 상자 바닥색이 초승달로 남는다).
						className="min-h-32 items-start rounded-none"
					>
						<TemplateProfilePicker />
					</Controller.AssetCard>
				</PreviewRefreshSlot>
			}
		>
			{/* 🔴 위치를 정하는 것은 이 한 줄뿐이다 — 패널은 자기 자리를 모른다(컨텍스트에서 직접
			    읽는다). 우측이나 헤더로 옮기려면 이 줄을 그쪽으로 옮기면 된다. */}
			<TemplateLayerPanel />
		</StudioLeftPanel>
	)
}
