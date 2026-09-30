import config from '@payload-config'
import { getPayload } from 'payload'
import { FALLBACK_LOCALE, DEFAULT_LOCALE as LOCALE } from '@/lib/locale'
import { toRelationshipId } from '@/lib/payload-relationship'
import {
	type StudioPreviewImage,
	toStudioPreviewImage,
} from '@/modules/studio-controller/controller-definition'
import type { Template } from '@/payload-types'

/** Create 화면 선택기가 쓰는 카테고리 read model. */
export type TemplateCategoryNavItem = {
	id: number
	title: string
	slug: string
}

/**
 * Create 화면 선택기가 쓰는 템플릿 read model.
 * 🔴 관계·upload는 여기서 이미 좁혀져 있다 — 소비자에게 `number | Doc` 유니온을 넘기지 않는다.
 * 렌더 가능 판정에 필요한 원본 필드(html·overrides·크기)는 그대로 지난다.
 */
export type PublishedTemplateNavItem = {
	id: number
	name: string
	slug: string
	categoryId: number | undefined
	previewImage: StudioPreviewImage | undefined
	html: string | null
	overrides: unknown
	width: number | null
	height: number | null
}

/**
 * published Template·카테고리 조회를 공유하는 repository.
 * Worker 화면은 발행된 템플릿만 보므로 draft는 조회하지 않는다.
 * guideline 공개 SSR과 같은 패턴으로 인증 없이 조회한다(overrideAccess 기본값) —
 * published 산출물 표면은 의도적으로 공개이며, draft·비발행본은 여기서 노출되지 않는다.
 */

export async function listTemplateCategories(): Promise<TemplateCategoryNavItem[]> {
	const payload = await getPayload({ config })
	const categories = await payload.find({
		collection: 'template-categories',
		depth: 0,
		fallbackLocale: FALLBACK_LOCALE,
		limit: 100,
		locale: LOCALE,
		sort: 'displayOrder',
		select: {
			title: true,
			slug: true,
		},
	})

	return categories.docs.map((category) => ({
		id: category.id,
		title: category.title,
		slug: category.slug,
	}))
}

export async function listPublishedTemplateNavItems(): Promise<PublishedTemplateNavItem[]> {
	const payload = await getPayload({ config })
	const templates = await payload.find({
		collection: 'templates',
		// 미리보기 이미지를 채우려면 upload 관계가 한 단계 populate돼야 한다(depth 0은 id만 준다).
		depth: 1,
		draft: false,
		fallbackLocale: FALLBACK_LOCALE,
		limit: 200,
		locale: LOCALE,
		sort: '-updatedAt',
		where: {
			_status: {
				equals: 'published',
			},
		},
		select: {
			name: true,
			slug: true,
			category: true,
			html: true,
			overrides: true,
			previewImage: true,
			width: true,
			height: true,
		},
	})

	return templates.docs.map((template) => ({
		id: template.id,
		name: template.name,
		slug: template.slug,
		categoryId: toRelationshipId(template.category),
		previewImage: toStudioPreviewImage(template.previewImage),
		html: template.html ?? null,
		overrides: template.overrides,
		width: template.width ?? null,
		height: template.height ?? null,
	}))
}

export async function findPublishedTemplate(templateSlug: string): Promise<
	| (Template & {
			backgroundPolicy?: unknown
			previewImage?: unknown
	  })
	| null
> {
	const payload = await getPayload({ config })
	const templates = await payload.find({
		collection: 'templates',
		// 미리보기 이미지를 채우려면 upload 관계가 한 단계 populate돼야 한다(depth 0은 id만 준다).
		depth: 1,
		draft: false,
		fallbackLocale: FALLBACK_LOCALE,
		limit: 1,
		locale: LOCALE,
		where: {
			slug: {
				equals: templateSlug,
			},
			_status: {
				equals: 'published',
			},
		},
		select: {
			backgroundPolicy: true,
			name: true,
			updatedAt: true,
			html: true,
			overrides: true,
			previewImage: true,
			width: true,
			height: true,
			// 🔴 화이트리스트에 없으면 타입은 통과하는데 런타임 값이 영원히 undefined다.
			canvasPpi: true,
			exportPolicy: true,
		},
	})

	return (
		(templates.docs[0] as
			| (Template & {
					backgroundPolicy?: unknown
					previewImage?: unknown
			  })
			| undefined) ?? null
	)
}
