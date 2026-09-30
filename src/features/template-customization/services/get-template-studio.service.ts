import { listGraphicStudioConfigs } from '@/features/graphic-generation/services/list-graphic-studio-configs.service'
import { listImageStudioConfigs } from '@/features/image-generation/services/list-image-studio-configs.service'
import {
	deriveTemplateStudioConfig,
	type PublishedTemplateView,
	type TemplateStudioConfig,
} from '@/features/template-customization/domain/template-studio-config'
import { getTemplateHighlightColor } from '@/features/template-customization/repositories/brand-highlight-color.payload.repository'
import { getPublishedTemplate } from '@/features/template-customization/services/get-published-template.service'

export type GetTemplateStudioOutput = {
	config: TemplateStudioConfig
	template: PublishedTemplateView
	/** 캔버스에서 편집 중인 슬롯을 집어 보여 줄 때 쓰는 색. 못 찾으면 null이고 화면이 폴백한다. */
	highlightColor: string | null
}

/**
 * 유스케이스 경계: 템플릿 스튜디오 열기.
 * published 템플릿과 참조 Image·Graphic Config(각 소유 feature의 공개 서비스)를 조합해
 * Effective TemplateStudioConfig를 파생한다. Payload 원본과 Admin 정책은 이 서비스 밖으로
 * 나가지 않는다 — 클라이언트에는 PublishedTemplateView만 반환한다.
 * 호출자(페이지)가 requireUser로 인증을 보장한다 — 비회원 분기는 여기 두지 않는다.
 */
export async function getTemplateStudio(
	templateSlug: string,
	user: unknown,
): Promise<GetTemplateStudioOutput | null> {
	const [published, imageConfigs, graphicConfigs, highlight] = await Promise.all([
		getPublishedTemplate(templateSlug),
		listImageStudioConfigs(user),
		listGraphicStudioConfigs(user),
		getTemplateHighlightColor(),
	])

	if (!published) return null

	const { id, name, html, width, height } = published
	return {
		config: deriveTemplateStudioConfig(published, imageConfigs, graphicConfigs),
		template: { id, name, html, width, height },
		highlightColor: highlight,
	}
}
