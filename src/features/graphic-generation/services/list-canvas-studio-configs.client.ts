import type {
	CanvasStudioKind,
	GraphicStudioConfig,
} from '@/features/graphic-generation/domain/graphic-studio-config'

/**
 * 캔버스 프로파일 목록 클라이언트 서비스 — 자산 브라우저가 열릴 때 한 번 호출된다.
 *
 * 🔑 스튜디오가 곧 주소다(`/api/studio/graphic`·`/api/studio/graph`). 둘은 계약이 같고 보는
 *    컬렉션만 다르므로, 함수를 두 벌로 두는 대신 스튜디오를 인자로 받는다.
 * 🔴 이 값은 서버에서 넘어온 config가 이미 갖고 있다 — 서버 컴포넌트는 클라이언트에 **함수를
 *    넘길 수 없으므로**(직렬화 불가) 「어떻게 가져오나」가 아니라 「누구냐」를 넘겨야 한다.
 */
export async function fetchCanvasStudioConfigs(
	studio: CanvasStudioKind,
): Promise<GraphicStudioConfig[]> {
	const response = await fetch(`/api/studio/${studio}`)
	if (!response.ok) throw new Error('프로파일 목록을 불러오지 못했습니다.')
	const data = (await response.json()) as { profiles?: GraphicStudioConfig[] }
	return data.profiles ?? []
}
