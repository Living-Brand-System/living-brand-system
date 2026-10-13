'use client'

import { DataTable, Debug, UserAdmin } from '@carbon/icons-react'
import { StudioRailIcon } from '@/components/studio/panel/studio-rail'
import { useManagerMode } from '@/components/studio/shared/use-manager-mode'
import { TemplateDataEditor } from '@/components/studio/template/template-data-editor'

/**
 * 템플릿 편집 화면 레일 맨 아래 버튼 셋(manager 이상, 사용자 2026-10-13).
 * ① CMS Style — 목록·생성·수정 모달 ② Manager mode — 이 화면에서 바로 고치기 ③ QA mode — 자리만.
 */
export function TemplateManagerRail({ templateId }: { templateId: number }) {
	const managerMode = useManagerMode()
	return (
		<>
			<TemplateDataEditor
				currentTemplateId={templateId}
				trigger={(open) => (
					<StudioRailIcon
						icon={<DataTable />}
						label="Manager mode (CMS Style)"
						onClick={open}
					/>
				)}
			/>
			<StudioRailIcon
				icon={<UserAdmin />}
				label="Manager mode"
				state={managerMode.on ? 'active' : 'idle'}
				onClick={managerMode.toggle}
			/>
			{/* ponytail: 자리만 — QA 방식은 사용자가 정한다(QA 파일 C12). */}
			<StudioRailIcon icon={<Debug />} label="QA mode (준비 중)" disabled />
		</>
	)
}
