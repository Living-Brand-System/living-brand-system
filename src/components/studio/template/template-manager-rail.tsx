'use client'

import { DataTable, Debug, UserAdmin } from '@carbon/icons-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { StudioRailIcon } from '@/components/studio/panel/studio-rail'
import { useManagerMode } from '@/components/studio/shared/use-manager-mode'
import { TemplateDataEditor } from '@/components/studio/template/template-data-editor'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	discardTemplateDraft,
	hasTemplateDraft,
	publishTemplateDraft,
	readTemplateDraft,
} from '@/features/template-customization/services/template-records.client'
import { getStudioTemplateRoute } from '@/lib/routes'

/**
 * 템플릿 편집 화면 레일 맨 아래 버튼 셋(manager 이상, 사용자 2026-10-13).
 * ① CMS Style — 목록·생성·수정 모달 ② Manager mode — 이 화면에서 바로 고치기 ③ QA mode — 자리만.
 * Manager mode에서 고친 값은 초안으로 쌓이고, 끌 때 저장할지 버릴지 고른다(사용자 2026-10-14).
 */
export function TemplateManagerRail({ templateId }: { templateId: number }) {
	const managerMode = useManagerMode()
	const router = useRouter()
	const pathname = usePathname()
	const [exiting, setExiting] = useState(false)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const toggle = async () => {
		if (!managerMode.on) return managerMode.toggle()
		// 읽지 못하면 고친 값이 있다고 보고 묻는다 — 말없이 끄면 고친 값의 행방을 모른다.
		if (await hasTemplateDraft(templateId).catch(() => true)) setExiting(true)
		else managerMode.toggle()
	}

	const finish = async (action: (id: number) => Promise<void>) => {
		setBusy(true)
		setError(null)
		try {
			await action(templateId)
			managerMode.toggle()
			setExiting(false)
			// 저장으로 주소(slug)가 바뀌었으면 지금 주소는 사라졌다 — 새 주소로 옮긴다.
			const slug = (await readTemplateDraft(templateId, Number.POSITIVE_INFINITY)).slug
			if (typeof slug === 'string' && pathname !== getStudioTemplateRoute(slug)) {
				router.replace(getStudioTemplateRoute(slug), { scroll: false })
			} else {
				router.refresh()
			}
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : '요청을 처리하지 못했어요.')
		} finally {
			setBusy(false)
		}
	}

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
				onClick={() => void toggle()}
			/>
			{/* ponytail: 자리만 — QA 방식은 사용자가 정한다(QA 파일 C12). */}
			<StudioRailIcon icon={<Debug />} label="QA mode (준비 중)" disabled />
			<Dialog open={exiting} onOpenChange={(open) => !busy && setExiting(open)}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>고친 값을 저장할까요?</DialogTitle>
						<DialogDescription>
							저장하면 모든 사용자에게 바로 반영돼요. 버리면 마지막으로 저장한 상태로
							돌아가요.
						</DialogDescription>
					</DialogHeader>
					{error && (
						<p role="alert" className="text-destructive">
							{error}
						</p>
					)}
					<DialogFooter>
						<Button variant="ghost" disabled={busy} onClick={() => setExiting(false)}>
							계속 고치기
						</Button>
						<Button
							variant="outline"
							disabled={busy}
							onClick={() => void finish(discardTemplateDraft)}
						>
							버리기
						</Button>
						<Button disabled={busy} onClick={() => void finish(publishTemplateDraft)}>
							저장
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
