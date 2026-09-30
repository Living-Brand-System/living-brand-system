'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	downloadSectionAssets,
	type SectionDownload,
} from '@/features/guideline/services/download-section-assets.client'

export function SectionDownloadButton({
	download,
	title,
}: {
	download: SectionDownload
	title: string
}) {
	const running = useRef(false)
	const [state, setState] = useState<'idle' | 'pending' | 'error'>('idle')
	async function run() {
		if (running.current) return
		running.current = true
		setState('pending')
		try {
			await downloadSectionAssets(download)
			setState('idle')
		} catch {
			setState('error')
		} finally {
			running.current = false
		}
	}
	if (!download.assets.length) return null
	return (
		<div data-slot="section-download" className="flex shrink-0 flex-col items-start gap-2">
			<Button
				variant="muted"
				className="border-0 font-medium text-foreground hover:bg-border hover:text-action-hover-foreground focus:bg-border focus:text-action-hover-foreground active:text-foreground"
				disabled={state === 'pending'}
				aria-busy={state === 'pending'}
				aria-label={`${title} 에셋 전체 다운로드`}
				onClick={run}
			>
				{state === 'pending'
					? 'ZIP 준비 중…'
					: state === 'error'
						? '다시 다운로드'
						: '전체 다운로드'}
			</Button>
			{state === 'error' && (
				<p role="alert" className="text-destructive text-sm">
					다운로드하지 못했습니다. 다시 시도해 주세요.
				</p>
			)}
		</div>
	)
}
