'use client'

import { useCallback, useState } from 'react'
import type {
	TemplateRasterArtifactProducer,
	TemplateVectorArtifactResult,
	TemplateVideoArtifactProducer,
} from '@/features/template-customization/runtime/template-runtime.client'
import {
	acceptsControllerExecutionValues,
	type ControllerGroupDefinition,
	type ControllerValues,
} from '@/modules/studio-controller/controller-definition'
import type { ExportRequest, StudioOutputFormat, VideoExportSpec } from '../export-contract'
import { exportFileName } from '../export-file-name'
import type { StudioOutputView } from '../output-view'
import {
	isPrintPpi,
	MAX_PRINT_PIXELS,
	MAX_PRINT_SIDE_PIXELS,
	maxPrintSize,
	millimetersToPixels,
	PRINT_PPI_VALUES,
	type PrintPpi,
	resolveDefaultPrintPpi,
} from '../print-policy'
import { createRasterExportRequest } from '../services/create-raster-export-request'
import { executeArtifactExport } from '../services/export-artifact.client'
import {
	acceptsPrintPpi,
	resolveMaxExportScale,
	type StudioOutputCapability,
} from '../studio-output'
import { useExport } from './use-export'

export type TemplateExportMetadata = {
	fileName: string
	width: number
	height: number
	/** 캔버스 좌표계 대비 허용 최대 출력 배율. MP4 인코딩 한도에서 나온 값이라 MP4에만 적용한다. */
	maxScale: number
	/** 인쇄 판형(mm). 있으면 인쇄판이라 mm가 정본이고, 파일 px는 창작자가 고른 ppi로 계산된다. */
	printSizeMm?: { width: number; height: number }
	/** 디지털판의 판형 크기(px). 있으면 PNG·JPG·MP4가 이 크기로 나가고 배율을 고르지 않는다. */
	digitalSizePx?: { width: number; height: number }
	controller: {
		groups: readonly ControllerGroupDefinition[]
		values: Readonly<ControllerValues>
	}
}

export type TemplateExportView = ReturnType<typeof useTemplateExport>

/** 사이드바가 안내할 출력 크기를 요청에서 되읽는다. MP4만 짝수 내림을 거쳐 값이 달라진다. */
function resolveOutputSize(
	request: TemplateExportRequest | null,
	metadata: TemplateExportMetadata | null,
	scale: number,
): { width: number; height: number } | null {
	if (!metadata) return null
	if (request?.format === 'mp4') {
		return { width: request.options.width, height: request.options.height }
	}
	return { width: metadata.width * scale, height: metadata.height * scale }
}

/**
 * 인쇄 한도가 허용하는 정수 배율. 종횡비를 지키므로 먼저 막히는 변이 상한이다.
 * 🔴 여기에 영상 인코더 예산(H.264 매크로블록)을 쓰면 1080px 판이 2배에서 막혀 A4 300ppi가 안 나온다.
 * ponytail: 목록 길이는 자르지 않는다 — 4로 자르면 그 사고가 그대로 돌아온다.
 */
function printScaleCeiling(metadata: TemplateExportMetadata): number {
	const limit = maxPrintSize(metadata.width, metadata.height)
	return Math.max(
		1,
		Math.floor(Math.min(limit.width / metadata.width, limit.height / metadata.height)),
	)
}
type TemplateExportRequest = Extract<ExportRequest, { artifact: 'raster' | 'video' | 'vector' }>

const MILLIMETERS_PER_INCH = 25.4

/** 판형(mm)을 이 ppi로 채운 크기를 브라우저 캔버스가 그릴 수 있는지. */
function fitsPrintCanvas(sizeMm: { width: number; height: number }, ppi: PrintPpi): boolean {
	const width = millimetersToPixels(sizeMm.width, ppi)
	const height = millimetersToPixels(sizeMm.height, ppi)
	return (
		width <= MAX_PRINT_SIDE_PIXELS &&
		height <= MAX_PRINT_SIDE_PIXELS &&
		width * height <= MAX_PRINT_PIXELS
	)
}

