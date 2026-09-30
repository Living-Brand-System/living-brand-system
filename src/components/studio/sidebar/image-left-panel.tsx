'use client'

import { Controller } from '@/components/shared/controller'
import { ImageBestSamplePanel } from '@/components/studio/image/image-best-sample-panel'
import { ImageProfilePicker } from '@/components/studio/image/image-profile-picker'
import { ImageSettingPanel } from '@/components/studio/image/image-setting-panel'
import { browseEmptyMessage } from '@/components/studio/shared/browse-status'
import { PreviewRefreshSlot } from '@/components/studio/shared/preview-refresh-slot'
import type { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import { StudioLeftPanel } from '@/components/studio/sidebar/studio-left-panel'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import type { ImageExportView } from '@/features/studio-export/hooks/use-image-export'

/**
 * Image 스튜디오의 왼쪽 패널 — **무엇을 캔버스에 올릴지 고르는 자리**다(사용자 지시, 2026-09-21).
 *
 * 🔑 좌우 기준은 「좌 → 우로 갈수록 구체적이고 자주 만지는 것」이다. 좌측은 개체를 다른 것으로
 *    바꾸는 자리(프로파일 교체 · 과거 결과 불러오기)이고, 우측은 지금 올라와 있는 것을 만지는
 *    자리다. Template 패널과 같은 기준이다.
 * 🔴 프로파일 교체 카드가 우측 사이드바에서 여기로 옮겨 왔다 — 2026-09-03에 「프로파일은 옮기지
 *    마」로 되돌렸던 것이 2026-09-21에 다시 뒤집혔다. Graphic 스튜디오는 그대로 둔다.
 */
export function ImageLeftPanel({
	download,
	preview,
}: {
	/** 내보내기 — 맨 아래 상자가 소유한다. */
	download: ImageExportView
	/** 프로파일 미리보기 갱신 — 페이지 선택 카드가 자기 그림을 다시 굽는다. */
	preview: ReturnType<typeof useProfilePreview>
}) {
	const { config, profiles } = useImageStudio()

	return (
		<StudioLeftPanel
			page={
				<PreviewRefreshSlot error={preview.error} messageClassName="px-4 pb-4">
					<Controller.AssetCard
						title={config.name}
						buttonLabel="Change"
						// 🔴 카드가 왼쪽 패널에 있으므로 브라우저는 오른쪽(캔버스 쪽)으로 뜬다.
						panelSide="right"
						aria-label="프로파일 변경"
						tabs={['Image Profiles']}
						previewImage={preview.image ?? config.previewImage}
						onRefreshPreview={preview.canRefresh ? preview.refresh : undefined}
						refreshingPreview={preview.refreshing}
						empty={browseEmptyMessage(
							profiles.browse.status,
							(profiles.browse.data?.length ?? 0) > 1,
							'교체할 다른 이미지 프로파일이 없습니다.',
						)}
						// 🔴 상자를 꽉 채운다 — 자기 radius를 버리고 상자의 overflow-hidden이 잘라 주게 둔다.
						className="min-h-32 items-start rounded-none"
					>
						<ImageProfilePicker />
					</Controller.AssetCard>
				</PreviewRefreshSlot>
			}
			footer={<ImageSettingPanel download={download} />}
		>
			<ImageBestSamplePanel />
		</StudioLeftPanel>
	)
}
