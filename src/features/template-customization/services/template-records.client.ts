import { toRelationshipId } from '@/lib/payload-relationship'
import {
	type StudioPreviewImage,
	toStudioPreviewImage,
} from '@/modules/studio-controller/controller-definition'
import type { Template } from '@/payload-types'
import type { TemplateNodeConfigMap } from '@/types/template'

/**
 * 앱의 템플릿 데이터 편집(manager 이상)이 쓰는 Payload REST 호출 — 목록·생성·휴지통.
 * 권한(`managerManagedPublishedAccess`)과 저장 검증(`prepareTemplateSave`)은 서버가 집행한다.
 */

export type TemplateRecord = {
	id: number
	name: string
	slug: string
	categoryId: number | null
	outputKind: Template['outputKind']
	width: number | null
	height: number | null
	size: { width: number | null; height: number | null } | null
	status: 'draft' | 'published'
	description?: string | null
	updatedAt: string
	previewImage?: StudioPreviewImage
}

export type TemplateCategoryOption = { id: number; title: string }

/** Figma 가져오기 결과로 채운 새 템플릿 — 저장 hook이 받는 필드 그대로다. */
export type TemplateCreateInput = {
	name: string
	/** 비우면 서버가 이름으로 만든다(`urlSlugField`). */
	slug?: string
	description?: string
	category: number
	outputKind: Template['outputKind']
	sourceUrl: string
	baseHtml: string
	html: string
	overrides: Record<string, unknown>
	width: number
	height: number
	/** 인쇄판만 mm로 적는다. 디지털판은 비우면 서버가 Figma 판 px로 채운다. */
	size?: { width: number; height: number }
}

async function failure(response: Response, fallback: string): Promise<Error> {
	const body = (await response.json().catch(() => null)) as {
		errors?: { message?: string; data?: { errors?: { message?: string }[] } }[]
	} | null
	const first = body?.errors?.[0]
	return new Error(first?.data?.errors?.[0]?.message ?? first?.message ?? fallback)
}

async function readStatus(id: number, draft: boolean): Promise<string | null | undefined> {
	const response = await fetch(`/api/templates/${id}?depth=0${draft ? '&draft=true' : ''}`)
	if (!response.ok) throw new Error('템플릿을 읽지 못했어요.')
	return ((await response.json()) as { _status?: string | null })._status
}

type TemplateDraftDoc = Record<string, unknown> & { _status?: string | null }

/**
 * 템플릿 최신 초안 한 건을 메모리에 든다 — Manager mode는 사용자가 예측하지 못한 새 층이라 열리는 속도가 중요하다
 * (사용자 2026-10-14). 화면 표시는 받아 둔 것을 쓰고(`maxAge` 무한), 저장 직전 읽기는 새로 받는다(`maxAge` 0 —
 * 그 사이 남이 고친 값을 덮지 않게). 저장하면 응답 문서로 갈아 끼운다.
 */
const drafts = new Map<number, { at: number; doc: Promise<TemplateDraftDoc> }>()

export function readTemplateDraft(templateId: number, maxAge = 0): Promise<TemplateDraftDoc> {
	const hit = drafts.get(templateId)
	if (hit && performance.now() - hit.at <= maxAge) return hit.doc
	const doc = fetch(`/api/templates/${templateId}?depth=0&draft=true`).then(async (response) => {
		if (!response.ok) throw await failure(response, '템플릿을 읽지 못했어요.')
		return (await response.json()) as TemplateDraftDoc
	})
	const entry = { at: performance.now(), doc }
	drafts.set(templateId, entry)
	doc.catch(() => {
		if (drafts.get(templateId) === entry) drafts.delete(templateId)
	})
	return doc
}

/** Manager mode를 켜는 순간 미리 받아 둔다 — 첫 폼이 기다리지 않게. */
export function prefetchTemplateDraft(templateId: number): void {
	readTemplateDraft(templateId, Number.POSITIVE_INFINITY).catch(() => {})
}

/**
 * 템플릿 한 건을 고친다.
 * 🔴 `_status`를 읽은 그대로 되쓴다. 빠뜨리면 최신(초안) 버전을 따라 써 게시 템플릿이 초안으로 떨어진다
 *    (`/api/studio/preview`와 같은 이유·같은 가드). admin에 발행 안 한 초안이 있으면 그 초안을 덮어
 *    발행하게 되므로 거부한다.
 */
export async function patchTemplate(
	templateId: number,
	data: Record<string, unknown>,
	fallback: string,
): Promise<void> {
	// 저장 직전 읽기(읽고-고쳐-쓰기)가 방금 새로 받은 것을 그대로 쓴다 — 상태를 따로 읽지 않는다.
	const status = (await readTemplateDraft(templateId, 3000))._status
	if (status === 'draft' && (await readStatus(templateId, false)) === 'published') {
		throw new Error(
			'admin에 발행하지 않은 초안이 있어요. 초안을 발행하거나 되돌린 뒤 다시 저장해 주세요.',
		)
	}

	const response = await fetch(`/api/templates/${templateId}?depth=0`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...data, _status: status }),
	})
	if (!response.ok) throw await failure(response, fallback)
	const saved = ((await response.json().catch(() => null)) as { doc?: TemplateDraftDoc } | null)
		?.doc
	if (saved) drafts.set(templateId, { at: performance.now(), doc: Promise.resolve(saved) })
	else drafts.delete(templateId)
}