/** Template Raster Artifact를 공통 ExportRequest와 Artifact executor에 연결한다. */
export function useTemplateExport({
	artifact,
	vectorArtifact,
	videoArtifact,
	capability,
	metadata,
}: {
	artifact: TemplateRasterArtifactProducer
	/** 인쇄용 벡터. 없으면 SVG 형식을 내놓지 않는다. */
	vectorArtifact?: (() => Promise<TemplateVectorArtifactResult>) | null
	/** 배경 Graphic처럼 시간축이 있는 소스가 있을 때만 MP4가 실제로 움직인다. */
	videoArtifact?: TemplateVideoArtifactProducer | null
	capability: StudioOutputCapability
	metadata: TemplateExportMetadata | null
}) {
	const [selectedFormat, setSelectedFormat] = useState<StudioOutputFormat | null>(null)
	const [ppi, setPpi] = useState<PrintPpi>(() => resolveDefaultPrintPpi(capability.print?.ppi))
	const [fps, setFps] = useState<VideoExportSpec['fps'] | undefined>(
		() => capability.video?.mp4.fps[0],
	)
	const [durationSeconds, setDurationSeconds] = useState(() =>
		Math.min(5, capability.video?.mp4.maxDurationSeconds ?? 5),
	)
	const [scale, setScale] = useState(1)
	// 🔴 인쇄물은 되돌릴 수 없다 — 벡터로 못 옮긴 것을 화면이 말할 수 있게 남긴다.
	const [vectorDiagnostics, setVectorDiagnostics] = useState<
		TemplateVectorArtifactResult['diagnostics'] | null
	>(null)
	// 🔑 인쇄판은 mm가 정본이다. 창작자가 고른 ppi로 파일 px를 계산하고(mm × ppi), 브라우저가 그릴 수
	//    없는 크기가 되는 ppi는 선택지에서 뺀다 — 한 변 16,384px를 넘으면 캔버스가 조용히 줄여 버린다.
	const printSize = metadata?.printSizeMm ?? null
	const printPpiOptions = printSize
		? (capability.print?.ppi ?? PRINT_PPI_VALUES).filter((candidate) =>
				fitsPrintCanvas(printSize, candidate),
			)
		: (capability.print?.ppi ?? [])
	const effectivePpi = printSize
		? printPpiOptions.includes(ppi)
			? ppi
			: printPpiOptions.length
				? resolveDefaultPrintPpi(printPpiOptions)
				: null
		: acceptsPrintPpi(capability, ppi)
			? ppi
			: resolveDefaultPrintPpi(capability.print?.ppi)
	const printPixels =
		printSize && effectivePpi
			? {
					width: millimetersToPixels(printSize.width, effectivePpi),
					height: millimetersToPixels(printSize.height, effectivePpi),
				}
			: null
	const effectiveFps =
		fps && capability.video?.mp4.fps.includes(fps) ? fps : capability.video?.mp4.fps[0]
	const effectiveDuration = Math.min(
		durationSeconds,
		capability.video?.mp4.maxDurationSeconds ?? durationSeconds,
	)
	const formats = capability.formats
	const format =
		selectedFormat && formats.includes(selectedFormat) ? selectedFormat : (formats[0] ?? null)
	// 🔑 벡터 요청은 판 크기를 그대로 싣는다 — 배율이 들어갈 자리가 없다.
	//    request 이전에 판정해야 배율 계산이 request에 의존하지 않는다.
	const usesVector = Boolean(vectorArtifact && metadata && (format === 'svg' || format === 'pdf'))
	/**
	 * 배율 상한. 🔑 형식마다 정하는 것이 다르다 — MP4는 **인코더 예산**(매크로블록)이,
	 * 나머지는 **브라우저 캔버스와 인쇄 한도**가 정한다. fps를 올리면 MP4만 상한이 줄어든다.
	 * 🔴 정지 이미지에 인코더 예산을 씌우면 1080px 판이 2배에서 막혀 A4 300ppi가 안 나온다.
	 */
	const maxScale = !metadata
		? 1
		: format === 'mp4'
			? Math.min(
					Math.max(1, Math.floor(metadata.maxScale)),
					resolveMaxExportScale(metadata.width, metadata.height, effectiveFps),
				)
			: printScaleCeiling(metadata)
	const scaleOptions = Array.from({ length: maxScale }, (_, index) => index + 1)
	// fps를 올려 지금 배율이 예산을 넘으면 1로 떨어뜨리지 않고 갈 수 있는 최대로 붙인다.
	const selectedScale = Math.min(Math.max(1, Math.floor(scale)), maxScale)
	// 🔑 인쇄판의 래스터는 배율을 고르지 않는다 — mm × ppi로 나온 px를 판(px)으로 나눈 값이 배율이다.
	const digitalSize = printSize ? null : (metadata?.digitalSizePx ?? null)
	const effectiveScale = usesVector
		? 1
		: printSize
			? printPixels && metadata && format !== 'mp4'
				? printPixels.width / metadata.width
				: 1
			: digitalSize && metadata
				? digitalSize.width / metadata.width
				: selectedScale
	const createRequest = useCallback(
		(candidate: StudioOutputFormat | null): TemplateExportRequest | null => {
			// 🔑 PDF는 벡터가 있으면 벡터로 간다 — 판 전체를 굽는 래스터 PDF보다 글자·도형이 선명하고,
			//    같은 CMYK ICC를 타므로 색이 달라지지 않는다. 벡터가 없는 스튜디오만 래스터로 남는다.
			if (
				candidate &&
				vectorArtifact &&
				metadata &&
				(candidate === 'svg' || candidate === 'pdf')
			) {
				const options = {
					width: metadata.width,
					height: metadata.height,
					// 글자는 굽기 단계가 이미 윤곽선으로 바꾼다 — 여기서 다시 요청하지 않는다.
					outlineText: false,
				}
				// 인쇄판 벡터는 페이지가 판형 mm 그대로여야 한다 — 판(px)을 mm로 옮기는 환산값이다(사람이 고르지 않음).
				const vectorPpi = printSize
					? (metadata.width * MILLIMETERS_PER_INCH) / printSize.width
					: effectivePpi
				if (candidate === 'svg') {
					if (!isPrintPpi(vectorPpi)) return null
					return {
						artifact: 'vector',
						format: 'svg',
						colorProfile: {
							space: 'rgb',
							icc: capability.colorProfiles?.rgb?.[0] ?? 'srgb',
						},
						options: { ...options, ppi: vectorPpi },
					}
				}
				// 🔴 인쇄용 벡터 PDF는 해상도 없이 만들 수 없다 — 페이지 치수가 거기서 나오고,
				//    없는 채로 내보내면 판이 조용히 72ppi 크기로 나간다.
				if (!isPrintPpi(vectorPpi)) return null
				return {
					artifact: 'vector',
					format: 'pdf',
					colorProfile: {
						space: 'cmyk',
						icc: capability.colorProfiles?.cmyk?.[0] ?? 'cgats21-crpc6',
					},
					options: { ...options, ppi: vectorPpi },
				}
			}
			// 인쇄판인데 그릴 수 있는 ppi가 하나도 없으면(판형이 너무 큼) 래스터를 내지 않는다.
			if (printSize && !effectivePpi && candidate !== 'mp4') return null
			const request =
				candidate && metadata
					? createRasterExportRequest(candidate, capability, {
							width: metadata.width,
							height: metadata.height,
							scale: effectiveScale,
							ppi: effectivePpi ?? undefined,
							fps: effectiveFps,
							durationSeconds: effectiveDuration,
						})
					: null
			// 같은 video spec을 시간축 있는 artifact로 돌린다 — raster MP4는 한 프레임을 반복한다.
			return request?.format === 'mp4' && videoArtifact
				? { artifact: 'video', format: 'mp4', options: request.options }
				: request
		},
		[
			capability,
			effectiveDuration,
			effectiveFps,
			effectivePpi,
			effectiveScale,
			metadata,
			vectorArtifact,
			videoArtifact,
			printSize,
		],
	)
	const execute = useCallback(
		async (request: TemplateExportRequest) => {
			if (!metadata) throw new Error('Template export is unavailable.')
			const fileName = exportFileName(metadata.fileName, new Date())
			// Video Artifact는 전경을 목표 프레임 크기로 구워야 하므로 요청 해상도를 넘긴다.
			if (request.artifact === 'vector') {
				if (!vectorArtifact) throw new Error('Template export is unavailable.')
				const { artifact: vector, diagnostics } = await vectorArtifact()
				setVectorDiagnostics(diagnostics)
				return executeArtifactExport({
					artifact: vector,
					fileName,
					request,
				})
			}
			if (request.artifact === 'video') {
				if (!videoArtifact) throw new Error('Template export is unavailable.')
				const { width, height } = request.options
				return executeArtifactExport({
					artifact: await videoArtifact({ width, height }),
					fileName,
					request,
				})
			}
			return executeArtifactExport({
				artifact: await artifact(),
				fileName,
				request,
			})
		},
		[artifact, metadata, vectorArtifact, videoArtifact],
	)
	const output = useExport<TemplateExportRequest>({
		capability,
		canExport: () =>
			Boolean(
				metadata &&
					acceptsControllerExecutionValues(
						metadata.controller.groups,
						metadata.controller.values,
					),
			),
		execute,
	})
	const request = createRequest(format)
	const runFormat = (candidate: StudioOutputFormat): void => {
		const candidateRequest = createRequest(candidate)
		if (candidateRequest) void output.run(candidateRequest)
	}

	const vectorWarnings = describeVectorDiagnostics(vectorDiagnostics)
	/** 이번 요청이 배율을 실제로 쓰는지 — 안 쓰면 Scale 행이 숨는다.
	 *  🔑 TIFF·PDF 래스터도 배율을 쓴다. 벡터만 판 크기를 그대로 실어 배율이 들어갈 자리가 없다. */
	const scaleApplies = !usesVector && !printSize && !digitalSize
	/** 해상도 선택이 이번 요청에 쓰이는지. 인쇄판은 래스터(PNG·JPG·TIFF)의 px를 정하고, 벡터는 mm 그대로라
	 *  쓰지 않는다. 디지털판은 인쇄 형식(TIFF·PDF·SVG)의 물리 크기를 정한다. */
	const ppiApplies = printSize ? !usesVector && format !== 'mp4' : true
	/** 인쇄판인데 판형이 너무 커서 이미지 파일로 낼 수 없는지. 벡터(SVG·PDF)로만 낼 수 있다. */
	const printTooLarge = Boolean(printSize && printPpiOptions.length === 0)
	/** 실제로 나올 픽셀 크기. MP4는 짝수 내림까지 거친 요청 값을 그대로 쓴다 —
	 *  캔버스에 배율만 곱해 보여 주면 홀수 변에서 1px 어긋난 값을 안내하게 된다. */
	const outputSize =
		printPixels && !usesVector && format !== 'mp4'
			? printPixels
			: digitalSize && format !== 'mp4'
				? digitalSize
				: resolveOutputSize(request, metadata, effectiveScale)
	const view: StudioOutputView = {
		format: {
			value: format,
			options: formats,
			set: (next) => {
				if (formats.includes(next)) setSelectedFormat(next)
			},
		},
		// 🔴 SVG도 포함한다 — SVG의 물리 크기(mm)도 ppi가 정한다. 빼 두면 SVG에는 행이 안 뜨는데 값은
		//    살아 있어, 직전에 PDF를 만졌는지에 따라 같은 SVG가 53mm 또는 222mm로 나간다.
		//    인쇄판은 PNG·JPG·TIFF의 px를 정하는 해상도라 형식과 상관없이 뜬다(ppiApplies가 벡터·MP4를 거른다).
		print:
			ppiApplies &&
			effectivePpi !== null &&
			printPpiOptions.length > 0 &&
			(printSize || format === 'tiff' || format === 'pdf' || format === 'svg')
				? {
						ppi: effectivePpi,
						/** 창작자가 고를 수 있는 해상도. 인쇄판은 브라우저가 그릴 수 있는 것만 남는다. */
						options: printPpiOptions,
						set: (next) => {
							if (printPpiOptions.includes(next)) setPpi(next)
						},
					}
				: null,
		video:
			format === 'mp4' && capability.video && effectiveFps
				? {
						fps: effectiveFps,
						fpsOptions: capability.video.mp4.fps,
						durationSeconds: effectiveDuration,
						maxDurationSeconds: capability.video.mp4.maxDurationSeconds,
						setFps: (next) => {
							if (capability.video?.mp4.fps.includes(next)) setFps(next)
						},
						setDuration: (next) => {
							const max = capability.video?.mp4.maxDurationSeconds
							if (max && next > 0 && next <= max) setDurationSeconds(next)
						},
					}
				: null,
		save: {
			canExport: Boolean(request && output.canExport(request)),
			run: () => {
				if (request) void output.run(request)
			},
		},
		busy: output.exporting !== null,
		error: output.error,
		notices: [
			...(printTooLarge
				? ['이 판형은 너무 커서 이미지 파일로 낼 수 없어요. SVG·PDF로 저장해 주세요.']
				: []),
			...vectorWarnings,
		],
	}

	return {
		view,
		/** 마지막 벡터 내보내기에서 옮기지 못한 것. 없으면 null이다. */
		vectorDiagnostics,
		/** 배율 — 이번 요청이 배율을 쓰지 않으면 `null`(Template 고유 행). */
		scale: scaleApplies
			? {
					value: effectiveScale,
					options: scaleOptions,
					set: (next: number) => {
						if (scaleOptions.includes(next)) setScale(next)
					},
				}
			: null,
		ppiApplies,
		printTooLarge,
		/** 실제로 나갈 물리 크기(mm). 인쇄판에서만 값이 있다. */
		sizeMm: printSize,
		outputSize,
		/** 화면이 안내할 크기 — 인쇄판은 mm, 그 밖은 실제로 나올 px. */
		sizeReadout: printSize
			? { ...printSize, unit: 'mm' as const }
			: outputSize
				? { ...outputSize, unit: 'px' as const }
				: null,
		canExportFormat: (candidate: StudioOutputFormat) => {
			const candidateRequest = createRequest(candidate)
			return Boolean(candidateRequest && output.canExport(candidateRequest))
		},
		runFormat,
	}
}

