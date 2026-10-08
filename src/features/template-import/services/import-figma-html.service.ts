import { createHash } from 'node:crypto'
import type { Payload } from 'payload'
import {
	deleteDraftImportedApplicationImage,
	storeDraftImportedApplicationImage,
} from '@/features/application-image/repositories/imported-application-image.payload.repository'
import { findFigmaToken } from '@/features/auth/services/user-settings.service'
import {
	downloadFigmaImage,
	findFigmaImageFillUrls,
	findFigmaImageUrls,
	findFigmaNodeTree,
} from '@/features/template-import/repositories/figma.rest.repository'
import {
	convertFigmaNodeToHtml,
	type FigmaHtmlResult,
	type FigmaRenderedAsset,
} from '@/features/template-import/utils/figma-node-to-html'
import {
	type FigmaAssetPlan,
	type FigmaRasterDiagnostic,
	type FigmaTruncationDiagnostic,
	planFigmaAssets,
} from '@/features/template-import/utils/normalize-figma-node'
import { FigmaConfigurationError, FigmaImportError } from '@/lib/errors'
import type { User } from '@/payload-types'

export type {
	FigmaRasterDiagnostic,
	FigmaTruncationDiagnostic,
} from '@/features/template-import/utils/normalize-figma-node'

/** 임시 URL 하나를 내려받아 draft 에셋으로 저장하기 위한 작업 단위. */
interface AssetDownloadJob {
	/** 결과 맵의 키 — 노드 렌더는 nodeId, IMAGE fill은 imageRef. */
	key: string
	target: 'render' | 'fill'
	name: string
	url: string
	/** 렌더는 요청 포맷과 응답 MIME이 일치해야 한다. fill 원본은 임의 이미지 MIME을 허용한다. */
	expectedMimeType?: 'image/svg+xml' | 'image/png'
}

interface ResolvedFigmaAssets {
	renders: Record<string, FigmaRenderedAsset>
	imageFills: Record<string, FigmaRenderedAsset>
}

/**
 * Figma 프레임(fileKey+nodeId)을 inline-style HTML로 변환해 돌려준다. Admin의 Templates 가져오기 필드가 호출한다.
 * 외부 I/O는 Figma/Application Images repository가 소유하고, 이 서비스는 fetch→에셋 해석→변환 순서만 조율한다.
 * 무엇을 에셋으로 구울지는 utils의 planFigmaAssets(순수)가 판정하고, 여기서는 그 계획을 해석(I/O)만 한다.
 */
export async function importFigmaHtml(
	source: { fileKey: string; nodeId: string },
	payload: Payload,
	user: User,
): Promise<
	FigmaHtmlResult & {
		name: string
		diagnostics: FigmaRasterDiagnostic[]
		truncationDiagnostics: FigmaTruncationDiagnostic[]
	}
> {
	// 요청한 사람의 토큰으로 읽는다 — 그 사람이 열 수 있는 파일만 가져와진다.
	const token = await findFigmaToken(payload, user.id)
	if (!token) throw new FigmaConfigurationError()

	const node = await findFigmaNodeTree(token, source.fileKey, source.nodeId)
	const plan = planFigmaAssets(node)
	const assets = await storePlannedAssets(token, source.fileKey, plan, payload, user)
	const result = convertFigmaNodeToHtml(node, assets.renders, assets.imageFills)

	return {
		...result,
		name: node.name ?? 'Untitled',
		diagnostics: plan.diagnostics,
		truncationDiagnostics: plan.truncationDiagnostics,
	}
}

/** 임시 URL 만료 전에 끝내되 메모리에 동시에 잡는 Buffer 수를 제한하는 다운로드 동시성. */
const DOWNLOAD_CONCURRENCY = 6

/**
 * 에셋 계획을 해석해 draft Application Images로 저장하고 키→에셋 맵을 돌려준다.
 * 하나라도 실패하면 이번 요청에서 새로 만든 draft를 모두 제거하고 첫 오류를 던진다.
 */
async function storePlannedAssets(
	token: string,
	fileKey: string,
	plan: FigmaAssetPlan,
	payload: Payload,
	user: User,
): Promise<ResolvedFigmaAssets> {
	const resolved: ResolvedFigmaAssets = { renders: {}, imageFills: {} }
	if (plan.renders.length === 0 && plan.imageFills.length === 0) return resolved

	const createdAssetIds: number[] = []

	try {
		const jobs = await collectDownloadJobs(token, fileKey, plan)
		await runWithConcurrency(jobs, DOWNLOAD_CONCURRENCY, async (job) => {
			const asset = await storeDownloadedAsset(job, payload, user)
			resolved[job.target === 'render' ? 'renders' : 'imageFills'][job.key] = asset
			if (asset.created) createdAssetIds.push(asset.id)
		})
		return resolved
	} catch (error) {
		await Promise.allSettled(
			createdAssetIds.map((id) => deleteDraftImportedApplicationImage(payload, user, id)),
		)
		throw error
	}
}

