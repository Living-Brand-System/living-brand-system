/**
 * 킷 내부 공용 클래스 — 파츠만 소비한다. 소비자는 Controller.Select/Input/Textarea를
 * 쓰므로 이 상수를 직접 가져다 쓸 일이 없다(index에서 내보내지 않는다).
 */

/**
 * 행 안에 투명하게 앉는 셀렉트 트리거 — 포커스 링은 행이 소유한다.
 *
 * 행 전체를 덮는다(dialkit `.dialkit-select-trigger`가 행 전체 버튼인 것과 같다): 행 어디를 눌러도
 * 열리고, radix가 재는 `--radix-select-trigger-width`가 행 폭이 되어 드롭다운이 행과 같은 폭으로 뜬다.
 * 라벨은 이 버튼 아래에 남아 `htmlFor`로 이름을 준다.
 *
 * 🔴 `inset-0`은 컨테이닝 블록의 **패딩 박스**에 맞고, 그 값이 이미 행 폭이다(측정: 행 clientWidth
 * = rect.width). 여기에 음수 마진을 더하면 행보다 넓어진다 — 넓히지 말 것. 트리거 자신의
 * `px-(--controller-row-px)`는 값·셰브론을 행 패딩과 같은 위치에 두기 위한 것뿐이다.
 *
 * 트리거가 행 전체이므로 hover·열림 배경도 행 전체에 깔린다(dialkit `.dialkit-select-trigger:hover`,
 * `[data-open="true"]` 대응) — 열려 있는 동안 어느 행의 목록인지가 행 자체로 남는다. base의
 * `transition-colors`가 그 전환을 갖는다. 다크에서도 같은 겹침이라 `dark:` 쌍으로 되돌린다
 * (base의 `dark:hover:bg-input/50`이 투명 배경을 덮어쓰기 때문).
 *
 * 🔴 `data-[size=sm]:h-auto`가 필요하다. 맨 `h-auto`는 base의 `data-[size=sm]:h-7`을 못 이긴다 —
 * tailwind-merge가 variant 유무를 다른 그룹으로 보아 둘 다 남기고, 속성 선택자 쪽이 특이도로 이겨
 * 높이가 28px에 잘린다. 그러면 트리거 하단이 행 하단보다 8px 위라 드롭다운이 행을 침범한다.
 */
export const ROW_SELECT_TRIGGER =
	'absolute inset-0 h-auto w-auto justify-end gap-2 border-transparent bg-transparent px-(--controller-row-px) py-0 text-muted-foreground data-[size=sm]:h-auto hover:bg-foreground/5 focus-visible:ring-0 data-[state=open]:bg-foreground/10 dark:bg-transparent dark:hover:bg-foreground/5 dark:data-[state=open]:bg-foreground/10'

/**
 * 드롭다운 — dialkit `.dialkit-select-dropdown`: 안쪽 4px 패딩, 트리거와 같은 폭.
 * `translate-y-0`으로 ui/select의 popper 오프셋을 끈다 — 간격은 sideOffset 하나만 소유한다(dialkit `gap = 4`).
 *
 * 🔴 Viewport의 `min-w-0`이 필요하다. base의 `data-[position=popper]:min-w-(--radix-select-trigger-width)`가
 * 트리거 폭(=이 컨테이너의 border box)을 최소 폭으로 걸어, 패딩 4px을 뺀 내부 가용 폭을 넘어선다
 * → 항목이 패딩 밖으로 밀려 컨테이너 모서리에 붙는다(측정: 항목 left = content left).
 */
export const ROW_SELECT_CONTENT =
	'w-(--radix-select-trigger-width) p-1 data-[side=bottom]:translate-y-0 data-[side=top]:translate-y-0 [&_[data-radix-select-viewport]]:min-w-0'

/**
 * 옵션 — dialkit `.dialkit-select-option`(`padding: 8px 10px`, `radius: 6px`) 대응.
 * 가로 패딩만 8px인 이유: 컨테이너 패딩 4px과 합쳐 12px이 되어 **행 라벨의 x와 정확히 맞는다**
 * (dialkit은 4+10+border 1 = 15px vs 라벨 12px로 3px 어긋난다 — 여기서는 맞춘다).
 * 선택은 채움으로 드러낸다(`.dialkit-select-option[data-selected=true]`). 체크마크는 색에만 의존하지
 * 않는 두 번째 단서로 남기므로 오른쪽 공간을 비워 둔다.
 */
export const ROW_SELECT_ITEM =
	'rounded-md px-2 py-2 pe-8 text-muted-foreground data-[state=checked]:bg-muted data-[state=checked]:text-foreground'

/**
 * Row/Field 면 위에 앉는 아이콘 버튼 — `ControllerAction`이 소비한다.
 *
 * 🔑 **면 위에서는 색을 바꾸지 않고 겹친다.** ghost 버튼의 기본 hover는 `bg-muted`인데 Row/Field가
 *    이미 `bg-muted`라, 그대로 두면 hover가 같은 색으로 묻혀 아무 일도 안 일어난 것처럼 보인다.
 *    위 `ROW_SELECT_TRIGGER`가 같은 문제를 같은 값(`foreground/5`)으로 이미 풀어놨다 — 겹침 단계를
 *    바꿀 일이 생기면 두 상수를 함께 옮긴다.
 *
 * 🔴 면 상태를 네 개 다 덮어야 한다. ghost는 `hover`·`focus-visible`과 각각의 `dark:` 쌍을 갖고 있어,
 *    hover만 덮으면 키보드 포커스와 다크 모드에서 muted가 도로 올라와 묻힌다.
 */
export const ROW_ACTION =
	'hover:bg-foreground/5 focus-visible:bg-foreground/5 dark:hover:bg-foreground/5 dark:focus-visible:bg-foreground/5'

/** Row/Field 안에 투명하게 앉는 입력 — 포커스 링은 행이 소유한다. */
export const BARE_INPUT =
	'h-auto min-h-0 rounded-none border-0 bg-transparent p-0 focus-visible:ring-0 dark:bg-transparent'
