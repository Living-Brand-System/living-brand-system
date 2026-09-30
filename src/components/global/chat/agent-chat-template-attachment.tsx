'use client'

import { DocumentDownload, DocumentPdf, Download } from '@carbon/icons-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
} from '@/components/ui/attachment'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import type { AgentTemplateImageAttachment } from '@/features/agent-chat/services/agent-template-request.service'
import {
	type TemplateExportMetadata,
	useTemplateExport,
} from '@/features/studio-export/hooks/use-template-export'
import { composeTemplateHtml } from '@/features/template-core/runtime/compose-template-html.client'
import { isEmptyTemplateSessionPatch } from '@/features/template-customization/domain/template-session-patch'
import { useTemplateAuthoringHandoff } from '@/features/template-customization/providers/template-authoring-handoff'
import { createTemplateRasterArtifact } from '@/features/template-customization/runtime/template-runtime.client'
import { getStudioTemplateRoute } from '@/lib/routes'
import { createControllerValues } from '@/modules/studio-controller/controller-definition'

/**
 * 아직 생성되지 않은 이미지 슬롯을 미리보기에서 **비워 보이게** 만드는 CSS.
 *
 * 🔴 첨부 미리보기는 텍스트만 합성한다 — 이미지는 「스튜디오에 적용」 시점에 생성되므로 준비 단계엔
 *    없다. 그래서 그 자리에 **템플릿의 저작 이미지가 그대로 남아** 있고, 썸네일에서 면적을 가장 많이
 *    차지하는 것이 그것이라 값이 바뀌었는데도 "그대로네"로 읽힌다(2026-08-25 사용자 지적).
 * 🔑 준비 단계에 실제로 생성하지 않는다 — 챗이 수 초 멈추고, 적용하지 않을 이미지에 비용이 나간다.
 *    대신 그 자리가 **채워질 자리임**을 표시해 미리보기가 최종이라고 말하지 않게 한다.
 * 🔑 프롬프트를 받은 슬롯만 흐려진다. 사용자가 이미지를 요청하지 않았으면 저작 이미지가 그대로 맞다.
 */
function pendingImageSlotCss(nodeIds: readonly string[]): string {
	if (nodeIds.length === 0) return ''
	const selector = nodeIds
		.map(
			(nodeId) =>
				`[data-slot="attachment-media"] [data-node-id="${nodeId.replace(/["\\]/g, '\\$&')}"]`,
		)
		.join(',')
	return `${selector}{filter:grayscale(1) opacity(0.2)}`
}

const PREVIEW_WIDTH = 280

type AgentChatTemplateAttachmentProps = {
	attachment: AgentTemplateImageAttachment
}

/** html 첨부: 슬롯 값을 base html에 합성해 미리보기·다운로드한다 (Create 화면과 동일 렌더). */
export function AgentChatTemplateAttachment({ attachment }: AgentChatTemplateAttachmentProps) {
	const { send } = useTemplateAuthoringHandoff()
	const filledText = attachment.patch.text ?? {}
	const pendingImages = Object.entries(attachment.patch.images ?? {})
	const composedHtml = useMemo(
		() =>
			composeTemplateHtml(
				attachment.html,
				Object.fromEntries(
					Object.entries(attachment.patch.text ?? {}).map(([nodeId, text]) => [
						nodeId,
						{ text },
					]),
				),
			),
		[attachment.html, attachment.patch.text],
	)
	const exportMetadata: TemplateExportMetadata = {
		fileName: attachment.name,
		width: attachment.width,
		height: attachment.height,
		// 채팅 첨부에는 배율 컨트롤이 없다 — 스튜디오에서만 배율을 고른다.
		maxScale: 1,
		controller: {
			groups: attachment.controller.groups,
			values: {
				...createControllerValues(attachment.controller.groups),
				// 🔑 여기서만 `text:` 접두를 붙인다 — 내보내기 metadata는 컨트롤러 **control id** 공간이다.
				...Object.fromEntries(
					Object.entries(filledText).map(([nodeId, text]) => [`text:${nodeId}`, text]),
				),
			},
		},
	}
	const output = useTemplateExport({
		artifact: () =>
			createTemplateRasterArtifact({
				height: attachment.height,
				html: composedHtml,
				width: attachment.width,
			}),
		capability: attachment.output,
		metadata: exportMetadata,
	})

	return (
		<TemplateAttachmentFrame
			name={attachment.name}
			description={`${attachment.output.formats.map((format) => format.toUpperCase()).join(' · ')} 출력`}
			// 미리보기가 최종이 아니라는 것과, 그 자리에 무엇이 들어갈지를 함께 말한다.
			pendingNote={
				pendingImages.length > 0
					? `이미지는 적용할 때 생성됩니다 — ${pendingImages
							.map(([, image]) => image.prompt)
							.filter(Boolean)
							.join(' / ')}`
					: undefined
			}
			isExporting={output.busy}
			exportError={output.error}
			onExport={output.canExportFormat('png') ? () => output.runFormat('png') : undefined}
			onExportTiff={
				output.canExportFormat('tiff') ? () => output.runFormat('tiff') : undefined
			}
			onExportPdf={output.canExportFormat('pdf') ? () => output.runFormat('pdf') : undefined}
			applyHref={
				isEmptyTemplateSessionPatch(attachment.patch)
					? undefined
					: getStudioTemplateRoute(attachment.slug)
			}
			onApply={
				isEmptyTemplateSessionPatch(attachment.patch)
					? undefined
					: () => send({ templateId: attachment.templateId, patch: attachment.patch })
			}
		>
			{pendingImages.length > 0 && (
				<style>{pendingImageSlotCss(pendingImages.map(([nodeId]) => nodeId))}</style>
			)}
			<ScaledMedia contentWidth={attachment.width}>
				{(scale) => (
					<div
						style={{
							width: attachment.width * scale,
							height: attachment.height * scale,
						}}
					>
						<div
							style={{
								width: attachment.width,
								height: attachment.height,
								transform: `scale(${scale})`,
								transformOrigin: 'top left',
							}}
							// biome-ignore lint/security/noDangerouslySetInnerHtml: 서버 컨버터가 만든 inline-style HTML(스크립트 없음) — Create 화면과 동일 렌더
							dangerouslySetInnerHTML={{ __html: composedHtml }}
						/>
					</div>
				)}
			</ScaledMedia>
		</TemplateAttachmentFrame>
	)
}

