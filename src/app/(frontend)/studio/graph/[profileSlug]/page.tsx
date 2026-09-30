import { notFound } from 'next/navigation'
import { GraphicGenerator } from '@/components/studio/graphic/graphic-generator'
import { StudioWorkspacePage } from '@/components/studio/shared/studio-workspace'
import { listGraphStudioConfigs } from '@/features/graph-generation/services/list-graph-studio-configs.service'
import { requireUser } from '@/lib/request-auth'
import { getStudioGraphRoute } from '@/lib/routes'

// 렌더링: 매 요청. 권한·미리보기 상태를 읽으므로 캐시하지 않는다(docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-dynamic'

/** 세그먼트는 runtime id다 — 근거는 `/studio/graphic/[profileSlug]`가 갖는다. */
export default async function GenerateGraphProfilePage({
	params,
}: {
	params: Promise<{ profileSlug: string }>
}) {
	const { profileSlug } = await params
	const { user } = await requireUser(getStudioGraphRoute(profileSlug))

	const configs = await listGraphStudioConfigs(user)
	const config = configs.find((item) => item.id === profileSlug)

	if (!config) notFound()

	return (
		<StudioWorkspacePage
			title={config.name}
			description="인포그래픽 표현을 고르고 결과를 미리 봅니다."
			hideHeading
		>
			{/* 프로파일이 하나뿐이라 교체 카드를 세우지 않는다. */}
			<GraphicGenerator config={config} profileSwitching={false} />
		</StudioWorkspacePage>
	)
}
