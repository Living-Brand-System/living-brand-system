'use client'

import { ChevronDown, ChevronUp } from '@carbon/icons-react'
import { useForm, useFormFields } from '@payloadcms/ui'
import { useDialKit } from 'dialkit'
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { FieldDescription } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import { composeTemplateHtml } from '@/features/template-core/runtime/compose-template-html.client'
import type { TemplateNodeConfig, TemplateNodeConfigMap } from '@/types/template'
import { AdminSectionHeading } from '../shared/admin-section-heading'
import { ImageTransformOverlay } from './image-transform-overlay'
import { TemplateLayerEditor } from './template-layer-editors'
import {
	canAssignImage,
	hasLayerEditor,
	type LayerRow,
	moveLayer,
	parseLayers,
	pruneCarrierChildImageKeys,
	typeLabel,
} from './template-layers'

// 정본(83:1431) 실측 캔버스 높이.
const DEFAULT_CANVAS_HEIGHT = 560
const DEFAULT_LAYER_WIDTH = 260
const DEFAULT_WORKSPACE_GAP = 16

function buildPreviewDocument(html: string, origin: string): string {
	const imageSource = origin || "'none'"
	return (
		'<!doctype html><html><head><meta charset="utf-8">' +
		`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${imageSource} data: blob:; font-src data:">` +
		`</head><body>${html}</body></html>`
	)
}

