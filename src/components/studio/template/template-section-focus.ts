'use client'

import type { TemplateFocusTarget } from '@/features/template-customization/contexts/template-studio-context'
import type { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

type TemplateFocus = ReturnType<typeof useTemplateStudio>['focus']

/**
 * 컨트롤러의 섹션·행이 「지금 만지는 자리」를 캔버스에 알리는 배선 — **모든 레이어가 같은 것을 쓴다.**
 *
 * 🔴 배경 패널이 자기 사본을 갖고 있었다. 그러면 한쪽만 고친 규칙이 다른 레이어에서 조용히
 *    옛날대로 돈다 — 실제로 포커스가 풀리는 조건이 둘로 갈려 있었다(2026-09-30).
 * 🔴 **포커스를 스스로 풀지 않는다**(사용자 지시, 2026-09-30). 전에는 입력칸이 blur되면 곧바로
 *    비웠는데, 다음 대상을 고르는 클릭은 mousedown(blur)과 click 사이에 한 프레임을 둔다 —
 *    그 프레임 동안 활성 섹션이 없어 회색 띠가 꺼졌다 켜지면서 패널이 깜빡였다. 다음 대상이
 *    **덮어쓸 때까지 그대로 둔다**: 같은 글자를 여러 번 눌러도, 다른 글자로 옮겨도 교체만 일어난다.
 * 🔑 판에서도 빈 곳이 없다(어디를 눌러도 배경이 잡힌다) — 「아무것도 안 만지는 상태」로 돌아갈
 *    입구 자체가 없으므로 푸는 코드가 필요 없다.
 */
export function sectionProps(focus: TemplateFocus, target: TemplateFocusTarget) {
	return {
		active: focus.target?.sectionId === target.sectionId,
		// 🔑 `onActivate`를 주는 것 자체가 「chevron만 접기 트리거」 모드를 켠다(`Controller.Group`의 계약).
		onActivate: () => focus.set(target),
		...rowFocusProps(focus, target),
	}
}

/**
 * 섹션 **안의 한 행**용 배선. 🔴 행은 `Controller.Group`이 아니라 맨 `div`이므로 `active`·
 * `onActivate`를 주면 그대로 DOM 속성이 되어 React가 경고한다(2026-08-24 실측). 포커스만 준다.
 * 🔑 그룹과 그 안의 행이 같은 배선을 겹쳐 달아도 된다 — capture는 조상→대상 순이라 행의 좁은
 *    대상이 그룹의 넓은 대상을 덮어쓴다(Text 섹션이 그 구조다).
 */
export function rowFocusProps(focus: TemplateFocus, target: TemplateFocusTarget) {
	return { onFocusCapture: () => focus.set(target) }
}

/** 하위 섹션(Profile Settings·Transform)은 면을 두 겹 칠하지 않는다 — 규칙만 물려받는다. */
export function subsectionProps(focus: TemplateFocus, target: TemplateFocusTarget) {
	return { onActivate: () => focus.set(target) }
}
