import { z } from 'zod'

/**
 * 챗이 만들어 스튜디오 세션에 얹는 편집 패치 — 「자연어 한 번으로 템플릿을 채운다」의 계약이다.
 *
 * 🔑 **선언형이다.** 연산 목록이 아니라 목표 상태라서 같은 패치를 두 번 얹어도 결과가 같고,
 *    모델이 만들기도 쉽다.
 * 🔑 **검증을 여기서 다시 하지 않는다.** 적용은 세션의 기존 setter를 통과하고, 그 setter들이 이미
 *    컨트롤 정의로 값을 검증한다(`acceptsControllerDraftValue`) — 허용 밖 프로파일·없는 슬롯·
 *    계약 밖 프롬프트는 그 자리에서 조용히 무시된다. 규칙을 두 곳에 두면 갈라진다.
 * 🔴 **세션이 전부 막지는 않는다.** 실측으로 확인된 구멍: `background.dimmer`·`dimmerOpacity`는
 *    `updateTemplateBackground`가 컨트롤 정의와 대조하지 않고 통과시킨다. 이미지 슬롯의 readonly는
 *    2026-08-24에 `update`에 가드를 넣어 막았다(그전에는 사이드바 prop이 유일한 집행자였다).
 *    새 축을 열 때 「세션이 검증한다」를 전제로 믿지 말고 그 setter를 직접 읽어라.
 * 🔴 그래서 이 스키마는 **형태만** 본다. 슬롯 id가 실제로 있는지, 그 슬롯이 편집 가능한지는
 *    보지 않는다 — 그건 세션이 소유한 판단이다.
 *
 * 🔴 `transform`은 담지 않는다. 세션이 그 값을 **검증 없이 통과**시키므로(`updateTemplateImageSlot`)
 *    여기에 열면 슬롯의 `transform.limits`를 넘는 값이 그대로 들어간다. 열려면 그 setter가 먼저
 *    limits를 물어야 한다.
 */

/** 이미지 슬롯 하나에 얹을 값. 🔑 `profileId`가 바뀌면 세션이 프롬프트·색 기본값을 갈아 끼운다. */
export const templateImageSlotPatchSchema = z.object({
	profileId: z.number().int().positive().optional(),
	prompt: z.string().max(2000).optional(),
	imageMode: z.enum(['preset', 'generate']).optional(),
	/** 프로파일이 여는 색 조정 등 — 키는 컨트롤 id다. */
	featureValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
})

export const templateBackgroundPatchSchema = z.object({
	type: z.enum(['color', 'image', 'graphic']).optional(),
	/** `null`은 저작 배경으로 되돌린다. */
	color: z.string().nullable().optional(),
	imageMode: z.enum(['preset', 'generate']).optional(),
	profileId: z.number().int().positive().optional(),
	prompt: z.string().max(2000).optional(),
	featureValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
	graphicConfigId: z.string().max(120).optional(),
	graphicValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
	dimmer: z.boolean().optional(),
	dimmerOpacity: z.number().min(0).max(1).optional(),
})

export const templateSessionPatchSchema = z.object({
	/** 텍스트 슬롯의 값. 키는 슬롯 id(= `data-node-id`)다. */
	text: z.record(z.string(), z.string().max(2000)).optional(),
	/** 텍스트 전역 색. `null`은 저작 색으로 되돌린다. */
	textColor: z.string().nullable().optional(),
	/** 벡터(로고) 슬롯의 색. */
	vectorColor: z.record(z.string(), z.string()).optional(),
	/** 레이어 표시 여부. 🔴 `visibility.allowToggle`이 아닌 슬롯은 세션이 거부한다. */
	visibility: z.record(z.string(), z.boolean()).optional(),
	images: z.record(z.string(), templateImageSlotPatchSchema).optional(),
	background: templateBackgroundPatchSchema.optional(),
})

export type TemplateSessionPatch = z.infer<typeof templateSessionPatchSchema>
export type TemplateImageSlotPatchInput = z.infer<typeof templateImageSlotPatchSchema>
export type TemplateBackgroundPatchInput = z.infer<typeof templateBackgroundPatchSchema>

/** 패치가 아무것도 담지 않았는지 — 빈 패치로 세션을 건드리지 않는다. */
export function isEmptyTemplateSessionPatch(patch: TemplateSessionPatch): boolean {
	return Object.values(patch).every(
		(value) =>
			value === undefined ||
			(value !== null && typeof value === 'object' && Object.keys(value).length === 0),
	)
}
