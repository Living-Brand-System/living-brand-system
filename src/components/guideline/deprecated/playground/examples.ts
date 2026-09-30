import config from '@payload-config'
import { getPayload } from 'payload'
import type { DisplayData } from '@/features/guideline/domain/contract/display'
import type { BrandLogo } from '@/payload-types'

function pick(logos: BrandLogo[], filename: string) {
	return logos.find((logo) => logo.filename === filename)
}

/** 기존 갤러리의 업로드 관계를 읽기 전용으로 연결한다. */
export async function playgroundExamples() {
	const payload = await getPayload({ config })
	const { docs: logos } = await payload.find({
		collection: 'brand-logos',
		limit: 200,
		depth: 0,
		overrideAccess: true,
	})

	// 클리어스페이스 위젯은 로고 레이어 + 그리드 레이어를 같은 viewBox로 겹친다.
	const hLogo = pick(logos, 'ko-horizontal-default-logoSpace.svg')
	const hGrid = pick(logos, 'ko-horizontal-default-clearSpace.svg')
	const vLogo = pick(logos, 'ko-vertical-default-logoSpace.svg')
	const vGrid = pick(logos, 'ko-vertical-default-clearSpace.svg')
	const koLogo = pick(logos, 'ko-horizontal-default.svg')

	// 배경색 위젯은 그룹을 안 주면 첫 그룹(Primary)을 잡는데, Primary 4색은 규정상 기본형·WHITE가
	// 전부 불가라 미리보기가 ✕만 나온다. 결과가 갈리는 그룹을 집어 위젯이 뭘 하는지 보이게 한다.
	const { docs: colorGroups } = await payload.find({
		collection: 'brand-color-groups',
		limit: 50,
		depth: 0,
		overrideAccess: true,
	})
	const bgGroup = colorGroups.find((g) => g.name === 'Background Color') ?? colorGroups[0] ?? null

	return [
		{ name: 'CI 조합형', display: { blockType: 'ciLockupWidget' } },
		{
			name: 'CI 자회사',
			display: { blockType: 'ciLockupHeroWidget', source: 'subsidiary', h: 120 },
		},
		{
			name: 'CI 해외지사',
			display: { blockType: 'ciLockupHeroWidget', source: 'branch', h: 100 },
		},
		{ name: '아이콘 그리드', display: { blockType: 'iconGridWidget' } },
		{ name: '심볼 보호 공간', display: { blockType: 'stemClearSpaceWidget' } },
		{
			name: '컬러 팔레트 · 균일',
			display: { blockType: 'hdColorPaletteWidget', layout: 'uniform' },
		},
		{
			name: '컬러 팔레트 · 위계',
			display: { blockType: 'hdColorPaletteWidget', layout: 'ranked' },
		},
		{ name: '타입 견본', display: { blockType: 'typeSpecimenWidget' } },
		{ name: '타입 굵기', display: { blockType: 'typeWeightWidget' } },
		{ name: '타입 위계', display: { blockType: 'typeHierarchyWidget', language: 'ko' } },
		{
			name: '언어별 표본 · 단일',
			display: { blockType: 'typeLanguageWidget', layout: 'single' },
		},
		{
			name: '언어별 표본 · 비교',
			display: { blockType: 'typeLanguageWidget', layout: 'compare' },
		},
		...(koLogo
			? [
					{
						name: '로고',
						display: { blockType: 'logoDisplayWidget' as const, logo: koLogo },
					},
				]
			: []),
		{ name: '배경 위 로고', display: { blockType: 'logoOnBgWidget' } },
		{ name: '로고 배경 선택', display: { blockType: 'logoBgPickerWidget', group: bgGroup } },
		...(hLogo && hGrid
			? [
					{
						name: '보호 공간 오버레이',
						display: {
							blockType: 'clearspaceOverlayWidget' as const,
							logoLayer: hLogo,
							gridLayer: hGrid,
						},
					},
				]
			: []),
		...(hLogo
			? [
					{
						name: '보호 공간 뷰어',
						display: {
							blockType: 'clearspaceViewerWidget' as const,
							horizontalLogo: hLogo,
							horizontalGrid: hGrid,
							verticalLogo: vLogo,
							verticalGrid: vGrid,
						},
					},
				]
			: []),
		{
			name: '컬러 프리셋',
			display: { blockType: 'presetPanelDisplay', preset: 'overlay-stack', logo: koLogo },
		},
		{ name: '타이포 프리셋', display: { blockType: 'presetPanelDisplay', preset: 'slanted' } },
		{ name: '레이아웃 그리드', display: { blockType: 'layoutGridWidget' } },
		{ name: '레이아웃 그리드 오버레이', display: { blockType: 'layoutGridOverlayWidget' } },
	] satisfies { name: string; display: DisplayData }[]
}
