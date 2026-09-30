// 하단 Floating Controller("Helper")의 활성 판정 규칙. 컴포넌트와 파일을 가르는 이유는
// `guideline-section-navigation.ts`와 같다 — 순수 로직을 컴포넌트 파일에 두면 Fast Refresh가
// 매 편집마다 전체 리로드를 하고, 테스트가 렌더 트리를 끌고 들어와야 한다.

/** 면적 비교의 흔들림 허용치(px²). 이 안이면 같은 크기로 보고 문서 순서로 가른다. */
const AREA_EPSILON = 1

export type HelperCandidate = { element: Element; visibleArea: number }

/**
 * 활성 블록을 고른다 — **화면을 가장 많이 차지한 것**. 비율이 아니라 면적인 이유는,
 * 비율로 재면 화면에 꽉 찬 큰 판형(비율 0.4)이 구석에 다 보이는 작은 판형(비율 1)에게 진다.
 * 같은 면적이면 문서 순서가 앞선 쪽 — 스크롤 방향과 무관하게 같은 답이 나와야 바가 깜빡이지 않는다.
 */
export function pickActiveRegion(
	candidates: HelperCandidate[],
	selected?: Element | null,
): Element | null {
	// 조작 중인 카드가 보이는 동안에는 다른 카드로 컨트롤을 바꾸지 않는다.
	if (selected && candidates.some((c) => c.element === selected && c.visibleArea > 0))
		return selected
	let best: HelperCandidate | null = null

	for (const candidate of candidates) {
		if (candidate.visibleArea <= 0) continue
		if (!best) {
			best = candidate
			continue
		}
		const diff = candidate.visibleArea - best.visibleArea
		if (diff > AREA_EPSILON) best = candidate
		else if (diff >= -AREA_EPSILON && precedes(candidate.element, best.element))
			best = candidate
	}

	return best?.element ?? null
}

function precedes(a: Element, b: Element): boolean {
	return (b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
}
