/**
 * 끌어다 놓은 것에서 첨부할 파일 하나를 꺼낸다 — 바탕화면 파일과 **앱 안의 이미지**를 같은 길로 모은다.
 *
 * 앱 안의 `<img>`를 끌면 브라우저는 파일이 아니라 **주소**를 준다(`text/uri-list`). 그래서
 * 파일이 없으면 주소를 읽어 받아 온 뒤 File로 만든다.
 *
 * 🔴 **같은 출처만 받는다.** 드롭에 실린 주소는 사용자가 아니라 끌어온 페이지가 정한 것이므로,
 *    남의 주소를 그대로 받아 오면 사용자의 브라우저가 우리가 모르는 곳을 대신 호출하게 된다.
 * 🔴 형식·크기 검증은 여기서 하지 않는다 — `attachReference` 한 곳이 소유한다. 두 곳에서 하면
 *    파일 선택으로는 거절되는 것이 드롭으로는 통과하는 구멍이 생긴다.
 */
export function readDroppedImageFile(dataTransfer: DataTransfer): Promise<File | null> {
	// 🔴 DataTransfer는 이벤트가 끝나면 비워진다 — await 앞에서 전부 읽는다.
	const file = dataTransfer.files[0]
	if (file) return Promise.resolve(file)

	const url = firstUrl(
		dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain'),
	)
	return url && isSameDocumentUrl(url) ? fetchAsFile(url) : Promise.resolve(null)
}

/** 드롭에 실린 주소·설명이 여러 줄일 수 있다. `#`로 시작하는 줄은 uri-list 규격의 주석이다. */
function firstUrl(raw: string): string | null {
	return (
		raw
			.split(/\r?\n/)
			.find((line) => line.trim() && !line.startsWith('#'))
			?.trim() ?? null
	)
}

function isSameDocumentUrl(url: string): boolean {
	// data:·blob:은 네트워크를 타지 않는다 — 이 문서가 이미 들고 있는 바이트다.
	if (url.startsWith('data:') || url.startsWith('blob:')) return true
	try {
		return new URL(url, window.location.href).origin === window.location.origin
	} catch {
		return false
	}
}

async function fetchAsFile(url: string): Promise<File | null> {
	try {
		const response = await fetch(url)
		if (!response.ok) return null
		const blob = await response.blob()
		return new File([blob], fileNameOf(url), { type: blob.type })
	} catch {
		// 받아 오지 못하면 첨부가 없던 일이 된다 — 화면은 원래 상태 그대로다.
		return null
	}
}

function fileNameOf(url: string): string {
	try {
		const name = new URL(url, window.location.href).pathname.split('/').pop()
		return name || 'dropped-image'
	} catch {
		return 'dropped-image'
	}
}