/** 계획의 렌더(포맷별 배치)·IMAGE fill(파일 단위 1회) 임시 URL을 모아 다운로드 작업 목록으로 만든다. */
async function collectDownloadJobs(
	token: string,
	fileKey: string,
	plan: FigmaAssetPlan,
): Promise<AssetDownloadJob[]> {
	const jobs: AssetDownloadJob[] = []

	for (const format of ['svg', 'png'] as const) {
		const formatRequests = plan.renders.filter((request) => request.format === format)
		if (formatRequests.length === 0) continue

		const urls = await findFigmaImageUrls(
			token,
			fileKey,
			formatRequests.map((request) => request.nodeId),
			format,
		)
		for (const request of formatRequests) {
			const url = urls[request.nodeId]
			if (!url) {
				throw new FigmaImportError(
					`Figma ${format.toUpperCase()} render failed for node "${request.nodeId}".`,
					`Figma가 일부 레이어를 ${format.toUpperCase()}로 렌더링하지 못했습니다. 원본 레이어를 확인하세요.`,
				)
			}
			jobs.push({
				key: request.nodeId,
				target: 'render',
				name: request.name,
				url,
				expectedMimeType: format === 'svg' ? 'image/svg+xml' : 'image/png',
			})
		}
	}

	if (plan.imageFills.length > 0) {
		const fillUrls = await findFigmaImageFillUrls(token, fileKey)
		for (const fill of plan.imageFills) {
			const url = fillUrls[fill.imageRef]
			if (!url) {
				throw new FigmaImportError(
					`Figma image fill "${fill.imageRef}" not found in file "${fileKey}".`,
					'Figma 이미지 채우기를 찾을 수 없습니다. 원본 레이어를 확인하세요.',
				)
			}
			jobs.push({ key: fill.imageRef, target: 'fill', name: fill.name, url })
		}
	}

	return jobs
}

/** 작업 하나: 다운로드 → MIME 검증 → checksum 파일명으로 draft 저장. */
async function storeDownloadedAsset(
	job: AssetDownloadJob,
	payload: Payload,
	user: User,
): Promise<FigmaRenderedAsset & { created: boolean }> {
	const { data, mimeType } = await downloadFigmaImage(job.url)
	const normalizedMimeType = mimeType.split(';', 1)[0]?.trim() ?? ''

	if (job.expectedMimeType) {
		if (normalizedMimeType !== job.expectedMimeType) {
			throw new FigmaImportError(
				`Figma ${job.expectedMimeType === 'image/svg+xml' ? 'SVG' : 'PNG'} download returned "${mimeType}" for node "${job.key}".`,
				'Figma 렌더 결과의 이미지 형식이 올바르지 않습니다. 잠시 후 다시 가져오세요.',
			)
		}
	} else if (!normalizedMimeType.startsWith('image/')) {
		throw new FigmaImportError(
			`Figma image fill download returned "${mimeType}" for "${job.key}".`,
			'Figma 이미지 채우기의 파일 형식이 올바르지 않습니다. 원본 레이어를 확인하세요.',
		)
	}

	const extension =
		normalizedMimeType === 'image/svg+xml' ? 'svg' : (normalizedMimeType.split('/')[1] ?? 'png')
	const checksum = createHash('sha256').update(data).digest('hex')

	try {
		return await storeDraftImportedApplicationImage(payload, user, {
			data,
			filename: `figma-${checksum.slice(0, 24)}.${extension}`,
			mimeType: normalizedMimeType,
			name: job.name,
		})
	} catch (cause) {
		throw new FigmaImportError(
			'Failed to store imported Figma asset.',
			'Figma에서 가져온 이미지를 저장하지 못했습니다. 서버 로그를 확인하세요.',
			500,
			{ cause },
		)
	}
}

/**
 * 고정 개수의 워커로 작업 목록을 소비한다. 실패해도 진행 중인 작업을 끝까지 기다린 뒤 첫 오류를 던진다 —
 * 정리(cleanup)가 아직 저장 중인 에셋을 놓치지 않게 하기 위해서다.
 * ponytail: 큐·재시도 없는 최소 동시성. 대형 파일에서 모자라면 DOWNLOAD_CONCURRENCY만 조정.
 */
async function runWithConcurrency<T>(
	items: readonly T[],
	limit: number,
	run: (item: T) => Promise<void>,
): Promise<void> {
	let cursor = 0
	const errors: unknown[] = []

	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (cursor < items.length && errors.length === 0) {
				const item = items[cursor]
				cursor += 1
				try {
					await run(item)
				} catch (error) {
					errors.push(error)
				}
			}
		}),
	)

	if (errors.length > 0) throw errors[0]
}
