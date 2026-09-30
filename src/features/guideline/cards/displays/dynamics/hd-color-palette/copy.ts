// 컬러 팔레트 스와치 공통 클립보드 헬퍼. Clipboard API → 레거시 execCommand 폴백.
// 하나라도 성공하면 true. 프리뷰 iframe은 clipboard-write 권한이 없어 둘 다 막힐 수 있다.
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch {
		// 폴백으로 진행
	}
	try {
		const ta = document.createElement('textarea')
		ta.value = text
		ta.style.position = 'fixed'
		ta.style.opacity = '0'
		document.body.appendChild(ta)
		ta.select()
		const ok = document.execCommand('copy')
		document.body.removeChild(ta)
		return ok
	} catch {
		return false
	}
}
