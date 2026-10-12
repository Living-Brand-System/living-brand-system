import { Parser } from 'htmlparser2'
import type { TemplateNodeConfigMap } from '@/types/template'

/**
 * Figma에서 가져온 텍스트와 CI(브랜드 로고로 인식된 레이어)는 「편집 가능」으로 시작한다.
 * 이미 사용 상태를 정한 레이어는 다시 가져와도 그대로 둔다 — admin이 고른 값이 이긴다.
 * 순수 함수 — admin 가져오기 필드가 새 base HTML과 남은 설정으로 부른다.
 */
export function applyImportedLayerDefaults(
	html: string,
	nodeConfigs: TemplateNodeConfigMap,
): TemplateNodeConfigMap {
	const next: TemplateNodeConfigMap = { ...nodeConfigs }
	const parser = new Parser(
		{
			onopentag(tagName, attributes) {
				const nodeId = attributes['data-node-id']
				if (!nodeId || next[nodeId]?.creator) return
				if (tagName === 'p') {
					// 텍스트 슬롯은 input이 있어야 스튜디오에 선다(collectTemplateSlots).
					next[nodeId] = {
						...next[nodeId],
						creator: { access: 'editable' },
						input: next[nodeId]?.input ?? {},
					}
				} else if (
					tagName === 'img' &&
					attributes['data-asset-collection'] === 'brand-logos'
				) {
					next[nodeId] = { ...next[nodeId], creator: { access: 'editable' } }
				}
			},
		},
		{ lowerCaseAttributeNames: true, lowerCaseTags: true },
	)
	parser.end(html)
	return next
}
