'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Controller } from '@/components/shared/controller'
import { ControllerRenderer } from '@/components/shared/controller-renderer'
import { StudioWorkspace } from '@/components/studio/shared/studio-workspace'
import { StudioLeftPanel } from '@/components/studio/sidebar/studio-left-panel'
import { StudioSidebar } from '@/components/studio/sidebar/studio-sidebar'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Typography } from '@/components/ui/typography'
import straight from '@/features/graphic-generation/graphic-runtimes/forward-straight/definition'
import straightModel from '@/features/graphic-generation/graphic-runtimes/forward-straight/model'
import line from '@/features/graphic-generation/graphic-runtimes/key-visual-line/definition'
import lineModel from '@/features/graphic-generation/graphic-runtimes/key-visual-line/model'
import { getImageRuntimeManifest } from '@/features/image-generation/domain/image-runtime-manifest'
import { vectorSceneToSvg } from '@/features/studio-export/adapters/vector-scene-to-svg'
import {
	type ControllerValues,
	createControllerValues,
	visibleControllerGroups,
} from '@/modules/studio-controller/controller-definition'

type Mode = 'template' | 'image' | 'graphic'
type Target = 'image' | 'background' | 'standalone'
type Layer = 'text' | Exclude<Target, 'standalone'>
type GraphicId = 'straight' | 'line'
type Draft = {
	imageCategory: string
	imageMode: 'preset' | 'generate'
	imageSrc: string
	imageValues: ControllerValues
	generated: boolean
	graphicCategory: GraphicId
	graphicPreset: string
	graphicValues: Record<GraphicId, ControllerValues>
}

const MODES = [
	{ value: 'template', label: 'Template' },
	{ value: 'image', label: 'Image' },
	{ value: 'graphic', label: 'Graphic' },
] as const
const LAYERS = [
	{ value: 'text', label: '텍스트' },
	{ value: 'image', label: '이미지' },
	{ value: 'background', label: '배경' },
] as const
const GRAPHICS = {
	straight: { definition: straight, model: straightModel },
	line: { definition: line, model: lineModel },
}
const IMAGE_GROUPS = getImageRuntimeManifest('google-nano-banana-2-lite').controller.groups
const IMAGE_CATEGORIES = [
	{ value: 'illustration', label: '일러스트' },
	{ value: 'key-visual', label: '키비주얼' },
]
const SAMPLES = {
	illustration: [
		{ label: '굴착기', src: '/guideline/reference/grid/icon-excavator-filled.webp' },
		{ label: '산업 로봇', src: '/guideline/reference/grid/icon-industrial-robot-filled.webp' },
	],
	'key-visual': [
		{ label: '키비주얼 A', src: '/guideline/reference/key-visuals/type-a.png' },
		{ label: '키비주얼 C', src: '/guideline/reference/key-visuals/type-c.png' },
	],
}
const TEMPLATE_CATEGORIES = [
	{ value: 'print', label: '인쇄물' },
	{ value: 'digital', label: '디지털' },
]

function createDraft(): Draft {
	return {
		imageCategory: 'illustration',
		imageMode: 'preset',
		imageSrc: SAMPLES.illustration[0].src,
		imageValues: createControllerValues(IMAGE_GROUPS),
		generated: false,
		graphicCategory: 'straight',
		graphicPreset: 'default',
		graphicValues: {
			straight: createControllerValues(straight.controller.groups),
			line: createControllerValues(line.controller.groups),
		},
	}
}

