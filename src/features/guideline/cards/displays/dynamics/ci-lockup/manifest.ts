import type { GuidelineControllerManifest } from '@/features/guideline/domain/contract/controller'
import type {
	ControllerControlDefinition,
	ControllerControlRestriction,
} from '@/modules/studio-controller/controller-definition'
import {
	branchLabel,
	CLEAR_SPACE_MODE_LABEL,
	CLEAR_SPACE_MODES,
	COLOR_TYPE_LABEL,
	COLOR_TYPES,
	lockupOptions,
	MONO_COLORS,
	OVERSEAS_BRANCHES,
	SUBSIDIARIES,
	tierFor,
} from './rules'

/*
 * CI 락업이 무엇을 조절할 수 있는지 선언한다. **그리지 않는다** — 그리는 일은 도메인 무지
 * 렌더러(알약)가 하고, 위젯은 Canvas만 남는다(`docs/11` §4.1).
 *
 * 🔴 react·에셋을 import하지 않는다 — `schema.ts`가 이 파일을 읽고 `payload.config`는 Node에서
 *    로드된다. `rules.ts`도 같은 이유로 순수 모듈이다(그 파일 머리 주석).
 * 🔑 선택지는 `rules.ts`에서 파생한다. 계열사가 늘면 매니페스트가 저절로 따라오고, 라벨이 두 곳으로
 *    갈라지지 않는다.
 * 🔴 `id`는 위젯이 값을 집는 키다(`controllerString(values, 'form', …)`). 바꾸면 화면이 조용히
 *    기본값으로 돌아간다 — 매니페스트와 위젯이 id로 묶인 것이 현재 계약의 천장이다.
 */

/**
 * 심볼 높이(px). 🔑 락업의 **모든 치수가 이 값의 배수**라 이 하나가 판형을 정한다.
 * 🔴 하한 60·상한 240은 **판이 읽히는 범위**일 뿐이고 도판이 그 안에서 항상 맞는다는 뜻이 아니다.
 *    도판 라벨은 고정 크기 글자라 H를 따라오지 않아 좁은 트랙에서 겹치고(가장 넓은 해외지사
 *    가로형A는 11.6H라 H≥76에서 이미 판을 넘어 가로 스크롤에 든다), 넘치면 캔버스가 스크롤된다.
 *    그 한계는 `docs/11` §7에 결함으로 적어 두었다.
 * 🔴 규정 최소 크기(디지털 16px)는 **사용 하한**이고 설명 판의 하한이 아니다.
 *
 * 🔴 **알약에 기본으로 싣지 않는다**(사용자 지정 2026-08-20). H는 독자가 고를 것이 아니라 저작자가
 *    admin에서 정하는 값이고, 쓰임은 「나란히 놓인 락업들의 비율 정리」다. 축 자체는 남겨 두므로
 *    필요한 자리에서는 `heightControl`로 열 수 있다(`schema.ts`).
 */
export const HEIGHT = {
	id: 'h',
	kind: 'range',
	label: 'H',
	defaultValue: 100,
	min: 60,
	max: 240,
	step: 10,
	display: { unit: 'px' },
} as const satisfies ControllerControlDefinition

/** 🔑 꼴은 계층에 따라 실제로 열리는 것이 다르다(본사는 `horizontal`, 계열사는 A/B). 매니페스트는
 *  정적이므로 **합집합**을 싣고, 그 계층에 없는 값이 골라지면 렌더가 첫 항목으로 떨어뜨린다
 *  (`rules.ts`의 `lockupOptions`). 알약에서 계층별로 좁히려면 admin이 `optionValues`로 줄인다. */
export const FORM = {
	id: 'form',
	kind: 'select',
	label: '꼴',
	defaultValue: 'horizontal',
	// 🔑 꼴은 정본이 **세트로** 제시하는 축이라 몇 가지인지가 곧 정보다 — 드롭다운에 접어 두지 않는다.
	//    계층이 목록을 좁히므로(`ciLockupRestrictions`) 알약에 실제로 뜨는 것은 2~3개다.
	variant: 'segmented',
	options: [
		{ value: 'horizontal', label: '가로형' },
		{ value: 'horizontalA', label: '가로형A' },
		{ value: 'horizontalB', label: '가로형B' },
		{ value: 'vertical', label: '세로형' },
	],
} as const satisfies ControllerControlDefinition

