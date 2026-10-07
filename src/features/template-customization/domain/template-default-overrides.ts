import type { TemplateNodeConfig, TemplateNodeConfigMap } from '@/types/template'

/**
 * 스튜디오 세션이 만든 노드 설정을 **템플릿에 저장하는 기본값**(`overrides`)에 얹는다 —
 * 「지금 이 상태를 기본값으로」 버튼의 규칙이다.
 *
 * 🔑 저장 자리가 있는 값만 옮긴다: 문구 · 로고 색 · 생성 이미지(위치·크기·색 치환 포함).
 *    세션에만 있는 값(전역 텍스트 색 · 이미지 디밍 · 배경 · 레이어 표시)은 `overrides`에 담을 자리가
 *    없어 옮기지 않는다 — 버튼 설명이 이를 미리 알린다. 레이어 표시는 정책이 아니라 창작자 몫이다
 *    (admin 사용 상태 편집기 참조).
 * 🔑 문구는 **바뀐 것만** 쓴다. 손대지 않은 문구까지 쓰면 그 노드가 admin 값으로 굳어서,
 *    Figma에서 고친 문구가 재가져오기로 더는 들어오지 않는다.
 * 🔴 샘플 이미지는 거부한다. 발행 템플릿의 이미지는 생성 이미지 참조(`generatedImageId`)만
 *    허용되므로(`findTemplatePublishBlocker`) 저장 직전에 막혀 나머지까지 날아간다.
 */
export function mergeTemplateDefaultOverrides(
	stored: TemplateNodeConfigMap,
	session: TemplateNodeConfigMap,
	initialText: Readonly<Record<string, string>>,
): { overrides: TemplateNodeConfigMap } | { blocker: string } {
	const overrides: TemplateNodeConfigMap = { ...stored }
	for (const [nodeId, value] of Object.entries(session)) {
		const next: TemplateNodeConfig = { ...stored[nodeId] }
		if (value.text !== undefined && value.text !== initialText[nodeId]) next.text = value.text
		if (value.vectorColor) next.vectorColor = value.vectorColor
		if (value.imageColorize) next.imageColorize = value.imageColorize
		if (value.backgroundImage) {
			if (value.assetRef?.collection !== 'generated-images') {
				return {
					blocker:
						'샘플 이미지는 기본값으로 저장할 수 없어요. 생성한 이미지로 바꾼 뒤 다시 시도해 주세요.',
				}
			}
			next.backgroundImage = value.backgroundImage
			next.generatedImageId = value.assetRef.id
			// 새 이미지에 옛 위치·크기가 남으면 엉뚱하게 잘린다 — 세션 값이 없으면 지운다.
			next.imageTransform = value.imageTransform
		}
		if (next.imageTransform === undefined) delete next.imageTransform
		if (Object.keys(next).length > 0) overrides[nodeId] = next
	}
	return { overrides }
}
