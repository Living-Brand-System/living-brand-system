import {
	AUTHORIZED_TEMPLATE_ASSET_COLLECTIONS,
	isCanonicalTemplateAssetUrl,
} from './template-asset-policy'

/** 화면 상태 하나가 이보다 크면 비정상이다 — 문구·색·이미지 참조뿐이라 수 KB면 충분하다. */
const MAX_DEFAULT_SESSION_LENGTH = 200_000

/**
 * 템플릿 「기본 화면」(`defaultSession`) 저장 검증. 이 값은 모든 사용자의 스튜디오가 그대로 그리므로,
 * 그 안의 이미지 주소는 템플릿 HTML과 같은 기준(인가된 내부 에셋 URL)만 통과시킨다.
 * 🔑 모양(슬롯·값의 계약)은 보지 않는다 — 스튜디오가 복원할 때 지금 슬롯에 맞는 값만 남긴다.
 */
export function findTemplateDefaultSessionBlocker(value: unknown): string | null {
	if (value === null || value === undefined) return null
	if (typeof value !== 'object' || Array.isArray(value)) {
		return '기본 화면 형식이 올바르지 않습니다.'
	}
	if (JSON.stringify(value).length > MAX_DEFAULT_SESSION_LENGTH) {
		return '기본 화면이 너무 큽니다.'
	}
	return hasForeignImageUrl(value) ? '기본 화면의 이미지는 내부 에셋이어야 합니다.' : null
}

function hasForeignImageUrl(node: unknown): boolean {
	if (!node || typeof node !== 'object') return false
	return Object.entries(node).some(([key, child]) =>
		typeof child === 'string'
			? (key === 'url' || key === 'thumbnailUrl') &&
				!isCanonicalTemplateAssetUrl(child, AUTHORIZED_TEMPLATE_ASSET_COLLECTIONS)
			: hasForeignImageUrl(child),
	)
}