export const LANGUAGE = {
	id: 'language',
	kind: 'select',
	label: '언어',
	defaultValue: 'ko',
	options: [
		{ value: 'ko', label: '국문' },
		{ value: 'en', label: '영문' },
		{ value: 'hd', label: 'HD' },
	],
} as const satisfies ControllerControlDefinition

/** 🔑 「본사」는 고르는 항목이 아니라 아무것도 켜지 않은 상태다 — 켜기 두 개가 계층을 만든다. */
export const SUBSIDIARY_ON = {
	id: 'subsidiaryOn',
	kind: 'toggle',
	label: '자회사',
	defaultValue: false,
} as const satisfies ControllerControlDefinition

export const SUBSIDIARY = {
	id: 'subsidiary',
	kind: 'select',
	label: '자회사명',
	defaultValue: SUBSIDIARIES[0].ko,
	options: SUBSIDIARIES.map((sub) => ({ value: sub.ko, label: `HD${sub.ko}` })),
} as const satisfies ControllerControlDefinition

export const BRANCH_ON = {
	id: 'branchOn',
	kind: 'toggle',
	label: '해외지사',
	defaultValue: false,
} as const satisfies ControllerControlDefinition

export const BRANCH = {
	id: 'branch',
	kind: 'select',
	label: '지사명',
	defaultValue: branchLabel(OVERSEAS_BRANCHES[0]),
	options: OVERSEAS_BRANCHES.map((branch) => ({
		value: branchLabel(branch),
		label: branchLabel(branch),
	})),
} as const satisfies ControllerControlDefinition

export const COLOR_TYPE = {
	id: 'colorType',
	kind: 'select',
	label: '색상 표현',
	defaultValue: COLOR_TYPES[0],
	options: COLOR_TYPES.map((type) => ({ value: type, label: COLOR_TYPE_LABEL[type] })),
} as const satisfies ControllerControlDefinition

/** 🔴 색을 `color` kind로 두지 않는다 — 단색 색상은 hex가 아니라 **브랜드 색 이름**이고, 값은
 *  `brand-colors`에서 이름으로 찾는다. hex를 값으로 받으면 그 출처가 끊긴다. */
export const MONO = {
	id: 'mono',
	kind: 'select',
	label: '단색 색상',
	defaultValue: MONO_COLORS[0],
	options: MONO_COLORS.map((color) => ({ value: color, label: color })),
} as const satisfies ControllerControlDefinition

export const CLEAR_SPACE = {
	id: 'clearSpace',
	kind: 'select',
	label: '클리어스페이스',
	defaultValue: CLEAR_SPACE_MODES[0],
	options: CLEAR_SPACE_MODES.map((mode) => ({
		value: mode,
		label: CLEAR_SPACE_MODE_LABEL[mode],
	})),
} as const satisfies ControllerControlDefinition

/**
 * 치수 도판을 이 판이 가질 수 있는가.
 *
 * 🔴 **알약에 싣지 않는다**(사용자 지정 2026-08-20). 켜고 끄는 일은 hover가 소유한다 — 도판은
 *    락업 위에 얹히는 것이 아니라 판을 **갈아치우므로**, 알약 토글로 두면 아무도 누르지 않고
 *    자리만 먹는다. 여기 값은 「hover하면 치수를 낼 판인가」라는 **저작 결정**이다.
 * 🔑 클리어스페이스는 반대다 — 락업 위에 얹히고 모드가 셋이라(없음/기본/예외) 알약에 남는다.
 *    여백과 간격은 정본이 별 규정으로 갈라 놓았고 컨트롤로서의 성격도 그래서 반대다.
 */