function TemplateAttachmentFrame({
	name,
	description = '템플릿 이미지',
	isExporting,
	exportError,
	onExport,
	onExportPdf,
	onExportTiff,
	applyHref,
	onApply,
	pendingNote,
	children,
}: {
	name: string
	description?: string
	/** 미리보기가 아직 담지 못한 것 — 없으면 표시하지 않는다. */
	pendingNote?: string
	isExporting: boolean
	exportError: string | null
	onExport?: () => void
	onExportPdf?: () => void
	onExportTiff?: () => void
	/** 스튜디오로 이동할 주소 — 세션에 얹을 것이 있을 때만 온다. */
	applyHref?: string
	/** 이동 직전에 편집안을 통로에 밀어 넣는다. 🔑 같은 클릭이라 레이아웃이 언마운트되지 않는다. */
	onApply?: () => void
	children: React.ReactNode
}) {
	return (
		<Attachment orientation="vertical" className="w-full rounded-lg p-2">
			<AttachmentMedia
				variant="image"
				className="aspect-auto h-auto w-full rounded-md border border-border bg-background p-0"
			>
				{children}
			</AttachmentMedia>
			<AttachmentContent className="w-full px-1 pt-2">
				<AttachmentTitle>{name}</AttachmentTitle>
				<AttachmentDescription>{description}</AttachmentDescription>
				{pendingNote && (
					<Typography size="xs" tone="muted" className="pt-0.5">
						{pendingNote}
					</Typography>
				)}
			</AttachmentContent>
			{applyHref && onApply && (
				/*
				 * 🔴 `<a>`를 Attachment의 **직계** 자식으로 두지 않는다 — 루트의
				 *    `has-[>a,>button]:hover:bg-muted/50`(ui/attachment.tsx)이 켜져 카드 전체가
				 *    클릭 대상처럼 보인다. div로 한 겹 감싸면 그 선택자에 걸리지 않는다.
				 * 🔴 `AttachmentActions`를 쓰지 않는다 — vertical에서 `absolute top-3 right-3`이라
				 *    미리보기를 가린다.
				 */
				<div className="w-full px-1 pt-1">
					<Button asChild variant="tint" size="sm">
						<Link href={applyHref} onClick={onApply}>
							스튜디오에 적용
						</Link>
					</Button>
				</div>
			)}
			<AttachmentActions>
				{onExport && (
					<AttachmentAction
						aria-label="PNG로 다운로드"
						disabled={isExporting}
						onClick={onExport}
						title="PNG로 다운로드"
					>
						<Download />
					</AttachmentAction>
				)}
				{onExportTiff && (
					<AttachmentAction
						aria-label="CMYK TIFF로 다운로드"
						disabled={isExporting}
						onClick={onExportTiff}
						title="CMYK TIFF로 다운로드"
					>
						<DocumentDownload />
					</AttachmentAction>
				)}
				{onExportPdf && (
					<AttachmentAction
						aria-label="PDF로 내보내기"
						disabled={isExporting}
						onClick={onExportPdf}
						title="PDF로 내보내기"
					>
						<DocumentPdf />
					</AttachmentAction>
				)}
			</AttachmentActions>
			{exportError && (
				<Typography size="sm" tone="destructive" className="px-1">
					{exportError}
				</Typography>
			)}
		</Attachment>
	)
}

/** 첨부 폭에 맞춰 콘텐츠를 contain 축소한다. children은 scale을 받아 원본 크기로 그린다. */
function ScaledMedia({
	contentWidth,
	children,
}: {
	contentWidth: number
	children: (scale: number) => React.ReactNode
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [containerWidth, setContainerWidth] = useState(PREVIEW_WIDTH)
	const renderWidth = Math.max(1, Math.min(PREVIEW_WIDTH, containerWidth, contentWidth))
	const scale = renderWidth / contentWidth

	useEffect(() => {
		const element = containerRef.current
		if (!element) {
			return
		}

		const updateWidth = (width: number) => {
			setContainerWidth(Math.max(1, Math.floor(width)))
		}
		updateWidth(element.clientWidth)

		const observer = new ResizeObserver(([entry]) => {
			if (entry) {
				updateWidth(entry.contentRect.width)
			}
		})
		observer.observe(element)

		return () => observer.disconnect()
	}, [])

	return (
		<div
			ref={containerRef}
			data-slot="scaled-media"
			className="flex w-full justify-center overflow-hidden"
		>
			{children(scale)}
		</div>
	)
}