/** 개발 전용 조작 실험. 카탈로그·생성은 샘플이며 CMS와 생성 API를 호출하지 않는다. */
export function StudioPanelPlayground() {
	const [surface, setSurface] = useState<Mode>('template')
	const [scope, setScope] = useState<Mode>('template')
	const [layer, setLayer] = useState<Layer>('text')
	const [templateCategory, setTemplateCategory] = useState('print')
	const [title, setTitle] = useState('DRIVING THE FUTURE')
	const [drafts, setDrafts] = useState<Record<Target, Draft>>(() => ({
		image: createDraft(),
		background: createDraft(),
		standalone: createDraft(),
	}))
	const [applied, setApplied] = useState({
		image: SAMPLES.illustration[0].src,
		background: SAMPLES['key-visual'][1].src,
	})
	const [status, setStatus] = useState('이미지 또는 배경을 선택하고 타입을 골라보세요.')
	const nested = surface === 'template'
	const mode = nested ? scope : surface
	const target: Target = nested && layer !== 'text' ? layer : 'standalone'
	const draft = drafts[target]
	const patch = (changes: Partial<Draft>) =>
		setDrafts((current) => ({
			...current,
			[target]: { ...current[target], ...changes },
		}))
	const graphic = GRAPHICS[draft.graphicCategory]
	const graphicValues = draft.graphicValues[draft.graphicCategory]
	const graphicSrc = useMemo(() => {
		const artifact = graphic.model.createVectorArtifact(graphicValues, {
			width: 600,
			height: 800,
		})
		return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(vectorSceneToSvg(artifact, 96))}`
	}, [graphic, graphicValues])
	const previewSrc = mode === 'graphic' ? graphicSrc : draft.imageSrc
	const samples = SAMPLES[draft.imageCategory as keyof typeof SAMPLES]
	// ponytail: 샘플 후보는 카테고리당 두 장. 실제 생성 연결 시 응답 목록으로 교체한다.
	const candidates = draft.generated ? samples.slice(0, Number(draft.imageValues.batch)) : []
	const selectLayer = (next: Layer) => {
		setLayer(next)
		setScope('template')
	}
	const selectMode = (next: string) => {
		if (next === 'template' || next === 'image' || next === 'graphic') setScope(next)
	}
	const apply = () => {
		if (target === 'standalone') return
		setApplied((current) => ({ ...current, [target]: previewSrc }))
		setStatus(`${layer === 'image' ? '이미지' : '배경'}에 적용했습니다.`)
		setScope('template')
	}

	const categoryPanel = (
		<Controller.Header>
			<Typography size="sm" weight="medium">
				{MODES.find((item) => item.value === mode)?.label} 카테고리
			</Typography>
			<Controller.Row label="카테고리">
				<Controller.Select
					options={
						mode === 'template'
							? TEMPLATE_CATEGORIES
							: mode === 'image'
								? IMAGE_CATEGORIES
								: Object.entries(GRAPHICS).map(([value, item]) => ({
										value,
										label: item.definition.name,
									}))
					}
					value={
						mode === 'template'
							? templateCategory
							: mode === 'image'
								? draft.imageCategory
								: draft.graphicCategory
					}
					onChange={(value) => {
						if (mode === 'template') setTemplateCategory(value)
						else if (mode === 'image')
							patch({
								imageCategory: value,
								imageSrc: SAMPLES[value as keyof typeof SAMPLES][0].src,
								generated: false,
							})
						else
							patch({ graphicCategory: value as GraphicId, graphicPreset: 'default' })
					}}
				/>
			</Controller.Row>
			<Typography size="xs" tone="muted">
				{mode === 'template'
					? templateCategory === 'print'
						? '포스터 · 세로형'
						: '소셜 카드 · 정사각형'
					: nested
						? `${layer === 'image' ? '이미지' : '배경'}에 사용할 항목 선택`
						: '단독 편집'}
			</Typography>
		</Controller.Header>
	)

	const controls =
		mode === 'graphic' ? (
			<>
				<Controller.Group title="Preset" collapsible={false}>
					<Controller.Row label="프리셋">
						<Controller.Select
							value={draft.graphicPreset}
							options={[
								{ value: 'default', label: '기본' },
								{ value: 'wide', label: '넓게' },
							]}
							onChange={(value) => {
								const values = createControllerValues(
									graphic.definition.controller.groups,
								)
								if (value === 'wide') {
									if (draft.graphicCategory === 'straight') values.columnGap = 100
									else values.lineCount = 16
								}
								patch({
									graphicPreset: value,
									graphicValues: {
										...draft.graphicValues,
										[draft.graphicCategory]: values,
									},
								})
							}}
						/>
					</Controller.Row>
				</Controller.Group>
				<ControllerRenderer
					groups={visibleControllerGroups(
						graphic.definition.controller.groups,
						graphic.definition.controller.left,
						graphic.definition.controller.right,
					)}
					values={graphicValues}
					onChange={(id, value) =>
						patch({
							graphicValues: {
								...draft.graphicValues,
								[draft.graphicCategory]: { ...graphicValues, [id]: value },
							},
						})
					}
				/>
			</>
		) : mode === 'image' ? (
			<>
				<Controller.Group title="Image" collapsible={false}>
					<Controller.Row label="방식">
						<Controller.Segmented
							aria-label="이미지 방식"
							options={[
								{ value: 'preset', label: '프리셋' },
								{ value: 'generate', label: '생성' },
							]}
							value={draft.imageMode}
							onChange={(imageMode) => patch({ imageMode })}
						/>
					</Controller.Row>
				</Controller.Group>
				{draft.imageMode === 'generate' ? (
					<>
						<ControllerRenderer
							groups={IMAGE_GROUPS.filter((group) => group.id !== 'profile-settings')}
							values={draft.imageValues}
							onChange={(id, value) =>
								patch({ imageValues: { ...draft.imageValues, [id]: value } })
							}
						/>
						<Button
							disabled={!String(draft.imageValues.prompt).trim()}
							onClick={() => {
								patch({ generated: true })
								setStatus('샘플 후보를 생성했습니다. 왼쪽에서 결과를 선택하세요.')
							}}
						>
							샘플 생성
						</Button>
					</>
				) : (
					<Typography size="sm" tone="muted">
						왼쪽에서 카테고리와 프리셋을 선택하세요.
					</Typography>
				)}
			</>
		) : (
			<Controller.Group
				title={layer === 'text' ? 'Text' : layer === 'image' ? 'Image' : 'Background'}
				collapsible={false}
			>
				{layer === 'text' ? (
					<Controller.Field label="제목">
						<Controller.Textarea
							value={title}
							onChange={(event) => setTitle(event.target.value)}
						/>
					</Controller.Field>
				) : (
					<Controller.Row label="타입">
						<Controller.Segmented
							aria-label="콘텐츠 타입"
							value=""
							options={MODES.filter((item) => item.value !== 'template')}
							onChange={selectMode}
						/>
					</Controller.Row>
				)}
			</Controller.Group>
		)

	return (
		<main
			data-slot="studio-panel-playground"
			className="flex min-h-svh flex-col lg:h-svh lg:overflow-hidden"
		>
			<header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
				<div>
					<Typography as="h1" size="base" weight="medium">
						스튜디오 패널 실험
					</Typography>
					<Typography size="xs" tone="muted">
						생성은 샘플 결과를 사용합니다. 카테고리와 편집 모드 전환을 비교해보세요.
					</Typography>
				</div>
				<Controller.Segmented
					aria-label="작업 화면"
					options={MODES}
					value={surface}
					onChange={setSurface}
				/>
			</header>
			<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
				{nested && (
					<ToggleGroup
						type="single"
						orientation="vertical"
						aria-label="편집 모드"
						value={scope}
						onValueChange={(value) => value && selectMode(value)}
						className="shrink-0 p-4"
					>
						{MODES.map((item) => (
							<ToggleGroupItem
								key={item.value}
								value={item.value}
								disabled={item.value !== 'template' && layer === 'text'}
							>
								{item.label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				)}
				<div className="min-h-0 min-w-0 flex-1">
					<StudioWorkspace
						leftPanel={
							<StudioLeftPanel page={categoryPanel}>
								{nested && (
									<Controller.Group title="Template" collapsible={false}>
										<Controller.ListRow
											caption={
												templateCategory === 'print' ? '인쇄물' : '디지털'
											}
											label={
												templateCategory === 'print'
													? '포스터'
													: '소셜 카드'
											}
										/>
										<Controller.Group title="Layers" collapsible={false}>
											{LAYERS.map((item) => (
												<Controller.ListRow
													key={item.value}
													label={item.label}
													selected={layer === item.value}
													aria-pressed={layer === item.value}
													onClick={() => selectLayer(item.value)}
												/>
											))}
										</Controller.Group>
									</Controller.Group>
								)}
								{mode === 'image' && (
									<Controller.Group
										title={
											draft.imageMode === 'preset' ? 'Presets' : '생성 결과'
										}
										collapsible={false}
									>
										{(draft.imageMode === 'preset' ? samples : candidates).map(
											(sample, index) => (
												<Controller.ListRow
													key={sample.src}
													label={
														draft.imageMode === 'preset'
															? sample.label
															: `후보 ${index + 1} · ${sample.label}`
													}
													selected={draft.imageSrc === sample.src}
													onClick={() => patch({ imageSrc: sample.src })}
												/>
											),
										)}
										{draft.imageMode === 'generate' && !draft.generated && (
											<Typography size="sm" tone="muted">
												생성한 후보가 여기에 표시됩니다.
											</Typography>
										)}
									</Controller.Group>
								)}
							</StudioLeftPanel>
						}
						sidebar={
							<StudioSidebar
								header={
									<Typography size="sm" weight="medium">
										{nested
											? `${templateCategory === 'print' ? '포스터' : '소셜 카드'} / ${LAYERS.find((item) => item.value === layer)?.label}`
											: `${surface === 'image' ? 'Image' : 'Graphic'} 편집`}
									</Typography>
								}
								footer={
									nested && mode !== 'template' ? (
										<Button onClick={apply}>
											{layer === 'image' ? '이미지' : '배경'}에 적용
										</Button>
									) : undefined
								}
							>
								{controls}
							</StudioSidebar>
						}
					>
						<div className="flex min-h-0 flex-1 items-center justify-center">
							{nested ? (
								<div
									data-slot="template-preview"
									className="relative aspect-[3/4] w-full max-w-md overflow-hidden rounded-xl bg-muted shadow-lg"
									style={{
										aspectRatio: templateCategory === 'digital' ? '1' : '3/4',
									}}
								>
									<PreviewImage
										src={
											mode !== 'template' && target === 'background'
												? previewSrc
												: applied.background
										}
									/>
									<Button
										variant={layer === 'background' ? 'outline' : 'ghost'}
										aria-label="캔버스 배경 선택"
										onClick={() => selectLayer('background')}
										className="absolute inset-0 h-full w-full"
									/>
									<Button
										variant={layer === 'image' ? 'outline' : 'ghost'}
										aria-label="캔버스 이미지 선택"
										onClick={() => selectLayer('image')}
										className="absolute top-1/4 left-1/4 h-1/3 w-1/2 overflow-hidden rounded-xl p-0"
									>
										<PreviewImage
											src={
												mode !== 'template' && target === 'image'
													? previewSrc
													: applied.image
											}
										/>
									</Button>
									<Button
										variant={layer === 'text' ? 'outline' : 'ghost'}
										aria-label="캔버스 텍스트 선택"
										onClick={() => selectLayer('text')}
										className="absolute inset-x-6 bottom-8 h-auto whitespace-normal bg-background/90 p-4"
									>
										<Typography size="xl" weight="medium">
											{title}
										</Typography>
									</Button>
								</div>
							) : (
								<div className="relative aspect-[3/4] w-full max-w-md overflow-hidden rounded-xl bg-muted">
									<PreviewImage src={previewSrc} />
								</div>
							)}
						</div>
						<Typography
							role="status"
							size="xs"
							tone="muted"
							className="pt-4 text-center"
						>
							{status}
						</Typography>
					</StudioWorkspace>
				</div>
			</div>
		</main>
	)
}

function PreviewImage({ src }: { src: string }) {
	return (
		<Image
			data-slot="playground-preview-image"
			src={src}
			alt=""
			fill
			unoptimized
			sizes="(max-width: 1024px) 100vw, 448px"
			className="object-cover"
		/>
	)
}
