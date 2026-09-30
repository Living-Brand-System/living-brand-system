import config from '@payload-config'
import { getPayload } from 'payload'
import { Typography } from '@/components/ui/typography'
import type {
	BrandColor,
	BrandColorGroup,
	HdColorPaletteWidget as HdColorPaletteWidgetRow,
} from '@/payload-types'
import { HdColorPaletteView, type PaletteLayout, type PaletteSwatch } from './view'

// 위젯(서버): brand-color-groups를 조회해 색을 한 줄로 늘어놓는다. 인터랙션(복사·hover)은 클라 뷰가 맡는다.
// 정렬 로직이 없다 — 줄 안의 순서는 그룹이 가진 관계 배열 순서 그대로다.
// RGB는 저장값이 아니라 hex에서 파생한다(BrandColors가 RGB를 저장하지 않는 이유와 같다).
type GroupRef = number | BrandColorGroup | null | undefined

const toSwatches = (group: BrandColorGroup): PaletteSwatch[] =>
	(group.colors ?? [])
		.filter((c): c is BrandColor => typeof c === 'object' && c !== null)
		.map((c) => ({
			id: String(c.id),
			name: c.name,
			hex: c.hex,
			cmyk: c.cmyk,
			pantone: c.pantone,
		}))

/** 삭제된 그룹을 가리키고 있으면 null — 위젯 하나가 페이지 전체를 죽이지 않게 한다. */
async function resolveGroup(
	payload: Awaited<ReturnType<typeof getPayload>>,
	id: number,
): Promise<BrandColorGroup | null> {
	try {
		return await payload.findByID({ collection: 'brand-color-groups', id, depth: 1 })
	} catch {
		return null
	}
}

export async function HdColorPaletteWidget({
	groups: picks,
	layout,
}: {
	groups?: GroupRef[] | null
	layout?: PaletteLayout | null
} = {}) {
	const payload = await getPayload({ config })

	// 🔴 넘어온 그룹을 그대로 쓰지 않고 id로 다시 조회한다. 페이지 조회가 depth:1이라
	//    그룹 자체는 populate돼도 그 안의 colors는 id 배열로 남는다(colors를 채우려면 depth:2).
	//    depth를 페이지 쪽에서 올리면 문서 전체 조회가 무거워지므로 위젯이 자기 것만 채운다.
	const ids = (picks ?? [])
		.map((g) => (typeof g === 'object' && g ? g.id : g))
		.filter((id): id is number => id != null)

	// 고르면 고른 순서대로, 비우면 전체를 그린다(갤러리가 props 없이 렌더한다).
	const groups: BrandColorGroup[] = ids.length
		? (await Promise.all(ids.map((id) => resolveGroup(payload, id)))).filter(
				(g): g is BrandColorGroup => g !== null,
			)
		: (await payload.find({ collection: 'brand-color-groups', limit: 50, depth: 1 })).docs

	const sections = groups
		.map((g) => ({ id: g.id, name: g.name, swatches: toSwatches(g) }))
		.filter((s) => s.swatches.length > 0)

	// 그릴 색이 하나도 없으면 그리지 않는다 — 빈 판을 남기면 규정이 없는 것처럼 보인다.
	// (그룹을 골랐는데 전부 해석 실패했거나, 컬렉션 자체가 비었을 때 여기에 온다.)
	if (sections.length === 0) return null

	// 균일 판형의 열 수. 위젯 안에서 가장 색이 많은 행에 맞춰야 모든 칸이 같은 크기가 된다.
	const columnCount = Math.max(1, ...sections.map((s) => s.swatches.length))
	// 위계 판형의 가중치는 순위에서 나온다 — 3그룹이면 3:2:1. 그룹 수가 달라져도 규칙이 유지된다.
	const weightOf = (index: number) => sections.length - index

	return (
		// 행 사이 간격 없이 붙여 한 덩어리로 읽히게 한다(그룹 구분은 행 위 라벨이 한다).
		<div className="flex size-full min-h-0 min-w-0 flex-col">
			{sections.map((section, index) => (
				<section
					key={section.id}
					className="flex min-h-0 flex-col"
					style={{ flex: layout === 'ranked' ? weightOf(index) : 1 }}
				>
					<Typography
						as="h3"
						size="sm"
						tone="muted"
						weight="medium"
						className="shrink-0 px-4 py-2"
					>
						{section.name}
					</Typography>
					<HdColorPaletteView
						swatches={section.swatches}
						layout={layout ?? 'uniform'}
						columnCount={columnCount}
					/>
				</section>
			))}
		</div>
	)
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function HdColorPaletteDisplay({ display }: { display: HdColorPaletteWidgetRow }) {
	return <HdColorPaletteWidget groups={display.groups} layout={display.layout} />
}
