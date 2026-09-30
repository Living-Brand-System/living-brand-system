/**
 * 하단 바의 접근성 이름. 바는 portal로 자기 그림에서 떨어지므로 어느 블록의 컨트롤인지는
 * 이 이름이 유일한 단서다.
 *
 * 🔴 `guideline-helper.tsx`(`'use client'`)가 아니라 여기 사는 이유: 서버 컴포넌트인 위젯 갤러리가
 *    이 함수를 **호출**한다. 클라이언트 모듈의 함수는 서버에서 부를 수 없어 라우트가 500이 된다
 *    (2026-08-18 실측 — `/guideline/widgets`가 그렇게 죽었다).
 */
export function helperLabel(label?: string | null) {
	return label ? `${label} 조절` : '레이아웃 조절'
}
