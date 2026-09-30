import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// HD현대 컬러 팔레트 위젯. brand-color-groups를 서버에서 조회해 색을 한 줄로 늘어놓는다.
// 어떤 색이 어느 그룹에 어떤 순서로 들어가는지는 컬렉션이 소유한다 — 위젯은 어느 그룹을 그릴지만 고른다.
// 제목·폭은 컨테이너 Block 소관이라 여기 없다(docs/11 §4). rules도 Block에만 둔다(provenance 불변식).
export const hdColorPalette = defineDisplay({
	id: 'hdColorPaletteWidget',
	type: 'dynamic',
	category: 'color',
	sizing: 'responsive',
	dbName: 'hcp',
	name: 'HD 컬러 팔레트',
	description: '컬러 그룹의 스와치 격자. 카드 높이를 균등 또는 순위 비율로 나눈다.',
	fields: [
		{
			// hasMany인 이유: 같은 색을 다른 기준으로 묶은 그룹이 공존한다(용도별 / 계열별).
			// 한 블록이 그중 어느 묶음을 보여줄지 골라야 하므로 단일 선택으로는 부족하다.
			name: 'groups',
			type: 'relationship',
			relationTo: 'brand-color-groups',
			hasMany: true,
			admin: {
				description:
					'표시할 컬러 그룹입니다. 고른 순서대로 한 행씩 그립니다. 비우면 모든 그룹을 표시합니다.',
			},
		},
		{
			// 그룹 사이에 우열이 있느냐가 판형을 가른다. 위계가 있으면 높이로, 없으면 균일한 크기로.
			name: 'layout',
			type: 'select',
			defaultValue: 'uniform',
			enumName: 'enum_hcp_layout',
			options: [
				{ label: '균일 (모든 칸이 같은 크기)', value: 'uniform' },
				{ label: '위계 (앞 그룹일수록 높다)', value: 'ranked' },
			],
			admin: {
				description:
					'균일: 색 수와 무관하게 모든 칸이 같은 크기입니다 — 계열 분류처럼 그룹 간 우열이 없을 때 씁니다. 위계: 고른 순서대로 행 높이가 줄어듭니다(3그룹이면 3:2:1) — Primary/Secondary/Mono처럼 중요도가 있을 때 씁니다.',
			},
		},
	],
})

export default hdColorPalette
