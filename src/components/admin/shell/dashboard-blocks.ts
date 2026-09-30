/**
 * 대시보드가 컬렉션을 묶는 방식. 사이드바의 `admin.group`과 **의도적으로 다르다** —
 * 브랜드 자원 하나가 카드 셋으로 갈라지고, 운영 기록·검수 설정·에이전트가 아래 세 줄로 다시 눕는다.
 * 정본은 Figma HD_LBS_UI(4zXBMnMCPay346ohMBrMFA, 67:2468)다.
 *
 * 라벨은 여기 적지 않는다. Payload config가 가진 것을 그대로 읽어야 사이드바와 갈라지지 않는다.
 */

export type DashboardEntry = {
	kind: 'collection' | 'global'
	slug: string
}

export type DashboardBlock = {
	title: string
	entries: DashboardEntry[]
	/** 카드 두 칸을 혼자 쓴다. */
	wide?: boolean
}

const collection = (slug: string): DashboardEntry => ({ kind: 'collection', slug })
const global = (slug: string): DashboardEntry => ({ kind: 'global', slug })

/** 위쪽 브랜드 카드. 제목이 위, 링크가 아래에 붙고 가운데는 비운다. */
export const DASHBOARD_CARD_BLOCKS: DashboardBlock[] = [
	{
		title: '가이드라인',
		entries: [collection('guideline-documents'), global('guideline')],
	},
	{
		title: '브랜드 자원',
		entries: [
			collection('brand-logos'),
			collection('brand-icons'),
			collection('brand-typefaces'),
		],
	},
	{
		title: '브랜드 이미지',
		entries: [collection('application-images'), collection('sample-images')],
	},
	{
		title: '브랜드 색상',
		entries: [collection('brand-color-groups'), collection('brand-colors')],
	},
	{
		title: '제작 도구',
		entries: [
			collection('image-profiles'),
			collection('graphic-profiles'),
			collection('graph-profiles'),
			collection('templates'),
		],
		wide: true,
	},
]

/** 아래쪽 무채색 목록. 카드가 아니라 구분선 아래 텍스트로만 선다. */
export const DASHBOARD_PLAIN_BLOCKS: DashboardBlock[] = [
	{
		title: '기록',
		entries: [
			collection('generated-images'),
			collection('check-sessions'),
			collection('agent-chat-sessions'),
		],
	},
	{
		title: '검수',
		entries: [collection('check-scenarios'), collection('rules'), collection('rule-checkers')],
	},
	{
		title: '에이전트 대화',
		entries: [collection('agent-skills'), global('agent-settings')],
	},
]

/** 맨 아래 전폭 한 줄. */
export const DASHBOARD_SYSTEM_BLOCK: DashboardBlock = {
	title: '시스템',
	entries: [
		collection('users'),
		collection('payload-mcp-api-keys'),
		global('better-editor-settings'),
	],
	wide: true,
}
