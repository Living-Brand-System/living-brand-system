'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import type { GraphicBrowserArtifacts } from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import { getGraphicStudioVectorArtifact } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import type { ControllerValues } from '@/modules/studio-controller/controller-definition'
import type { ExportRequest, StudioOutputFormat, VideoExportSpec } from '../export-contract'
import { exportFileName } from '../export-file-name'
import {
	fitsPrintOutput,
	PRINT_PPI_VALUES,
	type PrintPpi,
	pixelsToMillimeters,
	printablePpiOptions,
	resolveDefaultPrintPpi,
} from '../print-policy'
import { createRasterExportRequest } from '../services/create-raster-export-request'
import { executeArtifactExport } from '../services/export-artifact.client'
import { acceptsPrintPpi } from '../studio-output'
import { useExport } from './use-export'

type GraphicOutputSize = { width: number; height: number }

export type GraphicOutputDraft =
	| { format: 'svg'; width: number | null; height: number | null }
	| {
			format: 'mp4'
			width: number
			height: number
			fps: VideoExportSpec['fps']
			durationSeconds: number
	  }
	| {
			format: 'png' | 'jpeg'
			width: number | null
			height: number | null
	  }
	// 🔑 `ppi`는 여기 없다 — 해상도는 형식이 아니라 **판**의 성질이라 draft 밖에 산다.
	//    형식을 갈아도 판의 물리 크기가 따라 바뀌면 안 된다.
	| {
			format: 'tiff' | 'pdf'
			width: number | null
			height: number | null
	  }

export type GraphicExportView = ReturnType<typeof useGraphicExport>['output']
type GraphicExportRequest =
	| Extract<ExportRequest, { artifact: 'vector' | 'video' }>
	| (Extract<ExportRequest, { artifact: 'raster' }> & {
			size: GraphicOutputSize
	  })

