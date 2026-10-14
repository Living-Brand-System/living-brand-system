'use client'

import { Renew } from '@carbon/icons-react'
import { PreviewFrameDialog } from '@/components/studio/shared/preview-frame-dialog'
import type { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import {
	TemplateCategoryManagerForm,
	TemplateNameManagerForm,
} from '@/components/studio/template/manager-forms/identity-forms'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Typography } from '@/components/ui/typography'

/**
 * 선택 카드의 관리 폼(`card:`) — 카드 하나가 한 대상이고, 열면 제목(이름·주소·설명)·분류·썸네일을 한 패널에서 고친다
 * (사용자 2026-10-14). 카드 안 글자·아이콘에는 따로 대상을 두지 않는다.
 */
export function TemplateCardManagerForm({
	preview,
}: {
	preview: ReturnType<typeof useProfilePreview>
}) {
	return (
		<div className="flex flex-col gap-4">
			<TemplateNameManagerForm />
			<Separator />
			<TemplateCategoryManagerForm />
			<Separator />
			<TemplateThumbnailManagerForm preview={preview} />
		</div>
	)
}

/**
 * 썸네일 — 지금 캔버스를 찍어 이 템플릿의 썸네일로. 찍은 뒤 맞추는 창은 카드의
 * 「미리보기 갱신」과 같은 것이 뜬다(같은 `useProfilePreview` 인스턴스).
 */
function TemplateThumbnailManagerForm({
	preview,
}: {
	preview: ReturnType<typeof useProfilePreview>
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="aspect-square w-full overflow-hidden bg-muted">
				{preview.image && (
					// biome-ignore lint/performance/noImgElement: 업로드 URL은 next/image 최적화 대상이 아니다
					<img
						src={preview.image.url}
						alt={preview.image.alt}
						className="size-full object-cover"
					/>
				)}
			</div>
			<Button
				size="sm"
				variant="outline"
				disabled={!preview.canRefresh || preview.refreshing}
				onClick={preview.refresh}
			>
				<Renew aria-hidden data-icon="inline-start" />
				지금 캔버스로 썸네일 만들기
			</Button>
			<Typography
				size="xs"
				tone={preview.error ? 'destructive' : 'muted'}
				role={preview.error ? 'alert' : undefined}
			>
				{preview.error ?? '템플릿 첫 화면 카드와 선택 카드에 보이는 그림이에요.'}
			</Typography>
			{/* 찍은 판을 정사각 틀에 맞추는 창 — 카드의 아이콘 버튼을 없애며(사용자 2026-10-14) 여기로 왔다. */}
			{preview.draft && (
				<PreviewFrameDialog
					src={preview.draft}
					mode={preview.mode}
					saving={preview.refreshing}
					error={preview.error}
					onSave={preview.save}
					onCancel={preview.cancel}
				/>
			)}
		</div>
	)
}