const RECORD_FIELDS = [
	'name',
	'slug',
	'description',
	'category',
	'outputKind',
	'width',
	'height',
	'size',
	'updatedAt',
	'previewImage',
	'_status',
]
const RECORD_SELECT = RECORD_FIELDS.map((field) => `select[${field}]=true`).join('&')

type TemplateRecordDoc = Omit<TemplateRecord, 'categoryId' | 'status' | 'previewImage'> & {
	category?: { id: number } | number | null
	previewImage?: unknown
	_status?: 'draft' | 'published' | null
}

/** 썸네일 url이 필요해 관계를 한 단계 펼쳐 읽는다 — 카테고리도 펼쳐 오므로 id로 되돌린다. */
function toRecord({ category, previewImage, _status, ...doc }: TemplateRecordDoc): TemplateRecord {
	return {
		...doc,
		categoryId: toRelationshipId(category) ?? null,
		status: _status ?? 'draft',
		previewImage: toStudioPreviewImage(previewImage),
	}
}

/** 초안 포함 전체 템플릿(휴지통 제외) — 최근 수정 순. */
export async function listTemplateRecords(): Promise<TemplateRecord[]> {
	const response = await fetch(
		`/api/templates?depth=1&draft=true&limit=200&sort=-updatedAt&${RECORD_SELECT}`,
	)
	if (!response.ok) throw await failure(response, '템플릿 목록을 읽지 못했어요.')
	const body = (await response.json()) as { docs: TemplateRecordDoc[] }
	return body.docs.map(toRecord)
}

/** 템플릿 한 건(최신 초안 포함). */
export async function readTemplateRecord(templateId: number): Promise<TemplateRecord> {
	const response = await fetch(`/api/templates/${templateId}?depth=1&draft=true&${RECORD_SELECT}`)
	if (!response.ok) throw await failure(response, '템플릿을 읽지 못했어요.')
	return toRecord((await response.json()) as TemplateRecordDoc)
}

/** Payload 템플릿 폼의 기본 정보 칸 — 사이드바의 판형·카테고리까지. */
export type TemplateInfoPatch = {
	name: string
	slug: string
	description: string
	category: number
	outputKind: Template['outputKind']
	size: { width: number; height: number }
}

export function updateTemplateInfo(
	templateId: number,
	patch: Partial<TemplateInfoPatch>,
): Promise<void> {
	return patchTemplate(templateId, patch, '템플릿을 저장하지 못했어요.')
}

export async function listTemplateCategoryOptions(): Promise<TemplateCategoryOption[]> {
	const response = await fetch('/api/template-categories?depth=0&limit=100&sort=displayOrder')
	if (!response.ok) throw await failure(response, '카테고리를 읽지 못했어요.')
	const body = (await response.json()) as { docs: { id: number; title: string }[] }
	return body.docs.map(({ id, title }) => ({ id, title }))
}

/** 만들자마자 게시한다 — 앱의 데이터 편집은 「바로 반영」이다(사용자 2026-10-13). */
export async function createTemplate(input: TemplateCreateInput): Promise<void> {
	const response = await fetch('/api/templates?depth=0', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...input, _status: 'published' }),
	})
	if (!response.ok) throw await failure(response, '템플릿을 만들지 못했어요.')
}

/** 휴지통으로 옮긴다(`deletedAt`). 영구 삭제(`DELETE`)는 앱에서 하지 않는다. */
export function trashTemplate(templateId: number): Promise<void> {
	return patchTemplate(
		templateId,
		{ deletedAt: new Date().toISOString() },
		'휴지통으로 옮기지 못했어요.',
	)
}

/** 레이어 원본과 노드 설정 — Manager mode의 레이어 묶음 폼이 숨김 레이어까지 그리려고 읽는다. */
export type TemplateLayerSource = { baseHtml: string; overrides: TemplateNodeConfigMap }

/** `maxAge`: 화면 표시는 받아 둔 것(무한), 저장 직전 읽기는 새로(0, 기본) — `readTemplateDraft`. */
export async function readTemplateLayerSource(
	templateId: number,
	maxAge = 0,
): Promise<TemplateLayerSource> {
	const doc = (await readTemplateDraft(templateId, maxAge)) as {
		baseHtml?: string | null
		overrides?: TemplateNodeConfigMap | null
	}
	if (!doc.baseHtml) throw new Error('Figma에서 가져온 원본이 없는 템플릿이에요.')
	return { baseHtml: doc.baseHtml, overrides: doc.overrides ?? {} }
}

/** 판형(디지털 px / 인쇄 mm)과 크기. 비율·정수 검증은 서버(`validateTemplateSize`)가 한다. */
export function updateTemplateOutput(
	templateId: number,
	output: { outputKind: Template['outputKind']; size: { width: number; height: number } },
): Promise<void> {
	return patchTemplate(templateId, output, '판형을 저장하지 못했어요.')
}

/**
 * 템플릿 필드 몇 개를 최신 초안 기준으로 읽는다(Manager mode 폼 공용). 관계는 펼치지 않는다(depth=0).
 */
export async function readTemplateFields<T extends Record<string, unknown>>(
	templateId: number,
	fields: readonly (keyof T & string)[],
	maxAge = 0,
): Promise<T> {
	const doc = await readTemplateDraft(templateId, maxAge)
	return Object.fromEntries(fields.map((field) => [field, doc[field]])) as T
}
