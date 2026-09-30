import type { TypeHierarchyWidget as TypeHierarchyWidgetRow } from '@/payload-types'
import type { LanguageKey } from '../../../../displays/dynamics/brand-typeface'
import { TypeHierarchyView } from './view'

// 위젯(서버): 인스턴스가 고른 언어를 확정해 뷰에 넘긴다. 조회할 컬렉션이 없어 하는 일이 이것뿐이다
// — 규정 표(행간·크기·예시 문구)는 brand-typeface.ts가 소유하고 뷰가 직접 읽는다.
//
// 🔴 payload-types에 아직 이 위젯 타입이 없어 props 타입을 여기서 선언한다(등록은 상위가 한다).
export function TypeHierarchyWidget({ language }: { language?: LanguageKey | null }) {
	// 갤러리는 props 없이 렌더하므로 기본값이 있어야 화면이 비지 않는다.
	const resolved = language ?? 'ko'

	return <TypeHierarchyView language={resolved} />
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function TypeHierarchyDisplay({ display }: { display: TypeHierarchyWidgetRow }) {
	return <TypeHierarchyWidget language={display.language} />
}
