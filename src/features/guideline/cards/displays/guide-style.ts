/** 규정 안내선 공통 기준. 브랜드 색상은 데이터에서 조회하며 임의 팔레트를 만들지 않습니다. */
export const GUIDE_LINE_WIDTH = 1
export const GUIDE_COLOR_NAME = 'HD HERITAGE GREEN'
export const guideColorOf = (colors: Record<string, string>) =>
	colors[GUIDE_COLOR_NAME] ?? 'currentColor'
