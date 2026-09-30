import config from '@payload-config'
import { getPayload } from 'payload'
import type { BrandColorGroup, LogoOnBgWidget as LogoOnBgWidgetRow } from '@/payload-types'
import { toBrandBackgrounds } from '../../../../displays/dynamics/brand-background'
import { type LogoRef, resolveLogoSet } from '../../../../displays/dynamics/logo-set'
import { LogoOnBackgroundView } from './view'

// 위젯(서버): 배경 그룹의 색과 로고 3종 URL을 뽑아 클라 뷰에 넘긴다. 드래그·판정 표시는 뷰가 맡는다.
// 🔴 로고 사용 규칙은 brand-colors가 소유한다 — 여기서 대비로 유도하지 않고 저장값을 그대로 옮긴다.
type GroupRef = number | BrandColorGroup | null | undefined

export async function LogoOnBackgroundWidget({
	group,
	logo,
	column,
}: {
	group?: GroupRef
	logo?: LogoRef
	column?: 'fullColor' | 'mono' | null
} = {}) {
	const payload = await getPayload({ config })

	// 🔴 group을 그대로 쓰지 않고 id로 다시 조회한다. 페이지 조회가 depth:1이라 group은 populate돼도
	//    그 안의 colors는 id 배열로 남는다(hd-color-palette와 같은 이유).
	const groupId = typeof group === 'object' && group ? group.id : group
	const resolved = groupId != null ? await findGroup(payload, groupId) : await firstGroup(payload)
	if (!resolved) return null

	const bands = toBrandBackgrounds(resolved)
	if (bands.length === 0) return null

	const logos = await resolveLogoSet(payload, logo)
	return <LogoOnBackgroundView bands={bands} logos={logos} column={column ?? 'fullColor'} />
}

/** 삭제된 그룹을 가리키면 null — 위젯 하나가 페이지 전체를 죽이지 않게 한다. */
// (로고 세트 조회는 ../logo-set.ts로 옮겼다 — color-incorrect-usage가 같은 규약을 쓴다.)
async function findGroup(
	payload: Awaited<ReturnType<typeof getPayload>>,
	id: number,
): Promise<BrandColorGroup | null> {
	try {
		return await payload.findByID({ collection: 'brand-color-groups', id, depth: 1 })
	} catch {
		return null
	}
}

/** 갤러리는 props 없이 렌더하므로 아무 그룹이라도 잡아 화면이 비지 않게 한다. */
async function firstGroup(
	payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<BrandColorGroup | null> {
	const { docs } = await payload.find({ collection: 'brand-color-groups', limit: 1, depth: 1 })
	return docs[0] ?? null
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function LogoOnBackgroundDisplay({ display }: { display: LogoOnBgWidgetRow }) {
	return (
		<LogoOnBackgroundWidget group={display.group} logo={display.logo} column={display.column} />
	)
}
