'use client'
import { Renew } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import type { useProfilePreview } from './use-profile-preview'
export function PreviewRefreshButton({
	preview,
}: {
	preview: ReturnType<typeof useProfilePreview>
}) {
	return preview.canRefresh ? (
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label="미리보기 갱신"
			disabled={preview.refreshing}
			onClick={preview.refresh}
			className="text-inverted-foreground hover:bg-transparent hover:text-inverted-foreground/70"
		>
			<Renew aria-hidden />
		</Button>
	) : null
}
