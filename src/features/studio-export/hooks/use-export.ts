'use client'

import { useCallback, useRef, useState } from 'react'
import { downloadExportResult } from '../adapters/download-export-result.client'
import type { ExportRequest, ExportResult } from '../export-contract'
import { type StudioOutputCapability, supportsStudioExportRequest } from '../studio-output'

const DEFAULT_EXPORT_ERROR = '파일을 내보내지 못했습니다. 잠시 후 다시 시도해 주세요.'

/** Artifact adapter의 가용성·단일 실행·오류 UI 상태만 공통 소유한다. */
export function useExport<Request extends ExportRequest>({
	capability,
	canExport,
	execute,
}: {
	capability: StudioOutputCapability
	canExport?: (request: Request) => boolean
	execute: (
		request: Request,
	) => ExportResult | readonly ExportResult[] | Promise<ExportResult | readonly ExportResult[]>
}) {
	const [exporting, setExporting] = useState<Request | null>(null)
	const [error, setError] = useState<string | null>(null)
	const running = useRef(false)

	const supports = useCallback(
		(request: Request) =>
			supportsStudioExportRequest(capability, request) && (canExport?.(request) ?? true),
		[capability, canExport],
	)
	const run = useCallback(
		async (request: Request): Promise<void> => {
			if (running.current) return
			// 🔴 지원 밖 요청을 조용히 삼키면 버튼을 눌러도 오류도 없이 정지 상태로 보인다 —
			//    같은 「PDF」 버튼이 한 스튜디오에서는 오류를, 다른 스튜디오에서는 무반응을 냈다.
			//    버튼 disabled가 1차 방어이므로 여기서는 이유 한 줄로 충분하다.
			if (!supports(request)) {
				const label = 'format' in request ? request.format.toUpperCase() : '원본'
				setError(`이 프로파일에서는 ${label} 내보내기를 지원하지 않습니다.`)
				return
			}
			running.current = true
			setError(null)
			setExporting(request)

			try {
				const result = await execute(request)
				for (const item of Array.isArray(result) ? result : [result]) {
					downloadExportResult(item)
				}
			} catch (cause) {
				// html-to-image는 img의 onerror Event를 그대로 reject한다 — Error가 아니라
				// 화면 문구에서 원인이 사라지므로, 브라우저 콘솔에는 원본을 남긴다.
				console.error('studio-export.run.failed', cause)
				setError(cause instanceof Error ? cause.message : DEFAULT_EXPORT_ERROR)
			} finally {
				running.current = false
				setExporting(null)
			}
		},
		[execute, supports],
	)

	return { canExport: supports, error, exporting, run }
}