function TemplateCanvas({
	canvasHeight,
	canvasRef,
	hasHtml,
	height,
	iframeRef,
	overlay,
	previewDocument,
	scale,
	width,
}: {
	canvasHeight: number
	canvasRef: RefObject<HTMLDivElement | null>
	hasHtml: boolean
	height: number
	iframeRef: RefObject<HTMLIFrameElement | null>
	overlay?: ReactNode
	previewDocument: string
	scale: number
	width: number
}) {
	return (
		<div
			ref={canvasRef}
			className="flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-3xl border bg-muted"
			style={{ height: canvasHeight }}
		>
			{hasHtml && width && height ? (
				<div className="relative" style={{ width: width * scale, height: height * scale }}>
					<iframe
						ref={iframeRef}
						title="템플릿 Draft 미리보기"
						sandbox="allow-same-origin"
						referrerPolicy="no-referrer"
						srcDoc={previewDocument}
						style={{
							width,
							height,
							border: 0,
							pointerEvents: 'none',
							transform: `scale(${scale})`,
							transformOrigin: 'top left',
						}}
					/>
					{overlay}
				</div>
			) : (
				<Empty className="border-0 p-4">
					<EmptyHeader>
						<EmptyTitle>미리보기 없음</EmptyTitle>
						<EmptyDescription>Figma에서 가져오면 여기에 표시됩니다.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</div>
	)
}

function LayerList({
	canvasHeight,
	canMove,
	layerWidth,
	layers,
	onMove,
	onSelect,
	selectedId,
}: {
	canvasHeight: number
	/** 이 방향으로 옮길 수 있는가 — 끝에 닿았거나 형제가 없으면 손잡이를 잠근다. */
	canMove: (id: string, direction: 'up' | 'down') => boolean
	layerWidth: number
	layers: LayerRow[]
	onMove: (id: string, direction: 'up' | 'down') => void
	onSelect: (id: string) => void
	selectedId: string | null
}) {
	return (
		<section
			className="shrink-0 rounded-3xl border p-3"
			style={{ width: layerWidth, height: canvasHeight }}
		>
			<h3 className="mb-1 text-base font-medium">레이어</h3>
			{/* 🔴 목록은 **겹침의 역순**이다 — 판에서 맨 위인 것이 목록에서도 맨 위(Figma와 같은 방향).
			    이 순서가 곧 정본이고, compose가 DOM을 이 순서로 재배치한다(z-index를 쓰지 않는다). */}
			<ScrollArea className="h-[calc(100%-2rem)] pr-2">
				{layers.length === 0 ? (
					<Empty className="border-0 p-4">
						<EmptyHeader>
							<EmptyTitle>레이어 없음</EmptyTitle>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="flex flex-col gap-0.5">
						{[...layers].reverse().map((layer) => (
							<div key={layer.id} className="flex items-center gap-0.5">
								<Button
									type="button"
									variant={layer.id === selectedId ? 'tint' : 'ghost'}
									size="sm"
									className="h-7 min-w-0 flex-1 justify-start px-1 font-normal"
									style={{ paddingLeft: layer.depth * 14 + 4 }}
									// 편집 UI 없는 레이어는 선택 불가 — 빈 패널 대신 목록에서 잠근다(안내 문구 제거 결정).
									disabled={!hasLayerEditor(layer)}
									onClick={() => onSelect(layer.id)}
								>
									<span className="w-11 shrink-0 text-xs text-muted-foreground">
										{typeLabel(layer.figmaType)}
									</span>
									<span className="truncate">{layer.name}</span>
								</Button>
								{/* 🔴 드래그가 아니라 버튼이다 — 키보드로 그대로 되고(docs/08), 끝에
								    닿으면 잠겨서 「눌렀는데 안 움직인다」가 생기지 않는다. */}
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label={`${layer.name} 위로`}
									disabled={!canMove(layer.id, 'up')}
									onClick={() => onMove(layer.id, 'up')}
								>
									<ChevronUp />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label={`${layer.name} 아래로`}
									disabled={!canMove(layer.id, 'down')}
									onClick={() => onMove(layer.id, 'down')}
								>
									<ChevronDown />
								</Button>
							</div>
						))}
					</div>
				)}
			</ScrollArea>
		</section>
	)
}

export function TemplateLayersField() {
	const { dispatchFields, setModified } = useForm()
	const html = useFormFields(([fields]) => fields.html?.value) as string | undefined
	const baseHtml = useFormFields(([fields]) => fields.baseHtml?.value) as string | undefined
	const nodeConfigs = (useFormFields(([fields]) => fields.overrides?.value) ??
		{}) as TemplateNodeConfigMap
	const width = useFormFields(([fields]) => fields.width?.value) as number | undefined
	const height = useFormFields(([fields]) => fields.height?.value) as number | undefined
	const layout = useDialKit('Admin · 템플릿 레이어', {
		canvasHeight: [DEFAULT_CANVAS_HEIGHT, 400, 800, 20],
		layerWidth: [DEFAULT_LAYER_WIDTH, 220, 360, 10],
		workspaceGap: [DEFAULT_WORKSPACE_GAP, 8, 32, 2],
	})
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [previewOrigin, setPreviewOrigin] = useState('')

	useEffect(() => setPreviewOrigin(window.location.origin), [])

	const canvasRef = useRef<HTMLDivElement>(null)
	const [canvasWidth, setCanvasWidth] = useState(0)
	useEffect(() => {
		const element = canvasRef.current
		if (!element) return
		const observer = new ResizeObserver((entries) => {
			setCanvasWidth(entries[0]?.contentRect.width ?? 0)
		})
		observer.observe(element)
		return () => observer.disconnect()
	}, [])

	// DOMParser는 서버에 없다 — 서버 렌더는 빈 목록으로 그리고 마운트 후 파싱한다(previewOrigin과 같은 패턴).
	const [layers, setLayers] = useState<LayerRow[]>([])
	useEffect(() => {
		setLayers(typeof html === 'string' && html.trim() ? parseLayers(html) : [])
	}, [html])
	const selected = layers.find((layer) => layer.id === selectedId) ?? null
	const hasHtml = typeof html === 'string' && html.trim().length > 0
	const previewDocument = useMemo(
		() => (hasHtml ? buildPreviewDocument(html, previewOrigin) : ''),
		[hasHtml, html, previewOrigin],
	)
	const templateWidth = typeof width === 'number' && width > 0 ? width : 0
	const templateHeight = typeof height === 'number' && height > 0 ? height : 0
	const availableWidth = canvasWidth || 640
	const scale =
		templateWidth && templateHeight
			? Math.min(
					1,
					(availableWidth - 32) / templateWidth,
					(layout.canvasHeight - 32) / templateHeight,
				)
			: 1

	function commitNodeConfig(patch: TemplateNodeConfig) {
		if (!selectedId) return
		const base = baseHtml || html
		if (typeof base !== 'string') return

		const merged: TemplateNodeConfigMap = {
			...nodeConfigs,
			[selectedId]: { ...nodeConfigs[selectedId], ...patch },
		}
		const next = pruneCarrierChildImageKeys(merged, selected?.carrierChildId, patch)
		dispatchFields({ type: 'UPDATE', path: 'overrides', value: next })
		dispatchFields({ type: 'UPDATE', path: 'html', value: composeTemplateHtml(base, next) })
		setModified(true)
	}

	/**
	 * 겹침 순서 커밋 — `commitNodeConfig`와 달리 **선택한 레이어가 아니라 부모**의 설정을 쓴다.
	 * 🔑 저장 형태는 `overrides`고, `html`은 그것으로 다시 합성한 결과다(위와 같은 규칙) —
	 *    그래서 스튜디오·내보내기가 아무 변경 없이 이 순서를 따라간다.
	 */
	function commitMove(id: string, direction: 'up' | 'down') {
		const base = baseHtml || html
		if (typeof base !== 'string') return
		const next = moveLayer(nodeConfigs, layers, id, direction)
		if (!next) return
		dispatchFields({ type: 'UPDATE', path: 'overrides', value: next })
		dispatchFields({ type: 'UPDATE', path: 'html', value: composeTemplateHtml(base, next) })
		setModified(true)
	}

	const iframeRef = useRef<HTMLIFrameElement>(null)
	const canEditImage =
		!!selected && canAssignImage(selected) && !!nodeConfigs[selected.id]?.backgroundImage

	return (
		<div className="lbs-kit mt-[calc(80px-var(--base))] mb-20">
			<AdminSectionHeading>레이어 설정</AdminSectionHeading>
			<div className="flex items-start" style={{ gap: layout.workspaceGap }}>
				<TemplateCanvas
					canvasHeight={layout.canvasHeight}
					canvasRef={canvasRef}
					hasHtml={hasHtml}
					height={templateHeight}
					iframeRef={iframeRef}
					overlay={
						canEditImage && selected ? (
							<ImageTransformOverlay
								iframeRef={iframeRef}
								nodeId={selected.id}
								scale={scale}
								value={nodeConfigs[selected.id]?.imageTransform}
								onCommit={(imageTransform) => commitNodeConfig({ imageTransform })}
							/>
						) : null
					}
					previewDocument={previewDocument}
					scale={scale}
					width={templateWidth}
				/>
				<LayerList
					canvasHeight={layout.canvasHeight}
					canMove={(id, direction) =>
						moveLayer(nodeConfigs, layers, id, direction) !== null
					}
					layerWidth={layout.layerWidth}
					layers={layers}
					onMove={commitMove}
					onSelect={setSelectedId}
					selectedId={selectedId}
				/>
			</div>

			{/* 정본(83:1466)에는 구분선이 없다 — 캔버스와 레이어 카드 사이는 24px 여백만. */}
			<div className="mt-6">
				{selected ? (
					<TemplateLayerEditor
						config={nodeConfigs[selected.id] ?? {}}
						onCommit={commitNodeConfig}
						selected={selected}
					/>
				) : hasHtml ? (
					<FieldDescription>레이어를 선택하면 값을 편집할 수 있습니다.</FieldDescription>
				) : null}
			</div>
		</div>
	)
}
