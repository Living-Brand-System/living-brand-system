import {
	applyImportedLayerDefaults,
	moveLayer,
	parseLayers,
	pruneCarrierChildImageKeys,
} from '@/components/admin/templates/template-layers'
import { composeTemplateHtml } from '@/features/template-core/runtime/compose-template-html.client'
import {
	patchTemplate,
	readTemplateFields,
	readTemplateLayerSource,
	type TemplateLayerSource,
} from '@/features/template-customization/services/template-records.client'
import { requestFigmaHtmlImport } from '@/features/template-import/services/import-figma-html.client'
import type {
	TemplateLayerAccess,
	TemplateNodeConfig,
	TemplateNodeConfigMap,
} from '@/types/template'

/*
 * Manager mode의 쓰기 중 렌더 html을 다시 합성해야 하는 것(노드 설정·원본이 바뀐다).
 * 🔴 합성(`composeTemplateHtml`)은 template-core의 runtime이라 다른 경계(features)에서 못 부른다(docs/06 R1) —
 *    그래서 화면 층(components)에 둔다. `template-data-editor.tsx`가 같은 자리에서 합성한다.
 */

/**
 * 레이어 하나의 편집 권한을 바꾼다 — admin 레이어 편집기와 같은 규칙: 숨김이 아니게 되는 레이어에는
 * 입력 선언(텍스트 `input`·이미지 `imageInput`)을 붙이고(이미지면 캐리어 자식에 남은 예전 이미지 키를 걷는다),
 * 노드 설정이 바뀌면 렌더 html을 다시 합성한다.
 */
export async function updateTemplateLayerAccess(
	templateId: number,
	nodeId: string,
	access: TemplateLayerAccess,
	declare: 'input' | 'imageInput' | null = 'input',
): Promise<void> {
	const { baseHtml, overrides: current } = await readTemplateLayerSource(templateId)
	const config = current[nodeId] ?? {}
	const declared: TemplateNodeConfig =
		access !== 'hidden' && declare && !config[declare] ? { [declare]: {} } : {}
	const merged: TemplateNodeConfigMap = {
		...current,
		[nodeId]: { ...config, creator: { ...config.creator, access }, ...declared },
	}
	const overrides = declared.imageInput
		? pruneCarrierChildImageKeys(
				merged,
				parseLayers(baseHtml).find((row) => row.id === nodeId)?.carrierChildId,
				declared,
			)
		: merged
	await patchTemplate(
		templateId,
		{ overrides, html: composeTemplateHtml(baseHtml, overrides) },
		'편집 권한을 바꾸지 못했어요.',
	)
}

/**
 * 레이어 하나의 노드 설정을 고친다 — 지금 설정을 받아 다음 설정을 돌려주는 함수로 고친다.
 * `undefined`를 돌려준 키는 지워진다. 노드 설정이 바뀌면 렌더 html을 늘 다시 합성한다(문구·이름이 html에 들어간다).
 * 🔴 서버 검증(parse-template-node-configs)은 모르는 키나 범위 밖 값을 400으로 거부한다.
 */
export async function updateTemplateNodeConfig(
	templateId: number,
	nodeId: string,
	update: (config: TemplateNodeConfig) => TemplateNodeConfig,
	fallback = '레이어 설정을 저장하지 못했어요.',
): Promise<void> {
	const { baseHtml, overrides: current } = await readTemplateLayerSource(templateId)
	const next = stripUndefined(update(current[nodeId] ?? {}))
	const overrides: TemplateNodeConfigMap = { ...current, [nodeId]: next }
	await patchTemplate(
		templateId,
		{ overrides, html: composeTemplateHtml(baseHtml, overrides) },
		fallback,
	)
}

function stripUndefined<T extends object>(value: T): T {
	return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T
}

/**
 * 지금 겹침 순서대로의 레이어 — `childOrder`가 반영된 합성 html에서 읽는다(admin 레이어 목록과 같은 자리).
 * 🔴 baseHtml에서 읽으면 Figma 순서라, 한 번 옮긴 뒤의 이동이 엉뚱한 형제와 자리를 바꾼다.
 */
export const stackedLayersOf = ({ baseHtml, overrides }: TemplateLayerSource) =>
	parseLayers(composeTemplateHtml(baseHtml, overrides))

