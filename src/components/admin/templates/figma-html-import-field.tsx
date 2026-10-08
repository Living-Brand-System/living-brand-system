'use client'

import { Button, TextInput, toast, useForm, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'
import { composeTemplateHtml } from '@/features/template-core/runtime/compose-template-html.client'
import { requestFigmaHtmlImport } from '@/features/template-import/services/import-figma-html.client'
import type {
	FigmaRasterDiagnostic,
	FigmaTruncationDiagnostic,
} from '@/features/template-import/utils/normalize-figma-node'
import type { TemplateNodeConfigMap } from '@/types/template'

/** 이미지로 고정된 레이어 진단을 어드민 경고 문구로 요약한다(3개 초과는 개수로 줄임). */
function formatRasterWarning(diagnostics: FigmaRasterDiagnostic[]): string {
	const lines = diagnostics.slice(0, 3).map((diagnostic) => {
		const swallowed = diagnostic.textLayerCount
			? ` — 텍스트 ${diagnostic.textLayerCount}개가 편집 불가`
			: ''
		return `'${diagnostic.name}' (${diagnostic.reason}${swallowed})`
	})
	const rest = diagnostics.length - lines.length
	return `이미지로 고정된 레이어: ${lines.join(', ')}${rest > 0 ? ` 외 ${rest}개` : ''}. Figma에서 해당 속성을 정리하면 편집 가능한 레이어로 가져올 수 있습니다.`
}

/** 말줄임(…) 줄 수를 유도하지 못해 잘림만 적용된 텍스트 진단을 어드민 경고 문구로 요약한다. */
function formatTruncationWarning(diagnostics: FigmaTruncationDiagnostic[]): string {
	const names = diagnostics.slice(0, 3).map((diagnostic) => `'${diagnostic.name}'`)
	const rest = diagnostics.length - names.length
	return `말줄임(…) 줄 수를 정하지 못해 잘림만 적용된 텍스트 ${diagnostics.length}개: ${names.join(', ')}${rest > 0 ? ` 외 ${rest}개` : ''}. Figma에서 최대 줄 수나 고정 줄 높이(px)를 지정하면 말줄임으로 가져올 수 있습니다.`
}

/** 재import한 base HTML에 남아 있는 nodeId의 설정만 보존한다. 외부 I/O는 없다. */
function pruneTemplateNodeConfigs(
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
 * Templates 편집 폼(Admin)의 Figma 가져오기 UI 필드.
 * 입력창은 sourceUrl 폼 필드를 그대로 편집한다(별도 Source Url 필드와 통합).
 * 가져오면 새 baseHtml에 남은 노드의 overrides만 유지해 html을 재합성한다.
 * 저장은 Manager가 폼에서 결정한다.
 */
export function FigmaHtmlImportField() {
	const { dispatchFields, getData, setModified } = useForm()
	const sourceUrl = (useFormFields(([fields]) => fields.sourceUrl?.value) as string) ?? ''
	const setSourceUrl = (value: string) =>
		dispatchFields({ type: 'UPDATE', path: 'sourceUrl', value })
	const [isLoading, setIsLoading] = useState(false)

	async function handleImport() {
		if (!sourceUrl.trim()) {
			toast.error('node-id가 포함된 Figma URL을 입력하세요.')
			return
		}

		setIsLoading(true)

		try {
			const imported = await requestFigmaHtmlImport(sourceUrl)

			const currentNodeConfigs = (getData()?.overrides ?? {}) as TemplateNodeConfigMap
			const nextNodeConfigs = pruneTemplateNodeConfigs(imported.html, currentNodeConfigs)
			const removedOverrideCount =
				Object.keys(currentNodeConfigs).length - Object.keys(nextNodeConfigs).length
			dispatchFields({ type: 'UPDATE', path: 'baseHtml', value: imported.html })
			dispatchFields({ type: 'UPDATE', path: 'overrides', value: nextNodeConfigs })
			dispatchFields({
				type: 'UPDATE',
				path: 'html',
				value: composeTemplateHtml(imported.html, nextNodeConfigs),
			})
			dispatchFields({ type: 'UPDATE', path: 'width', value: imported.width })
			dispatchFields({ type: 'UPDATE', path: 'height', value: imported.height })
			dispatchFields({ type: 'UPDATE', path: 'sourceUrl', value: sourceUrl })
			// 이름이 비어 있을 때만 Figma 프레임 이름을 채운다.
			if (!getData()?.name && imported.name) {
				dispatchFields({ type: 'UPDATE', path: 'name', value: imported.name })
			}
			setModified(true)

			toast.success(
				`가져오기 완료 — ${imported.width}×${imported.height}.${removedOverrideCount ? ` 사라진 요소의 편집 ${removedOverrideCount}개를 정리했습니다.` : ''} 저장해야 반영됩니다.`,
			)
			if (imported.diagnostics?.length) {
				toast.warning(formatRasterWarning(imported.diagnostics))
			}
			if (imported.truncationDiagnostics?.length) {
				toast.warning(formatTruncationWarning(imported.truncationDiagnostics))
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Figma 가져오기에 실패했습니다.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="figma-html-import-field">
			<TextInput
				// description="Dev Mode"
				label="Figma URL"
				onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
					setSourceUrl(event.target.value)
				}
				path="sourceUrl"
				placeholder="https://www.figma.com/design/...?node-id=..."
				value={sourceUrl}
			/>
			<Button
				buttonStyle="secondary"
				disabled={isLoading}
				margin={false}
				onClick={handleImport}
				type="button"
			>
				{isLoading ? '가져오는 중...' : '가져오기'}
			</Button>
		</div>
	)
}