/** Graphic Artifact와 공통 Export Layer 사이의 format 선택·요청·실행 상태를 소유한다. */
export function useGraphicExport({
	artifacts,
	config,
	values,
	viewport,
}: {
	artifacts: GraphicBrowserArtifacts | null
	config: GraphicStudioConfig
	values: ControllerValues
	viewport: GraphicOutputSize | null
}) {
	const basePpiOptions = config.output.print?.ppi ?? PRINT_PPI_VALUES
	const [ppi, setPpi] = useState<PrintPpi>(() => resolveDefaultPrintPpi(config.output.print?.ppi))
	const [draftState, setDraftState] = useState(() => ({
		profileId: config.id,
		draft: createGraphicOutputDraft(config),
	}))
	const draft =
		draftState.profileId === config.id
			? draftState.draft
			: createGraphicOutputDraft(config, undefined, viewport)

	/**
	 * 고를 수 있는 해상도. **현재 판형에서 실제로 만들 수 있는 것만** 남긴다.
	 * 🔴 좁히지 않으면 배너에서 300ppi를 고를 수 있는데 그 픽셀을 브라우저가 못 만든다 —
	 *    예전에는 그 상태로 서버까지 가서 400 「Invalid PNG」로 돌아왔다.
	 */
	const ppiOptions = useMemo(() => {
		if (
			!draft ||
			!isPrintFormat(draft.format) ||
			draft.width === null ||
			draft.height === null
		) {
			return basePpiOptions
		}
		const narrowed = printablePpiOptions(
			pixelsToMillimeters(draft.width, ppi),
			pixelsToMillimeters(draft.height, ppi),
			basePpiOptions,
		)
		// 🔴 하나도 안 남으면 **빈 목록을 그대로 돌려준다.** 원래 목록으로 되돌리면 못 만드는 값이
		//    다시 떠서 목록이 거짓말을 한다 — 화면은 「고를 수 있다」고 하고 실제로는 거부된다.
		//    비었을 때 무엇을 보여줄지는 `SizingControls`가 정한다.
		return narrowed
	}, [basePpiOptions, draft, ppi])

	const setDraft = useCallback(
		(update: (current: GraphicOutputDraft | null) => GraphicOutputDraft | null) => {
			setDraftState((current) => ({
				profileId: config.id,
				draft: update(
					current.profileId === config.id
						? current.draft
						: createGraphicOutputDraft(config),
				),
			}))
		},
		[config],
	)
	useEffect(() => {
		if (!viewport) return
		setDraft((current) =>
			current &&
			current.format !== 'mp4' &&
			(current.width === null || current.height === null)
				? { ...current, ...normalizeOutputSize(viewport) }
				: current,
		)
	}, [setDraft, viewport])
	const setFormat = useCallback(
		(format: StudioOutputFormat) => {
			if (!config.output.formats.includes(format)) return
			setDraft(() => createGraphicOutputDraft(config, format, viewport))
		},
		[config, setDraft, viewport],
	)
	/**
	 * 크기를 바꾼다. **거부하면 `false`를 돌려준다.**
	 *
	 * 🔴 반환값이 있어야 하는 이유: 해상도 변경은 「픽셀을 다시 잡고 → ppi를 확정」하는 **한 쌍**인데,
	 *    앞쪽만 거부하고 뒤쪽이 통과하면 `mm = px ÷ ppi`가 깨져 **판형이 조용히 바뀐다.**
	 *    실제로 600×1800mm 배너가 144×432mm로 나갔다. 호출부가 실패를 알아야 뒤쪽을 멈출 수 있다.
	 * 🔑 판정을 `setDraft` 콜백 밖에서 한다 — 안에서 하면 결과를 밖으로 꺼낼 수 없다.
	 */
	const setSize = useCallback(
		(size: GraphicOutputSize): boolean => {
			if (!validOutputSize(size) || !draft) return false
			if (draft.format === 'mp4') {
				const video = config.output.video?.mp4
				if (!video || size.width > video.maxWidth || size.height > video.maxHeight) {
					return false
				}
			}
			// 🔴 인쇄 형식은 서버가 픽셀 한도를 판정하고 그 결과가 400 「Invalid PNG」로 온다 —
			//    화면 문구가 크기 얘기를 못 하므로 렌더는 되고 저장만 실패한다. 여기서 막는다.
			if (isPrintFormat(draft.format) && !fitsPrintOutput(size.width, size.height)) {
				return false
			}
			setDraft((current) => (current ? { ...current, ...size } : current))
			return true
		},
		[config.output.video, draft, setDraft],
	)
	const setFps = useCallback(
		(fps: VideoExportSpec['fps']) => {
			if (!config.output.video?.mp4.fps.includes(fps)) return
			setDraft((current) => (current?.format === 'mp4' ? { ...current, fps } : current))
		},
		[config.output.video, setDraft],
	)
	const setDuration = useCallback(
		(durationSeconds: number) => {
			const maxDuration = config.output.video?.mp4.maxDurationSeconds
			if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !maxDuration) return
			setDraft((current) =>
				current?.format === 'mp4' && durationSeconds <= maxDuration
					? { ...current, durationSeconds }
					: current,
			)
		},
		[config.output.video, setDraft],
	)
	const changePpi = useCallback(
		(next: PrintPpi) => {
			// 🔑 프리셋 목록이 아니라 유효 범위로 받는다 — 직접 입력한 값이 조용히 무시되면 안 된다.
			if (acceptsPrintPpi(config.output, next)) setPpi(next)
		},
		[config.output],
	)
	const createVectorArtifact = useCallback(
		(width: number, height: number) =>
			getGraphicStudioVectorArtifact(config, values, { width, height }),
		[config, values],
	)
	const execute = useCallback(
		(request: GraphicExportRequest) => {
			const fileName = exportFileName(config.name, new Date())
			const artifact =
				request.artifact === 'raster'
					? artifacts?.raster
					: request.artifact === 'video'
						? artifacts?.video
						: createVectorArtifact(request.options.width, request.options.height)
			if (!artifact) throw new Error(`${request.artifact} export is unavailable.`)
			return executeArtifactExport({
				artifact,
				fileName,
				renderSize: request.artifact === 'raster' ? request.size : undefined,
				request,
			})
		},
		[artifacts, config.name, createVectorArtifact],
	)
	const graphicExport = useExport<GraphicExportRequest>({
		capability: config.output,
		canExport: (request) => {
			switch (request.artifact) {
				case 'raster':
					return Boolean(artifacts?.raster)
				case 'vector':
					return (
						createVectorArtifact(request.options.width, request.options.height) !== null
					)
				case 'video':
					return Boolean(artifacts?.video)
			}
		},
		execute,
	})
	const request = createGraphicExportRequest(config, draft, ppi)

	return {
		output: {
			draft,
			canExport: Boolean(request && graphicExport.canExport(request)),
			busy: graphicExport.exporting !== null,
			error: graphicExport.error,
			setFormat,
			setSize,
			setFps,
			setDuration,
			ppi,
			ppiOptions,
			setPpi: changePpi,
			run: () => {
				if (request) void graphicExport.run(request)
			},
		},
	}
}

