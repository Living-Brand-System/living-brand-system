import type { TemplateStudioValue } from '@/features/template-customization/contexts/template-studio-context'
import type {
	TemplateBackgroundPatchInput,
	TemplateImageSlotPatchInput,
	TemplateSessionPatch,
} from '@/features/template-customization/domain/template-session-patch'

/** 패치를 얹는 데 필요한 세션 쓰기 면만. 🔑 좁혀 받으면 테스트가 컨텍스트 전체를 만들지 않는다. */
export type TemplateSessionWriters = Pick<
	TemplateStudioValue,
	'text' | 'images' | 'vectors' | 'layers' | 'background'
>

/**
 * 챗이 만든 패치를 스튜디오 세션에 얹는다.
 *
 * 🔑 **검증하지 않는다.** 값은 세션의 기존 setter를 통과하고 그 setter들이 컨트롤 정의로 검증한다 —
 *    readonly 슬롯·허용 밖 프로파일·범위 밖 수치·없는 슬롯은 그 자리에서 무시된다. 규칙의 소유자를
 *    한 곳으로 유지하려고 여기서 다시 보지 않는다.
 *
 * 🔴 **순서가 로직이다.** 이 함수가 존재하는 이유의 절반이 순서다.
 *    - `selectProfile`이 `prompt`보다 먼저다 — 프롬프트는 **현재 프로파일의 계약**으로 검증되므로
 *      순서를 뒤집으면 새 프로파일에 맞는 문장이 옛 계약에 걸려 조용히 버려진다. 프로파일 교체는
 *      프롬프트·색 기본값도 갈아 끼우므로 뒤에 오는 값이 그 위에 얹혀야 한다.
 *    - 배경도 같다: `selectType` → `selectImageProfile` → `prompt`, `selectGraphicConfig` →
 *      `graphicValues`.
 *
 * 🔑 같은 tick에 setter를 여러 번 불러도 된다 — 전부 함수형 갱신이라 뒤의 호출이 앞의 결과를 본다.
 *
 * ponytail: 적용 결과를 되돌려 주지 않는다. setter가 값을 버릴 때 조용하므로 「무엇이 남았나」는
 *   여기서 알 수 없고, 답은 화면(캔버스)이 이미 보여 준다. 리포트가 필요해지면 세션 쪽에 거절을
 *   알리는 통로를 먼저 뚫어야 한다.
 */
export function applyTemplateSessionPatch(
	session: TemplateSessionWriters,
	patch: TemplateSessionPatch,
): void {
	for (const [slotId, value] of Object.entries(patch.text ?? {})) {
		session.text.setValue(slotId, value)
	}
	if (patch.textColor !== undefined) session.text.setColor(patch.textColor)

	for (const [slotId, color] of Object.entries(patch.vectorColor ?? {})) {
		session.vectors.setColor(slotId, color)
	}
	for (const [slotId, visible] of Object.entries(patch.visibility ?? {})) {
		session.layers.setVisible(slotId, visible)
	}
	for (const [slotId, slotPatch] of Object.entries(patch.images ?? {})) {
		applyImageSlot(session, slotId, slotPatch)
	}
	if (patch.background) applyBackground(session, patch.background)
}

function applyImageSlot(
	session: TemplateSessionWriters,
	slotId: string,
	patch: TemplateImageSlotPatchInput,
): void {
	// 🔴 프로파일이 먼저다 — 뒤의 prompt·featureValues가 새 계약으로 검증되어야 한다.
	if (patch.profileId !== undefined) session.images.selectProfile(slotId, patch.profileId)
	const rest = {
		...(patch.imageMode === undefined ? {} : { imageMode: patch.imageMode }),
		...(patch.prompt === undefined ? {} : { prompt: patch.prompt }),
	}
	if (Object.keys(rest).length > 0) session.images.update(slotId, rest)
	for (const [controlId, value] of Object.entries(patch.featureValues ?? {})) {
		session.images.updateFeature(slotId, controlId, value)
	}
}

function applyBackground(
	session: TemplateSessionWriters,
	patch: TemplateBackgroundPatchInput,
): void {
	// 🔴 형식(type)이 먼저다 — 뒤의 값들이 그 형식에서만 뜻을 갖는다.
	if (patch.type !== undefined) session.background.selectType(patch.type)
	if (patch.color !== undefined) session.background.setColor(patch.color)
	if (patch.profileId !== undefined) session.background.selectImageProfile(patch.profileId)
	if (patch.graphicConfigId !== undefined) {
		session.background.selectGraphicConfig(patch.graphicConfigId)
	}
	const rest = {
		...(patch.imageMode === undefined ? {} : { imageMode: patch.imageMode }),
		...(patch.prompt === undefined ? {} : { prompt: patch.prompt }),
		...(patch.dimmer === undefined ? {} : { dimmer: patch.dimmer }),
		...(patch.dimmerOpacity === undefined ? {} : { dimmerOpacity: patch.dimmerOpacity }),
	}
	if (Object.keys(rest).length > 0) session.background.update(rest)
	for (const [controlId, value] of Object.entries(patch.featureValues ?? {})) {
		session.background.updateFeature(controlId, value)
	}
	for (const [controlId, value] of Object.entries(patch.graphicValues ?? {})) {
		session.background.updateGraphic(controlId, value)
	}
}
