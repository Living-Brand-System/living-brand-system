'use client'

import Image from 'next/image'
import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { downloadBlob } from '@/lib/object-url'
import type { DownloadFormat } from './displays/definition'
import { DISPLAY_DOWNLOAD_BUTTON } from './displays/dynamics/surface'

type DisplayDownloadAction = {
	format: DownloadFormat
	label: string
	download: () => Promise<{ filename: string; blob: Blob }>
}

const ActionsContext = createContext<{
	slot: HTMLDivElement | null
	setSlot: (slot: HTMLDivElement | null) => void
	formats: readonly DownloadFormat[]
} | null>(null)

/** 서버 콘텐츠는 children으로 받고 실행 콜백은 위젯의 클라이언트 트리에 남긴다. */
export function CardActionsProvider({
	formats,
	children,
}: {
	formats: readonly DownloadFormat[]
	children: ReactNode
}) {
	const [slot, setSlot] = useState<HTMLDivElement | null>(null)
	const context = useMemo(() => ({ slot, setSlot, formats }), [slot, formats])
	return <ActionsContext.Provider value={context}>{children}</ActionsContext.Provider>
}

/** 프레임 안의 공통 액션 자리. 지원하지 않는 카드에는 공간을 만들지 않는다. */
export function CardActions() {
	const context = useContext(ActionsContext)
	if (!context) return null
	return (
		<div
			ref={context.setSlot}
			data-slot="card-actions"
			className="absolute top-6 right-6 z-10 flex max-w-[calc(100%-3rem)] flex-col items-end gap-2"
		/>
	)
}

/** 위젯은 동작만 제공하고 공통 버튼을 카드 액션 자리로 보낸다. */
export function DisplayDownload(action: DisplayDownloadAction) {
	const context = useContext(ActionsContext)
	if (!context?.slot || !context.formats.includes(action.format)) return null
	return createPortal(<DownloadAction {...action} />, context.slot)
}

function DownloadAction({ label, download }: DisplayDownloadAction) {
	const [pending, setPending] = useState(false)
	const [failed, setFailed] = useState(false)
	const running = useRef(false)
	const run = async () => {
		if (running.current) return
		running.current = true
		setPending(true)
		setFailed(false)
		try {
			const file = await download()
			downloadBlob(file.blob, file.filename)
		} catch {
			setFailed(true)
		} finally {
			running.current = false
			setPending(false)
		}
	}
	return (
		<>
			<Button
				type="button"
				variant="outline"
				className={`border-0 ${DISPLAY_DOWNLOAD_BUTTON}`}
				size="icon-lg"
				shape="pill"
				aria-label={pending ? '파일 준비 중' : label}
				title={label}
				disabled={pending}
				aria-busy={pending}
				onClick={() => void run()}
			>
				<Image
					src="/icons/guideline/download.svg"
					alt=""
					width={24}
					height={24}
					className="size-6 shrink-0"
				/>
			</Button>
			{failed && (
				<p role="alert" className="rounded-md bg-background p-2 text-destructive text-sm">
					다운로드하지 못했습니다. 다시 시도해 주세요.
				</p>
			)}
		</>
	)
}