export const MEASURED = {
	id: 'measured',
	kind: 'toggle',
	label: '치수',
	defaultValue: false,
} as const satisfies ControllerControlDefinition

/** 알약의 구분선이 곧 그룹 경계다 — 계층 ┃ 형태 ┃ 색 ┃ 표시. */
export const CI_LOCKUP_MANIFEST = {
	id: 'ci-lockup',
	groups: [
		{ id: 'tier', title: '계층', controls: [SUBSIDIARY_ON, SUBSIDIARY, BRANCH_ON, BRANCH] },
		{ id: 'shape', title: '형태', controls: [FORM, LANGUAGE] },
		{ id: 'color', title: '색', controls: [COLOR_TYPE, MONO] },
		{ id: 'display', title: '표시', controls: [CLEAR_SPACE, MEASURED] },
		{ id: 'size', title: '크기', controls: [HEIGHT] },
	],
} as const satisfies GuidelineControllerManifest

/* 🔑 허용 값 목록은 **매니페스트에서 파생한다** — Canvas가 알약이 줄 수 있는 값만 받아들이도록,
   같은 목록을 두 곳에 적지 않는다(`controllerString`의 세 번째 인자). */
export const FORM_VALUES = FORM.options.map((option) => option.value)
export const LANGUAGE_VALUES = LANGUAGE.options.map((option) => option.value)
export const SUBSIDIARY_VALUES = SUBSIDIARY.options.map((option) => option.value)
export const BRANCH_VALUES = BRANCH.options.map((option) => option.value)

/**
 * 축 전체의 순서 있는 목록. 🔑 **schema·registry·알약이 같은 목록을 읽는다** — 축이 늘면
 * admin 필드와 제한 변환이 저절로 따라온다. 축마다 필요한 것은 둘이다(사용자 지정 2026-08-19):
 * ① 페이지를 처음 열었을 때의 상태 ② 그 축을 알약에 낼지.
 *
 * 🔴 **그룹과 어긋나면 저작된 모든 페이지가 렌더 중 죽는다** — 제한 변환이 없는 축을 가리키면
 *    `applyControllerRestrictions`가 던진다. 파생시키면 그 불변식이 사라지지만 리터럴 타입도 함께
 *    사라져(`schema.ts`가 `kind`로 필드를 가른다) 목록은 손으로 두고 **테스트가 일치를 지킨다**
 *    (`registry.test.ts`의 「축 목록과 그룹이 어긋나지 않는다」).
 */
export const CI_LOCKUP_CONTROLS = [
	HEIGHT,
	SUBSIDIARY_ON,
	SUBSIDIARY,
	BRANCH_ON,
	BRANCH,
	FORM,
	LANGUAGE,
	COLOR_TYPE,
	MONO,
	CLEAR_SPACE,
	MEASURED,
] as const

/**
 * 알약에서 뺄 축 — admin이 고른 목록에 **기본 비노출 축**을 더한다.
 *
 * 🔑 제한 변환(`ciLockupRestrictions`)과 Canvas(`view.tsx`의 `pick`)가 **같은 답**을 봐야 한다.
 *    갈라지면 알약에 없는 축을 Canvas가 알약 값으로 읽어 admin 값이 조용히 버려진다 — 이 위젯이
 *    이미 한 번 그 모양으로 깨졌다(dispatch가 props를 안 넘기던 것).
 */
export function ciLockupHiddenAxes(fields: {
	hiddenControls?: readonly (string | null)[] | null
	heightControl?: boolean | null
}): Set<string> {
	const hidden = new Set((fields.hiddenControls ?? []).filter((id): id is string => Boolean(id)))
	if (fields.heightControl !== true) hidden.add(HEIGHT.id)
	// 🔴 치수는 hover가 소유하므로 알약에 낼 길이 없다 — H와 달리 여는 스위치도 두지 않는다.
	hidden.add(MEASURED.id)
	return hidden
}

