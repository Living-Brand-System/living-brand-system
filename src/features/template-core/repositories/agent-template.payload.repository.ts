import config from '@payload-config'
import { getPayload } from 'payload'
import { DEFAULT_LOCALE, FALLBACK_LOCALE } from '@/lib/locale'
import type { Template } from '@/payload-types'

export type AgentTemplateDocument = Pick<
	Template,
	| 'category'
	| 'description'
	| 'exportPolicy'
	| 'height'
	| 'html'
	| 'id'
	| 'name'
	| 'overrides'
	| 'slug'
	| 'updatedAt'
	| 'width'
> & {
	backgroundPolicy?: unknown
}

/**
 * 두 조회가 공유하는 published 템플릿 질의 기본값.
 * overrideAccess: true — overrides에 field access(read: isManager)가 걸려 있어 false면
 * worker 사용자 요청에서 슬롯 스펙(aiInstruction 포함)이 벗겨진다. where·draft로
 * published-only는 강제된다.
 *
 * 🔴 **「서버 전용이라 안전하다」가 아니다.** `findTemplatesForRequest`는 `toModelOutput`이 없어
 *    그 출력이 브라우저로도 나가고, 거기에 manager-only 필드인 `overrides.input.aiInstruction`이
 *    실린다. 선재 부채이고 지금 빼면 모델이 슬롯 제약을 아는 유일한 통로가 사라진다 —
 *    좁히려면 그 문구를 모델 컨텍스트(지시문)로 옮기는 것이 업그레이드 경로다.
 */
function publishedTemplateQuery(user: unknown) {
	return {
		collection: 'templates' as const,
		depth: 1,
		draft: false,
		fallbackLocale: FALLBACK_LOCALE,
		locale: DEFAULT_LOCALE,
		overrideAccess: true,
		user: user as never,
		// ponytail: 목록 질의가 html 원문(현재 수 KB)을 함께 나른다. 템플릿이 수백 개로 늘면
		// 저장 시점에 슬롯 요약을 별도 필드로 스냅샷해 목록에서 html을 빼는 게 업그레이드 경로.
		select: {
			name: true,
			// 스튜디오 라우트가 `/studio/template/[templateSlug]`뿐이라 챗이 「적용」으로 보낼 주소를 만들 때 필요하다.
			slug: true,
			description: true,
			// 모델이 「어느 템플릿이 이 요청에 맞나」를 고르는 근거 — depth:1이라 제목까지 채워진다.
			category: true,
			html: true,
			overrides: true,
			width: true,
			height: true,
			exportPolicy: true,
			updatedAt: true,
			backgroundPolicy: true,
		},
	} as const
}

export async function listAgentTemplates(user: unknown): Promise<AgentTemplateDocument[]> {
	const payload = await getPayload({ config })
	const templates = await payload.find({
		...publishedTemplateQuery(user),
		limit: 50,
		sort: '-updatedAt',
		where: {
			_status: {
				equals: 'published',
			},
		},
	})

	return templates.docs as unknown as AgentTemplateDocument[]
}

export async function findAgentTemplate(
	user: unknown,
	templateId: number,
): Promise<AgentTemplateDocument | null> {
	const payload = await getPayload({ config })
	const templates = await payload.find({
		...publishedTemplateQuery(user),
		limit: 1,
		where: {
			id: {
				equals: templateId,
			},
			_status: {
				equals: 'published',
			},
		},
	})

	return (templates.docs[0] as unknown as AgentTemplateDocument | undefined) ?? null
}
