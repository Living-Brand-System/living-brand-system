/**
 * Checker: 검출된 로고 bbox 주변 clear-space가 충분한지 본다.
 * checkKey는 `logo.space.clear`, 파일명은 여백 측정 기능을 따른다.
 */

import { detectLogoRegion, estimateStemWidth } from './logo-geometry'
import type { AlgorithmChecker } from './types'

// clear space 모듈 = stem width × 3 (정사각 배제구역).
// 🔴 HD 규정이 아니다 — HD는 심볼 높이 H 기준(docs/12)이라 값이 아니라 측정 방식부터 바꿔야 한다.
const MODULE_STEMS = 3

/**
 * logo.space.clear: 로고 주변 여백이 규정 배제구역(=stem×3)을 확보하는지 검수한다.
 * (가) flat·로고 위주 입력 전제 — 로고 bbox에서 이미지 가장자리까지의 최소 여백을
 * 로고 자체에서 추정한 모듈과 비교한다(스케일 불변, 로고 크기 대비 여백).
 */
export const clearSpaceChecker: AlgorithmChecker = ({ grid }) => {
	if (!grid) return { status: 'fail', fulfillment: null, detail: 'grid 없음' }
	const region = detectLogoRegion(grid)
	if (!region) return { status: 'fail', fulfillment: 0, detail: '로고 영역 검출 실패' }

	const stem = estimateStemWidth(region)
	const moduleReq = stem * MODULE_STEMS
	const { bbox, width, height } = region
	const margins = [bbox.x0, bbox.y0, width - 1 - bbox.x1, height - 1 - bbox.y1]
	const minMargin = Math.min(...margins)
	const regionWidth = bbox.x1 - bbox.x0 + 1
	const regionHeight = bbox.y1 - bbox.y0 + 1

	if (minMargin === 0 && (regionWidth / width > 0.7 || regionHeight / height > 0.7)) {
		return {
			status: 'needs_review',
			fulfillment: null,
			detail: '복합 이미지의 전경이 프레임 가장자리까지 이어져 로고만 분리하지 못함',
			metric: { expected: `${moduleReq}px`, actual: 'unresolved' },
		}
	}

	const ratio = moduleReq === 0 ? 1 : minMargin / moduleReq

	return {
		status: minMargin >= moduleReq ? 'pass' : 'fail',
		fulfillment: Math.round(Math.min(ratio, 1) * 1000) / 10,
		detail: `여백 최소 ${minMargin}px / 요구 ${moduleReq}px (모듈 = stem ${stem}px × ${MODULE_STEMS})`,
		metric: { expected: `${moduleReq}px`, actual: `${minMargin}px` },
	}
}
