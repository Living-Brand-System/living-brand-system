import { routes } from '@/lib/routes'

/**
 * 스튜디오 내비게이션의 **유일한 정본** — GNB와 푸터가 같은 목록을 그린다.
 *
 * 🔴 두 곳이 각자 목록을 들고 있었고, 실제로 어긋났다(푸터에 Graph가 없어 그 스튜디오는 주소를
 *    아는 사람만 갈 수 있었다 — QA C1). 목록이 둘이면 언젠가 또 갈린다.
 * 🔑 `group`은 GNB만 쓴다(제작/설정 두 묶음). 푸터는 한 묶음으로 전부 그린다.
 */
export const STUDIO_NAV_ITEMS = [
	{ key: 'template', href: routes.studio.template, label: 'Template', group: 'creation' },
	{ key: 'image', href: routes.studio.image, label: 'Image', group: 'creation' },
	{ key: 'graphic', href: routes.studio.graphic, label: 'Graphic', group: 'creation' },
	{ key: 'graph', href: routes.studio.graph, label: 'Graph', group: 'creation' },
	{ key: 'review', href: routes.studio.review, label: 'Review', group: 'setting' },
	{ key: 'assets', href: routes.studio.assets, label: 'Assets', group: 'setting' },
] as const

export type StudioNavKey = (typeof STUDIO_NAV_ITEMS)[number]['key']

/**
 * 🔴 `routes.studio`에 스튜디오를 추가하고 여기 안 넣으면 **`pnpm typecheck`가 떨어진다.**
 *    테스트가 아니라 타입으로 막는 이유: 새 스튜디오를 세우는 사람이 내비게이션을 잊는 시점은
 *    「테스트를 돌리기 전」이고, 그때 이미 알려 주는 편이 싸다.
 */
type MissingFromNav = Exclude<keyof typeof routes.studio, StudioNavKey>
const _everyStudioIsReachable: MissingFromNav extends never ? true : never = true
void _everyStudioIsReachable

export function studioNavItems(group: (typeof STUDIO_NAV_ITEMS)[number]['group']) {
	return STUDIO_NAV_ITEMS.filter((item) => item.group === group)
}
