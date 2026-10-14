'use client'

import { ManagerOverlay } from '@/components/studio/shared/manager-overlay'
import {
	isManagedLayerKind,
	TemplateLayersManagerForm,
} from '@/components/studio/template/manager-forms/layers-form'
import { TemplateTextManagerForm } from '@/components/studio/template/manager-forms/text-form'

/**
 * 템플릿 편집 화면의 Manager mode — 종류(`data-manager-target`의 앞부분)마다 관리 폼을 등록한다.
 * 원본 컨트롤러는 표시만 달고, 폼은 `manager-forms/`에 따로 산다. 새 칸은 표시 + 여기 한 줄이다.
 */
export function TemplateManagerOverlay() {
	return (
		<ManagerOverlay
			forms={{
				text: {
					title: '칸 설정',
					render: (nodeId) => <TemplateTextManagerForm nodeId={nodeId} />,
				},
				layers: {
					title: '레이어 이름·순서·편집 권한',
					accepts: isManagedLayerKind,
					render: (kind) =>
						isManagedLayerKind(kind) ? <TemplateLayersManagerForm kind={kind} /> : null,
				},
			}}
		/>
	)
}
