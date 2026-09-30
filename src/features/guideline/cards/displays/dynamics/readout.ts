// 위젯이 수치와 설명을 적는 세 가지 줄. 위젯마다 다르게 만들어 한 페이지 안에서 표기가 갈렸다
// (같은 행간 규정을 옆 위젯은 mono로, 이 위젯은 본문체로 적는 식). 계약은 docs/11 §8.
//
// 🔴 크기는 여기 넣지 않는다. 같은 성격이라도 화면에서의 비중이 달라서다 — 굵기 위젯의 현재 값은
//    그 위젯의 주 출력이고, 배율 슬라이더 옆 퍼센트는 보조다. 크기는 docs/09 §6 단계에서 고른다.
// 🔴 마진도 넣지 않는다. 줄 사이 간격은 부모 스택의 gap이 소유한다(docs/09 §7의 세로 리듬 불변식).
//
// 🔴 react·이미지 import 금지(schema가 참조하는 모듈과 같은 폴더다).

/**
 * 규격을 나열하는 줄. `Weight 700 · Size 60px · Leading 130–140%`처럼 규정을 읽어 준다.
 * mono + tabular인 이유는 값이 바뀌어도 자릿수가 흔들리지 않아야 나란히 놓인 판을 비교할 수 있어서다.
 */
export const SPEC_READOUT = 'font-mono text-muted-foreground tabular-nums'

/**
 * 컨트롤이 지금 가리키는 값. 조작하는 동안 계속 바뀌므로 `tabular-nums`가 필수다
 * — 없으면 숫자 폭이 달라져 옆 요소가 흔들린다.
 */
export const CONTROL_VALUE = 'font-body text-foreground tabular-nums'

/** 컨트롤의 이름. 값(`CONTROL_VALUE`)과 짝이고, 캡션과 달리 판 밖 설명이 아니다. */
export const CONTROL_LABEL = 'font-body text-muted-foreground text-xs font-medium'

/**
 * 판 아래에 붙는 보조 설명.
 *
 * 🔴 **새로 쓰지 않는다.** 위젯이 그리는 것은 판(canvas) 하나뿐이고 판 밖 캡션은 카드가 소유한다
 *    (`docs/11` §8 「위젯은 판만 그립니다」). 아직 걷어내지 못한 두 자리를 위해 남아 있고,
 *    `visual-vocabulary.test.ts`의 `CAPTION_DEBT`가 그 목록이 늘어나는 것을 막는다.
 */
export const WIDGET_CAPTION = 'font-body text-muted-foreground text-xs'
