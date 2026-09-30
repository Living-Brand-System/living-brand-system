'use client'

import { useCallback, useState } from 'react'
import type { ImageGenerationMetadata } from '@/features/image-generation/contexts/image-studio-context'
import type { ImageArtifacts } from '@/features/image-generation/runtime/image-artifact.client'
import { exportFileName, numberedExportFileName } from '@/features/studio-export/export-file-name'
import { exportResultsToZip } from '../adapters/export-results-to-zip.client'
import type {
	ExportRequest,
	ExportResult,
	StudioOutputFormat,
	VideoExportSpec,
} from '../export-contract'
import { type PrintPpi, resolveDefaultPrintPpi } from '../print-policy'
import { createRasterExportRequest } from '../services/create-raster-export-request'
import { executeArtifactExport } from '../services/export-artifact.client'
import { acceptsPrintPpi, type StudioOutputCapability } from '../studio-output'
import { useExport } from './use-export'

export type ImageExportView = ReturnType<typeof useImageExport>
type ImageExportRequest = (
	| Extract<ExportRequest, { artifact: 'original' }>
	| Extract<ExportRequest, { artifact: 'raster' }>
) & { scope: 'selected' | 'all'; package?: 'zip' }

/** Image Artifact의 선택·패키징만 조정하고 형식 변환은 공통 Artifact executor에 맡긴다. */
export function useImageExport({
	artifacts,
	metadata,
	capability,
	selected,
	size,
}: {
	metadata?: ImageGenerationMetadata
	artifacts: ImageArtifacts | null
	capability: StudioOutputCapability
	selected: number | null
	size: { width: number; height: number } | null
}) {
	const [selectedFormat, setSelectedFormat] = useState<StudioOutputFormat | null>(null)
	const [ppi, setPpi] = useState<PrintPpi>(() => resolveDefaultPrintPpi(capability.print?.ppi))
	const [fps, setFps] = useState<VideoExportSpec['fps'] | undefined>(
		() => capability.video?.mp4.fps[0],
	)
	const [durationSeconds, setDurationSeconds] = useState(() =>
		Math.min(5, capability.video?.mp4.maxDurationSeconds ?? 5),
	)
	const effectivePpi = acceptsPrintPpi(capability, ppi)
		? ppi
		: resolveDefaultPrintPpi(capability.print?.ppi)
	const effectiveFps =
		fps && capability.video?.mp4.fps.includes(fps) ? fps : capability.video?.mp4.fps[0]
	const effectiveDuration = Math.min(
		durationSeconds,
		capability.video?.mp4.maxDurationSeconds ?? durationSeconds,
	)
	const formats = capability.formats
	const format =
		selectedFormat && formats.includes(selectedFormat) ? selectedFormat : (formats[0] ?? null)
	const createRequest = useCallback(
		(candidate: StudioOutputFormat | null, scope: ImageExportRequest['scope']) => {
			if (!candidate || !size) return null
			const request = createRasterExportRequest(candidate, capability, {
				...size,
				ppi: effectivePpi,
				fps: effectiveFps,
				durationSeconds: effectiveDuration,
			})
			return request
				? ({
						...request,
						scope,
						...(scope === 'all' ? { package: 'zip' as const } : {}),
					} satisfies ImageExportRequest)
				: null
		},
		[capability, effectiveDuration, effectiveFps, effectivePpi, size],
	)
	const execute = useCallback(
		(request: ImageExportRequest) => {
			if (!artifacts) throw new Error('Image export is unavailable.')
			const items = request.artifact === 'original' ? artifacts.original : artifacts.raster
			const fileName = metadata
				? exportFileName(
						metadata.profileName,
						new Date(metadata.createdAt),
						metadata.prompt,
					)
				: undefined
			return exportScope(items, selected, request, fileName)
		},
		[artifacts, selected, metadata],
	)
	const imageExport = useExport<ImageExportRequest>({
		capability,
		canExport: ({ artifact, package: packageFormat, scope }) => {
			const items = artifact === 'original' ? artifacts?.original : artifacts?.raster
			return Boolean(
				items?.length &&
					(!packageFormat || capability.packages?.includes(packageFormat)) &&
					(scope === 'all' || (selected !== null && items[selected] !== undefined)),
			)
		},
		execute,
	})
	const selectedRequest = createRequest(format, 'selected')
	const allRequest = createRequest(format, 'all')
	const selectedOriginalRequest = createOriginalRequest('selected')
	const allOriginalRequest = createOriginalRequest('all')

	return {
		busy: imageExport.exporting !== null,
		error: imageExport.error,
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
		selected: exportAction(imageExport, selectedRequest),
		all: exportAction(imageExport, allRequest),
		original: {
			available:
				imageExport.canExport(selectedOriginalRequest) ||
				imageExport.canExport(allOriginalRequest),
			selected: exportAction(imageExport, selectedOriginalRequest),
			all: exportAction(imageExport, allOriginalRequest),
		},
	}
}

async function exportScope(
	artifacts: ImageArtifacts['original'] | ImageArtifacts['raster'],
	selected: number | null,
	request: ImageExportRequest,
	fileName?: string,
): Promise<ExportResult | readonly ExportResult[]> {
	const exportOne = (artifact: (typeof artifacts)[number], index: number) =>
		executeArtifactExport({
			artifact,
			fileName: fileName ? numberedExportFileName(fileName, index) : `hd-image-${index + 1}`,
			request,
		})
	if (request.scope === 'selected') {
		if (selected === null || !artifacts[selected])
			throw new Error('저장할 이미지를 선택해 주세요.')
		return exportOne(artifacts[selected], selected)
	}
	const items = await Promise.all(artifacts.map(exportOne))
	return request.package
		? exportResultsToZip({
				format: request.package,
				filename: `${fileName ?? 'hd-images'}.zip`,
				items,
			})
		: items
}

function createOriginalRequest(scope: ImageExportRequest['scope']): ImageExportRequest {
	return {
		artifact: 'original',
		options: {},
		scope,
		...(scope === 'all' ? { package: 'zip' as const } : {}),
	}
}

function exportAction(
	exporter: ReturnType<typeof useExport<ImageExportRequest>>,
	request: ImageExportRequest | null,
) {
	return {
		canExport: Boolean(request && exporter.canExport(request)),
		run: () => {
			if (request) void exporter.run(request)
		},
	}
}
