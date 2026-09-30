import type { TypeLanguageWidget as TypeLanguageWidgetRow } from '@/payload-types'
import type { LanguageKey } from '../../../../displays/dynamics/brand-typeface'
import { TypeLanguageView } from './view'

// 위젯(서버): 저장값을 정리해 뷰에 넘기기만 한다. 표본과 행간 규정은 brand-typeface가 소유하므로
// 조회할 관계도, 계산할 URL도 없다.
//
// props 타입을 여기서 직접 선언한다 — payload-types.ts는 등록 뒤에야 이 위젯을 갖는다.
export function TypeLanguageWidget({
	initialLanguage,
	layout,
}: {
	initialLanguage?: LanguageKey | null
	layout?: 'single' | 'compare' | null
} = {}) {
	// 갤러리는 props 없이 렌더한다. 기본값은 스키마와 같은 국문·전환이다.
	const resolved = initialLanguage ?? 'ko'

	return <TypeLanguageView initialLanguage={resolved} layout={layout ?? 'single'} />
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function TypeLanguageDisplay({ display }: { display: TypeLanguageWidgetRow }) {
	return <TypeLanguageWidget initialLanguage={display.initialLanguage} layout={display.layout} />
}
