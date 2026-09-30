import { z } from 'zod'
import { IMAGE_PROMPT_MAX_LENGTH } from '@/features/image-generation/domain/image-generation-limits'
import {
	collectTemplateImageSlots,
	collectTemplateSlots,
	type TemplateImageSlot,
	type TemplateSlot,
} from '@/features/template-core/domain/collect-template-slots'
import { projectTemplateRenderModel } from '@/features/template-core/domain/project-template-render-model'
import type { TemplateSessionPatch } from '@/features/template-customization/domain/template-session-patch'
import {
	deriveTemplateStudioConfig,
	type PublishedHtmlTemplate,
	type TemplateStudioConfig,
} from '@/features/template-customization/domain/template-studio-config'
import { AgentConfigurationError } from '@/lib/errors'
import {
	type AgentTemplateDocument,
	findAgentTemplate,
	listAgentTemplates,
} from '../repositories/agent-template.payload.repository'

/**
 * 모델이 채우는 슬롯 값 한 칸.
 *
 * 🔴 **record가 아니라 배열이어야 한다.** `@ai-sdk/provider-utils`의 `asSchema`가 `z.record`의 값
 *    스키마를 통째로 지우고 `{type:'object', propertyNames:{type:'string'}, additionalProperties:false}`
 *    만 모델에 내보낸다(2026-08-24 실측). 그러면 모델은 칸에 무엇을 담아야 하는지(`text`인지
 *    `imagePrompt`인지, 상한이 얼마인지)를 알 수 없다. 배열로 주면 `items.properties`와 `maxLength`가
 *    그대로 전달된다.
 * 🔑 상한은 숫자를 새로 쓰지 않고 `IMAGE_PROMPT_MAX_LENGTH`를 물려받는다 — 하류(프로파일 프롬프트
 *    컨트롤)가 그 값으로 실행을 거절하므로 여기서 더 크게 받으면 「이유 없이 잠긴 생성 버튼」이 된다.
 */
export const templateSlotValueSchema = z.object({
	slotId: z.string().min(1).max(120),
	text: z.string().max(1000).optional(),
	imagePrompt: z.string().max(IMAGE_PROMPT_MAX_LENGTH).optional(),
})

export type TemplateSlotValueInput = z.infer<typeof templateSlotValueSchema>

/**
 * prepareTemplateImage 툴 출력 계약 — 챗 첨부 UI가 이 타입을 그대로 소비한다 (이중 정의 금지).
 * 렌더 페이로드(html)는 toModelOutput으로 모델 컨텍스트에서 제외된다.
 */
export type AgentTemplateImageAttachment = {
	type: 'template-image'
	kind: 'html'
	templateId: number
	/** 「스튜디오에 적용」이 이동할 주소를 만드는 값 — 라우트 세그먼트는 slug뿐이다. */
	slug: string
	name: string
	html: string
	width: number
	height: number
	/** 스튜디오 세션에 그대로 얹을 편집 패치. 🔑 첨부 미리보기도 이 값으로 합성한다(정본 하나). */
	patch: TemplateSessionPatch
	output: TemplateStudioConfig['output']
	controller: TemplateStudioConfig['controller']
}

/**
 * Agent tool의 템플릿 검색 요청을 발행 템플릿 요약 목록으로 변환한다.
 * Payload 템플릿 조회는 agent template repository가 담당한다.
 */
export async function findTemplatesForRequest(user: unknown, query?: string) {
	const templates = await listAgentTemplates(user)
	const normalizedQuery = query?.trim().toLowerCase()

	const summaries = templates
		.map((template) => {
			const slots = getTemplateSlots(template)
			return slots
				? {
						id: template.id,
						name: template.name,
						description: template.description || '',
						// 🔑 모델이 템플릿을 고르는 근거다. 이름만으로는 같은 크기의 두 템플릿을
						//    구별할 수 없고(1920×1080이 둘), 「세로로 긴 것」 같은 요청에 답할 수 없다.
						category: templateCategoryTitle(template),
						size: { width: template.width, height: template.height },
						orientation: templateOrientation(template),
						slots,
					}
				: null
		})
		.filter((template): template is NonNullable<typeof template> => Boolean(template))

	const matches = normalizedQuery
		? summaries.filter((template) =>
				[
					template.name,
					template.description,
					template.category ?? '',
					...template.slots.map((slot) => slot.label),
				]
					.join(' ')
					.toLowerCase()
					.includes(normalizedQuery),
			)
		: summaries

	// ponytail: 단순 부분 문자열 매칭. 0건이면 전체 목록으로 폴백해 LLM이 직접 고르게 한다.
	return (matches.length > 0 ? matches : summaries).slice(0, 10)
}

