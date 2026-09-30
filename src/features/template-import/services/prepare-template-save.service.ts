import type { PayloadRequest } from 'payload'
import { publishDraftImportedApplicationImages } from '@/features/application-image/repositories/imported-application-image.payload.repository'
import { findPrintOutputBlocker } from '@/features/studio-export/print-policy'
import {
	inspectTemplateFragment,
	type TemplateFragmentInspection,
} from '@/features/template-core/domain/inspect-template-html'
import {
	type ParsedTemplateNodeConfigs,
	parseTemplateNodeConfigs,
} from '@/features/template-core/domain/parse-template-node-configs'
import { sameRef } from '@/features/template-core/domain/template-asset-policy'
import { deriveTemplateStudioConfig } from '@/features/template-customization/domain/template-studio-config'
import {
	findTemplateDraftBlocker,
	findTemplatePublishBlocker,
	nonEmptyString,
} from './validate-template-save.service'

interface TemplateSaveCandidate {
	_status?: unknown
	baseHtml?: unknown
	backgroundPolicy?: unknown
	height?: unknown
	html?: unknown
	id?: unknown
	name?: unknown
	overrides?: unknown
	exportPolicy?: unknown
	width?: unknown
}

/**
 * Template 저장 전 구조·인쇄 정책·발행 에셋을 한 순서로 준비하는 import Use Case.
 * overrides 파싱과 base/draft fragment 파싱은 여기서 각 1회만 하고 검증 함수들과 공유한다.
 * Payload 조회·에셋 승격 I/O는 각 repository가 소유하고 같은 req 트랜잭션을 사용한다.
 */
export async function prepareTemplateSave({
	data,
	originalDoc,
	req,
}: {
	data: TemplateSaveCandidate
	originalDoc?: TemplateSaveCandidate | null
	req: PayloadRequest
}): Promise<string | null> {
	const candidate = { ...originalDoc, ...data }
	const baseHtml = nonEmptyString(candidate.baseHtml) ? candidate.baseHtml : undefined
	const html = nonEmptyString(candidate.html) ? candidate.html : undefined

	let parsed: ParsedTemplateNodeConfigs | undefined
	let base: TemplateFragmentInspection | undefined
	let draft: TemplateFragmentInspection | undefined
	if (baseHtml || html) {
		const parsedResult = parseTemplateNodeConfigs(candidate.overrides)
		if ('blocker' in parsedResult) return parsedResult.blocker
		parsed = parsedResult
		base = baseHtml ? inspectTemplateFragment(baseHtml, 'base') : undefined
		draft = html ? inspectTemplateFragment(html, 'draft') : undefined

		const draftBlocker = findTemplateDraftBlocker(parsed, base, draft)
		if (draftBlocker) return draftBlocker
	}

	const finalStatus = data._status ?? originalDoc?._status
	if (finalStatus !== 'published') return null
	if (typeof candidate.width === 'number' && typeof candidate.height === 'number') {
		const printBlocker = findPrintOutputBlocker({
			enabled: allowsPrint(candidate.exportPolicy),
			height: candidate.height,
			width: candidate.width,
		})
		if (printBlocker) return printBlocker
	}

	if (
		html &&
		parsed &&
		typeof candidate.width === 'number' &&
		typeof candidate.height === 'number'
	) {
		try {
			deriveTemplateStudioConfig({
				kind: 'html',
				id: typeof candidate.id === 'number' ? candidate.id : 0,
				name: typeof candidate.name === 'string' ? candidate.name : 'Template',
				html,
				nodeConfigs: parsed.data,
				width: candidate.width,
				height: candidate.height,
				templateVersion: 'draft',
				exportPolicy: candidate.exportPolicy as never,
				backgroundPolicy: candidate.backgroundPolicy as never,
			})
		} catch (error) {
			return error instanceof Error ? error.message : '템플릿 Controller 계약을 확인하세요.'
		}
	}

	const renderedRefs = draft?.refs ?? []
	await publishDraftImportedApplicationImages(
		req,
		(base?.refs ?? [])
			.filter(
				(imported) =>
					imported.collection === 'application-images' &&
					renderedRefs.some((rendered) => sameRef(rendered, imported)),
			)
			.map((ref) => ref.assetId),
	)

	return findTemplatePublishBlocker(candidate, parsed, base, req)
}

function allowsPrint(policy: unknown): boolean {
	if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return true
	const allowed = (policy as { allowedFormats?: unknown }).allowedFormats
	// 빈 배열은 「설정한 적 없음」이다 — `projectStudioOutputPolicy`와 같은 이유로 좁히지 않는다.
	if (!Array.isArray(allowed) || allowed.length === 0) return true
	return allowed.includes('tiff') || allowed.includes('pdf')
}