/**
 * 진단을 사람이 읽는 한 줄로 옮긴다. 노드 id를 그대로 보여 주지 않는다 — 화면에서 그 id로
 * 무엇을 찾을 수 없고, 알아야 할 것은 「무엇이 원본과 달라졌나」다.
 */
function describeVectorDiagnostics(
	diagnostics: TemplateVectorArtifactResult['diagnostics'] | null,
): string[] {
	if (!diagnostics) return []
	const warnings: string[] = []

	const effects = new Set(diagnostics.unsupported.map(({ reason }) => reason))
	// 마스크는 이미지로 구워 **결과가 원본과 같다** — 나머지는 아직 굽지 않아 결과가 달라진다.
	// 둘을 한 문장으로 묶으면 「무엇을 확인해야 하나」가 흐려진다.
	if (effects.delete('mask')) {
		warnings.push('색을 입힌 이미지는 편집 가능한 도형이 아니라 이미지 레이어로 들어갑니다.')
	}
	const effectLabels: Record<string, string> = {
		'backdrop-filter': '배경 흐림',
		'blend-mode': '혼합 모드',
		'box-shadow': '그림자',
		filter: '흐림 효과',
		gradient: '그라디언트',
		'svg-stylesheet-fill': '자산의 색 지정 방식(검정으로 나갑니다)',
		'uneven-border': '변마다 다른 테두리',
	}
	const named = [...effects].map((reason) => effectLabels[reason] ?? reason)
	if (named.length > 0) {
		warnings.push(`이 효과는 내보내기에 담기지 않습니다: ${named.join(' · ')}`)
	}

	const fonts = new Set(diagnostics.notOutlined.map(({ fontFamily }) => fontFamily))
	if (fonts.size > 0) {
		// 🔴 문구가 실제 동작과 같아야 한다 — 아웃라인에 실패한 글줄이 남으면 `exportVectorPrint`가
		//    PDF를 **만들지 않는다**(422). 「빠집니다」는 글자 없는 파일이 나온다는 뜻이 되어,
		//    사용자가 그대로 눌렀다가 실패를 만난다.
		// 🔑 SVG는 `text`로 남으므로 「정상」이 아니라 「글자로 남는다」가 사실이다 —
		//    여는 쪽에 그 서체가 있어야 제대로 보인다.
		warnings.push(
			`이 서체의 글자를 윤곽선으로 바꾸지 못해 PDF를 만들 수 없습니다(SVG는 글자로 남습니다): ${[...fonts].join(' · ')}`,
		)
	}
	return warnings
}