/**
 * Agent tool이 준 슬롯 값을 검증해 챗 첨부용 템플릿 이미지 데이터로 변환한다.
 * Payload 템플릿 조회는 agent template repository가 담당한다.
 */
export async function prepareTemplateImage(
	user: unknown,
	templateId: number,
	values: readonly TemplateSlotValueInput[],
): Promise<AgentTemplateImageAttachment> {
	const template = await findAgentTemplate(user, templateId)

	if (!template) {
		throw new AgentConfigurationError('Template is not available.')
	}

	const renderModel = projectTemplateRenderModel(template)

	if (!renderModel) throw new AgentConfigurationError('Template is not available.')

	const studioConfig = deriveTemplateStudioConfig({
		kind: 'html',
		id: template.id,
		name: template.name,
		html: renderModel.html,
		nodeConfigs: renderModel.nodeConfigs,
		width: renderModel.width,
		height: renderModel.height,
		templateVersion: template.updatedAt,
		exportPolicy: template.exportPolicy,
		backgroundPolicy: template.backgroundPolicy as PublishedHtmlTemplate['backgroundPolicy'],
	})
	return {
		type: 'template-image' as const,
		kind: 'html' as const,
		templateId: template.id,
		slug: template.slug,
		name: template.name,
		html: renderModel.html,
		width: renderModel.width,
		height: renderModel.height,
		output: studioConfig.output,
		controller: studioConfig.controller,
		patch: toTemplateSessionPatch(
			collectTemplateSlots(renderModel.html, renderModel.nodeConfigs),
			collectTemplateImageSlots(renderModel.html, renderModel.nodeConfigs),
			values,
		),
	}
}

/** 관계 필드는 depth에 따라 id이거나 객체다 — 제목이 있을 때만 싣는다. */
function templateCategoryTitle(template: AgentTemplateDocument): string | undefined {
	const category = template.category
	return typeof category === 'object' && category !== null && 'title' in category
		? ((category as { title?: string }).title ?? undefined)
		: undefined
}

/**
 * 🔑 비율을 기약분수로 주지 않는다 — 630×891 같은 값은 70:99가 되어 사람도 모델도 못 읽는다.
 *    「가로가 긴가 세로가 긴가」가 템플릿 선택에서 실제로 쓰이는 축이고, 정확한 비율이 필요하면
 *    모델이 size로 직접 계산한다.
 */
function templateOrientation(
	template: AgentTemplateDocument,
): 'landscape' | 'portrait' | 'square' | undefined {
	const { width, height } = template
	if (!width || !height) return undefined
	if (width === height) return 'square'
	return width > height ? 'landscape' : 'portrait'
}

/**
 * 모델에게 보일 슬롯 요약.
 *
 * 🔴 **`editable`만 싣는다.** 잠긴 슬롯을 보여 주면 모델이 그것을 채우고, 패치 단계에서 조용히
 *    버려져 챗이 「채웠다」고 거짓 보고한다.
 * 🔑 이미지 슬롯을 텍스트 뒤에 잇는다 — 프로파일·비율은 싣지 않는다. 프로파일은 세션 기본값이
 *    고르고, 모델이 골라야 할 것은 「무엇을 그릴지」뿐이다.
 */
function getTemplateSlots(template: AgentTemplateDocument): AgentSlotSummary[] | null {
	const renderModel = projectTemplateRenderModel(template)
	if (!renderModel) return null
	const { html, nodeConfigs } = renderModel
	const editable = <T extends { policy: { access: string } }>(slot: T) =>
		slot.policy.access === 'editable'
	return [
		...collectTemplateSlots(html, nodeConfigs).filter(editable).map(toTemplateSlotSummary),
		...collectTemplateImageSlots(html, nodeConfigs)
			.filter(editable)
			.map(
				(slot): AgentSlotSummary => ({
					id: slot.nodeId,
					label: slot.name,
					type: 'image' as const,
				}),
			),
	]
}

