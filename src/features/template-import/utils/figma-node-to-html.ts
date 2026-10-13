import { emitTemplateHtml } from './emit-template-html'
import type { FigmaRenderedAsset, FigmaSourceNode } from './figma-ir'
import { roundCssNumber } from './lower-figma-visuals'
import { normalizeFigmaNode } from './normalize-figma-node'

/**
 * Figma REST 노드 트리 → inline-style HTML 문자열의 공개 진입점.
 *
 * 실제 작업은 normalize(판단) → emit(방출) 파이프라인이 수행한다(단계 정의는 figma-ir.ts 참고).
 * 이 파일은 두 단계를 조합해 기존 호출부 계약(html/width/height)을 유지하는 껍데기다.
 * div=프레임/그룹/셰이프, p=텍스트, img=Figma 렌더 에셋. Figma 노드 타입은 data-figma-type으로 보존한다(레이어 패널용).
 */

export type { FigmaRenderedAsset } from './figma-ir'

export interface FigmaHtmlResult {
	html: string
	width: number
	height: number
}

/** 소스 트리와 렌더 에셋 맵(노드 렌더·IMAGE fill)을 받아 저장 가능한 HTML과 루트 크기를 돌려준다. */
export function convertFigmaNodeToHtml(
	node: FigmaSourceNode,
	renderedAssets: Readonly<Record<string, FigmaRenderedAsset>> = {},
	imageFillAssets: Readonly<Record<string, FigmaRenderedAsset>> = {},
	/** 판 fill 여러 겹을 합성한 한 장 — 있으면 bg 레이어가 판 fill 대신 이것을 쓴다. */
	backdropAsset?: FigmaRenderedAsset,
): FigmaHtmlResult {
	const ir = normalizeFigmaNode(node, renderedAssets, imageFillAssets, backdropAsset)
	return {
		html: ir ? emitTemplateHtml(ir) : '',
		width: roundCssNumber(node.absoluteBoundingBox?.width ?? 0),
		height: roundCssNumber(node.absoluteBoundingBox?.height ?? 0),
	}
}
