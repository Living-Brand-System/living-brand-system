import { ReviewCanvas } from '@/components/studio/review/review-canvas'
import { StudioWorkspace, StudioWorkspacePage } from '@/components/studio/shared/studio-workspace'
import { ReviewSidebar } from '@/components/studio/sidebar/review-sidebar'
import { StudioLeftPanel } from '@/components/studio/sidebar/studio-left-panel'
import { getCheckRuleset } from '@/features/asset-check/services/get-check-ruleset.service'
import { requireUser } from '@/lib/request-auth'
import { routes } from '@/lib/routes'

// 검수 표면: 대상 미리보기는 캔버스가, 결과는 오른쪽 컨트롤러가 소유한다.
// 편집 세션(업로드·선택·검수 실행)은 layout.tsx의 CheckImageProvider가 갖는다.
export default async function ReviewPage() {
	await requireUser(routes.studio.review)
	const sections = await getCheckRuleset()

	return (
		<StudioWorkspacePage title="Check Assets" description="Check Your Creations" hideHeading>
			<StudioWorkspace
				leftPanel={
					<StudioLeftPanel
						empty={{
							title: '왼쪽 컨트롤이 아직 없습니다',
							description: '검수 대상 선택과 판 전체 설정이 이 자리로 옮겨 옵니다.',
						}}
					/>
				}
				sidebar={<ReviewSidebar sections={sections} />}
			>
				<ReviewCanvas />
			</StudioWorkspace>
		</StudioWorkspacePage>
	)
}
