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
import {
	isPrintPpi,
	maxPrintSize,
	type PrintPpi,
	pixelsToMillimeters,
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
	/** 템플릿이 선언한 판형 해상도. 있으면 인쇄판이라 물리 크기가 고정이고 창작자가 고르지 않는다. */
	canvasPpi?: PrintPpi
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
	// 🔑 판형이 선언된 인쇄판은 해상도가 판의 성질이라 창작자가 고르지 않는다.
	const declaredPpi = isPrintPpi(metadata?.canvasPpi) ? metadata.canvasPpi : null
	const effectivePpi =
		declaredPpi ??
		(acceptsPrintPpi(capability, ppi) ? ppi : resolveDefaultPrintPpi(capability.print?.ppi))
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
	// 🔴 인쇄판은 px도 mm도 선언으로 고정이다 — 배율을 곱하면 선언한 물리 크기가 깨진다.
	// ponytail: 밀도 손잡이는 두지 않는다. 필요해지면 ppi × 배율을 요청에 함께 실을 것.
	const effectiveScale = usesVector || declaredPpi ? 1 : selectedScale
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
				if (candidate === 'svg') {
					if (!isPrintPpi(effectivePpi)) return null
					return {
						artifact: 'vector',
						format: 'svg',
						colorProfile: {
							space: 'rgb',
							icc: capability.colorProfiles?.rgb?.[0] ?? 'srgb',
						},
						options: { ...options, ppi: effectivePpi },
					}
				}
				// 🔴 인쇄용 벡터 PDF는 해상도 없이 만들 수 없다 — 페이지 치수가 거기서 나오고,
				//    없는 채로 내보내면 판이 조용히 72ppi 크기로 나간다.
				if (!isPrintPpi(effectivePpi)) return null
				return {
					artifact: 'vector',
					format: 'pdf',
					colorProfile: {
						space: 'cmyk',
						icc: capability.colorProfiles?.cmyk?.[0] ?? 'cgats21-crpc6',
					},
					options: { ...options, ppi: effectivePpi },
				}
			}
			const request =
				candidate && metadata
					? createRasterExportRequest(candidate, capability, {
							width: metadata.width,
							height: metadata.height,
							scale: effectiveScale,
							ppi: effectivePpi,
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

	return {
		busy: output.exporting !== null,
		error: output.error,
		/** 마지막 벡터 내보내기에서 옮기지 못한 것. 없으면 null이다. */
		vectorDiagnostics,
		vectorWarnings: describeVectorDiagnostics(vectorDiagnostics),
		formats,
		format,
		setFormat: (next: StudioOutputFormat) => {
			if (formats.includes(next)) setSelectedFormat(next)
		},
		ppi: effectivePpi,
		setPpi: (next: PrintPpi) => {
			if (acceptsPrintPpi(capability, next)) setPpi(next)
		},
		fps: effectiveFps ?? null,
		setFps: (next: VideoExportSpec['fps']) => {
			if (capability.video?.mp4.fps.includes(next)) setFps(next)
		},
		durationSeconds: effectiveDuration,
		setDuration: (next: number) => {
			const max = capability.video?.mp4.maxDurationSeconds
			if (max && next > 0 && next <= max) setDurationSeconds(next)
		},
		scale: effectiveScale,
		scaleOptions,
		/**
		 * 이번 요청이 배율을 실제로 쓰는지 — 안 쓰면 사이드바가 Scale 행을 감춘다.
		 * 🔑 TIFF·PDF 래스터도 이제 배율을 쓴다. 벡터만 판 크기를 그대로 실어 배율이 들어갈 자리가 없다.
		 */
		scaleApplies: !usesVector && !declaredPpi,
		/** 창작자가 해상도를 고를 수 있는지 — 판형이 선언된 인쇄판은 고르지 않는다. */
		ppiApplies: declaredPpi === null,
		/** 실제로 나갈 물리 크기(mm). 판형을 선언한 인쇄판에서만 값이 있다. */
		sizeMm: declaredPpi
			? {
					width: pixelsToMillimeters(metadata?.width ?? 0, declaredPpi),
					height: pixelsToMillimeters(metadata?.height ?? 0, declaredPpi),
				}
			: null,
		setScale: (next: number) => {
			if (scaleOptions.includes(next)) setScale(next)
		},
		/**
		 * 실제로 나올 픽셀 크기. MP4는 짝수 내림까지 거친 요청 값을 그대로 쓴다 —
		 * 캔버스에 배율만 곱해 보여 주면 홀수 변에서 1px 어긋난 값을 안내하게 된다.
		 */
		outputSize: resolveOutputSize(request, metadata, effectiveScale),
		canExport: Boolean(request && output.canExport(request)),
		run: () => {
			if (request) void output.run(request)
		},
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