function toTemplateSlotSummary(slot: TemplateSlot): AgentSlotSummary {
	return {
		id: slot.nodeId,
		label: slot.input.label ?? slot.name,
		type: 'text' as const,
		defaultText: slot.text,
		inputFormat: slot.input.inputFormat ?? 'free',
		maxLength: slot.input.maxLength,
		maxLines: slot.input.maxLines,
		aiInstruction: slot.input.aiInstruction,
	}
}

/** 🔑 `type`으로 갈린다 — 텍스트 슬롯은 `text`를, 이미지 슬롯은 `imagePrompt`를 받는다. */
type AgentSlotSummary =
	| {
			id: string
			label: string
			type: 'text'
			defaultText: string
			inputFormat: 'free' | 'number' | 'email' | 'date'
			maxLength: number | undefined
			maxLines: number | undefined
			// 이 슬롯을 채울 때 항상 지켜야 할 규칙 (예: "영문 이름만"). 모델이 값 작성 시 따른다.
			aiInstruction?: string
	  }
	| { id: string; label: string; type: 'image' }

/**
 * 모델이 준 슬롯 값을 **스튜디오 세션에 얹을 패치**로 바꾼다. 순수 함수 — Payload I/O가 없다.
 *
 * 🔴 **`policy.access`를 본다.** `resolveTemplateLayerPolicy`는 `hidden`만 버리고 `readonly`는
 *    통과시키므로, 제작자가 잠근 슬롯도 슬롯 목록에는 들어 있다. 그것을 걸러내는 코드가 지금까지
 *    **사이드바 컴포넌트의 prop뿐**이었다 — 이 기능은 사이드바를 통째로 우회하므로(그게 목적이다)
 *    여기서 막지 않으면 잠긴 슬롯의 값이 첨부 미리보기와 PNG·TIFF·PDF 내보내기까지 들어간다.
 *    (`docs/07` 점검항목 12: UI에서 통과한 검증을 신뢰하지 않고 서버에서 다시 검증한다.)
 * 🔑 키는 **원시 nodeId**다 — `text:${nodeId}` 접두는 컨트롤러 **control id**의 것이고 패치의 키는
 *    슬롯 id다. 두 키 공간을 섞으면 세션이 슬롯을 못 찾아 값을 조용히 버린다.
 * 🔑 값 자체의 상한은 슬롯 스펙(`maxLength`·`maxLines`)이 정한다 — 모델이 넘겨도 여기서 자른다.
 * 🔴 `profileId`·`imageMode`·`transform`·`featureValues`는 담지 않는다. 프로파일 선택은 세션의
 *    기본값(호환 목록의 첫 번째)이 맡고, transform은 세션이 무검증 통과시키는 축이다.
 */
export function toTemplateSessionPatch(
	slots: readonly TemplateSlot[],
	imageSlots: readonly TemplateImageSlot[],
	values: readonly TemplateSlotValueInput[],
): TemplateSessionPatch {
	const byId = new Map(values.map((value) => [value.slotId, value]))
	const text: Record<string, string> = {}
	const images: Record<string, { prompt: string }> = {}

	for (const slot of slots) {
		if (slot.policy.access !== 'editable') continue
		const raw = byId.get(slot.nodeId)?.text
		if (typeof raw !== 'string') continue
		const clamped = raw.trim().slice(0, slot.input.maxLength ?? raw.length)
		text[slot.nodeId] = slot.input.maxLines
			? clamped.split('\n').slice(0, slot.input.maxLines).join('\n')
			: clamped
	}

	for (const slot of imageSlots) {
		if (slot.policy.access !== 'editable') continue
		const prompt = byId.get(slot.nodeId)?.imagePrompt?.trim().slice(0, IMAGE_PROMPT_MAX_LENGTH)
		if (!prompt) continue
		images[slot.nodeId] = { prompt }
	}

	return {
		...(Object.keys(text).length > 0 ? { text } : {}),
		...(Object.keys(images).length > 0 ? { images } : {}),
	}
}