/** admin이 알약에서 뺄 수 있는 컨트롤 목록. */
export const CI_LOCKUP_CONTROL_IDS = CI_LOCKUP_CONTROLS.map((control) => ({
	value: control.id,
	label: control.label,
}))

/** 저장값을 위젯의 허용 범위와 초기값으로 접는다. */
export function ciLockupRestrictions(
	fields: Record<string, unknown>,
): ControllerControlRestriction[] {
	// 🔑 admin이 고른 목록 + 기본 비노출 축(H). 목록은 매니페스트가 소유한다.
	const hidden = ciLockupHiddenAxes({
		hiddenControls: Array.isArray(fields.hiddenControls) ? fields.hiddenControls : null,
		heightControl: fields.heightControl === true,
	})
	// 🔑 계층이 정하는 선택지로 **좁힌다.** 매니페스트는 정적이라 꼴·언어의 합집합을 싣는데, 본사에는
	//    가로형A·B가 없고 자회사에는 HD형이 없다. 좁히지 않으면 알약에 없는 조합이 떠서 고르면
	//    렌더가 조용히 첫 항목으로 떨어진다 — 사용자에게는 「눌렀는데 아무 일도 안 일어난다」다.
	const tier = tierFor(fields.subsidiaryOn === true, fields.branchOn === true)
	const allowed = lockupOptions(tier)
	const narrowing: Record<string, readonly string[]> = {
		form: allowed.forms.map((form) => form.key),
		language: allowed.languages.map((language) => language.key),
	}

	return CI_LOCKUP_CONTROLS.map((control) => {
		const value = fields[control.id]
		const options = narrowing[control.id]
		return {
			controlId: control.id,
			...(options
				? { optionValues: options, defaultValue: withinOptions(control, value, options) }
				: {}),
			...(!options && usable(control, value) ? { defaultValue: value } : {}),
			...(hidden.has(control.id) ? { availability: 'readonly' as const } : {}),
		}
	})
}

/**
 * 좁힌 목록 안의 초기값을 고른다 — admin 값 → 매니페스트 기본값 → 목록 첫 항목.
 *
 * 🔴 목록을 좁히면 초기값도 그 안이어야 한다. 아니면 `applyControllerRestrictions`가
 *    「options에 포함되어야 합니다」로 던져 **페이지가 죽는다**. 매니페스트 기본값이 합집합 기준이라
 *    (본사 `horizontal`) 계층을 올리면 그것부터 목록 밖으로 밀려난다 — 테스트가 그것을 잡았다.
 */
function withinOptions(
	control: (typeof CI_LOCKUP_CONTROLS)[number],
	value: unknown,
	options: readonly string[],
): string {
	if (typeof value === 'string' && options.includes(value)) return value
	const fallback = control.defaultValue
	if (typeof fallback === 'string' && options.includes(fallback)) return fallback
	return options[0]
}

/**
 * admin 값을 초기값으로 쓸 수 있는가.
 *
 * 🔴 **`select` 값이 options에 없으면 버린다.** 그러지 않으면 `applyControllerRestrictions`가 렌더
 *    중에 던져 **페이지가 죽는다**(`controller-definition.ts`: `defaultValue: options에 포함되어야
 *    합니다`). 선택지는 `rules.ts`에서 파생하므로 계열사·지사 목록이 바뀌면 저장된 값이 고아가 되고,
 *    그때 페이지가 죽는 것보다 매니페스트 기본값으로 그려지는 것이 낫다 — 화면은 서고 admin이
 *    다시 고르면 된다.
 */
function usable(
	control: (typeof CI_LOCKUP_CONTROLS)[number],
	value: unknown,
): value is string | number | boolean {
	if (control.kind === 'toggle') return typeof value === 'boolean'
	// 🔴 범위 밖 숫자도 `applyControllerRestrictions`가 던진다 — select와 같은 이유로 버린다.
	if (control.kind === 'range')
		return typeof value === 'number' && value >= control.min && value <= control.max
	if (control.kind === 'select')
		return typeof value === 'string' && control.options.some((o) => o.value === value)
	return false
}