/** 픽셀 한도가 걸리는 형식. 서버가 판정하는 대상과 같다. */
function isPrintFormat(format: GraphicOutputDraft['format']): boolean {
	return format === 'tiff' || format === 'pdf'
}

function createGraphicOutputDraft(
	config: GraphicStudioConfig,
	requestedFormat?: StudioOutputFormat,
	viewport?: GraphicOutputSize | null,
): GraphicOutputDraft | null {
	const format =
		requestedFormat ??
		config.output.formats.find((candidate) => candidate === 'svg' || candidate === 'mp4') ??
		config.output.formats[0]
	if (format === 'svg') {
		return { format, width: viewport?.width ?? null, height: viewport?.height ?? null }
	}
	if (format === 'mp4') {
		const video = config.output.video?.mp4
		const fps = video?.fps.includes(30) ? 30 : video?.fps[0]
		if (!video || !fps) return null
		return {
			format,
			width: video.maxWidth,
			height: video.maxHeight,
			fps,
			durationSeconds: Math.min(5, video.maxDurationSeconds),
		}
	}
	if (format === 'png' || format === 'jpeg') {
		return { format, width: viewport?.width ?? null, height: viewport?.height ?? null }
	}
	if (format === 'tiff' || format === 'pdf') {
		return { format, width: viewport?.width ?? null, height: viewport?.height ?? null }
	}
	return null
}

function createGraphicExportRequest(
	config: GraphicStudioConfig,
	draft: GraphicOutputDraft | null,
	ppi: PrintPpi,
): GraphicExportRequest | null {
	if (!draft) return null
	if (draft.format === 'svg') {
		if (draft.width === null || draft.height === null) return null
		return {
			artifact: 'vector',
			format: 'svg',
			colorProfile: {
				space: 'rgb',
				icc: config.output.colorProfiles?.rgb?.[0] ?? 'srgb',
			},
			options: { width: draft.width, height: draft.height, outlineText: false, ppi },
		}
	}
	if (
		draft.format === 'png' ||
		draft.format === 'jpeg' ||
		draft.format === 'tiff' ||
		draft.format === 'pdf'
	) {
		if (draft.width === null || draft.height === null) return null
		const size = { width: draft.width, height: draft.height }
		const request = createRasterExportRequest(draft.format, config.output, { ...size, ppi })
		return request ? { ...request, size } : null
	}
	if (draft.format !== 'mp4') return null
	const video = config.output.video?.mp4
	if (!video) return null
	const options = {
		container: 'mp4' as const,
		codec: video.codec,
		colorSpace: video.colorSpace,
		width: draft.width,
		height: draft.height,
		fps: draft.fps,
		durationSeconds: draft.durationSeconds,
	}
	return config.artifacts.video
		? {
				artifact: 'video',
				format: 'mp4',
				options,
			}
		: {
				artifact: 'raster',
				format: 'mp4',
				options,
				size: { width: draft.width, height: draft.height },
			}
}

function validOutputSize(size: GraphicOutputSize): boolean {
	return (
		Number.isInteger(size.width) &&
		size.width > 0 &&
		Number.isInteger(size.height) &&
		size.height > 0
	)
}

function normalizeOutputSize(size: GraphicOutputSize): GraphicOutputSize {
	return {
		width: Math.max(1, Math.round(size.width)),
		height: Math.max(1, Math.round(size.height)),
	}
}