/** 레이어 이름 — 비우면 Figma 이름으로 돌아간다(admin 레이어 편집기와 같다). */
export function renameTemplateLayer(templateId: number, nodeId: string, label: string) {
	return updateTemplateNodeConfig(
		templateId,
		nodeId,
		(config) => ({ ...config, label: label.trim() || undefined }),
		'레이어 이름을 바꾸지 못했어요.',
	)
}

/** 형제 안에서 한 칸 옮긴다 — 최신 값을 다시 읽어 `moveLayer`로 고치고 html을 다시 합성한다. */
export async function moveTemplateLayer(
	templateId: number,
	nodeId: string,
	direction: 'up' | 'down',
) {
	const source = await readTemplateLayerSource(templateId)
	const overrides = moveLayer(source.overrides, stackedLayersOf(source), nodeId, direction)
	if (!overrides) throw new Error('더 옮길 수 없어요.')
	await patchTemplate(
		templateId,
		{ overrides, html: composeTemplateHtml(source.baseHtml, overrides) },
		'겹침 순서를 바꾸지 못했어요.',
	)
}

/**
 * 새 baseHtml에 남은 노드의 설정만 남긴다 — admin 「가져오기」 필드(`figma-html-import-field.tsx`)와 같은 규칙.
 * 그 파일은 `@payloadcms/ui`를 불러 앱에서 import할 수 없어 옮겨 왔다.
 */
export function keepSurvivingNodeConfigs(
	baseHtml: string,
	nodeConfigs: TemplateNodeConfigMap,
): TemplateNodeConfigMap {
	const doc = new DOMParser().parseFromString(baseHtml, 'text/html')
	const nodeIds = new Set(
		Array.from(doc.querySelectorAll('[data-node-id]'), (element) =>
			element.getAttribute('data-node-id'),
		),
	)
	return Object.fromEntries(Object.entries(nodeConfigs).filter(([nodeId]) => nodeIds.has(nodeId)))
}

/**
 * 같은 Figma 프레임에서 다시 가져와 바로 반영한다 — admin 「가져오기」와 같은 조립:
 * 남은 노드의 설정만 유지 → 레이어 기본값 → html 재합성. 판형(outputKind·size)은 비율이 그대로면 두고,
 * 🔴 비율이 바뀌면 서버 검증(`validateTemplateSize`, 1%)이 저장을 막는다 — 디지털은 판형을 새 Figma px로
 *    같이 쓰고, 인쇄(mm)는 사람이 정할 값이라 저장하지 않고 admin으로 보낸다.
 */
export async function reimportTemplateFromFigma(templateId: number, sourceUrl: string) {
	const imported = await requestFigmaHtmlImport(sourceUrl)
	const {
		overrides: current,
		outputKind,
		size,
	} = await readTemplateFields<{
		overrides?: TemplateNodeConfigMap | null
		outputKind?: 'digital' | 'print' | null
		size?: { width?: number | null; height?: number | null } | null
	}>(templateId, ['overrides', 'outputKind', 'size'])
	const ratioChanged =
		!!size?.width &&
		!!size.height &&
		Math.abs(size.width / size.height / (imported.width / imported.height) - 1) > 0.01
	if (ratioChanged && outputKind === 'print') {
		throw new Error(
			`Figma 판의 가로세로 비율이 바뀌었어요(${imported.width}×${imported.height}px). 인쇄 판형(mm)을 같은 비율로 같이 고쳐야 해서 admin에서 다시 가져와 주세요.`,
		)
	}
	const kept = keepSurvivingNodeConfigs(imported.html, current ?? {})
	const overrides = applyImportedLayerDefaults(imported.html, kept)
	await patchTemplate(
		templateId,
		{
			sourceUrl,
			baseHtml: imported.html,
			overrides,
			html: composeTemplateHtml(imported.html, overrides),
			width: imported.width,
			height: imported.height,
			...(ratioChanged
				? {
						size: {
							width: Math.round(imported.width),
							height: Math.round(imported.height),
						},
					}
				: {}),
		},
		'Figma에서 다시 가져오지 못했어요.',
	)
	return {
		width: imported.width,
		height: imported.height,
		resized: ratioChanged,
		removed: Object.keys(current ?? {}).length - Object.keys(kept).length,
		rasterized: imported.diagnostics?.length ?? 0,
	}
}
