import { redirect } from 'next/navigation'
import { ImageGenerator } from '@/components/studio/image/image-generator'
import { StudioWorkspacePage } from '@/components/studio/shared/studio-workspace'
import { listImageStudioConfigs } from '@/features/image-generation/services/list-image-studio-configs.service'
import { requireUser } from '@/lib/request-auth'
import { getStudioImageRoute, routes } from '@/lib/routes'

// 렌더링: 매 요청. 권한·미리보기 상태를 읽으므로 캐시하지 않는다.
// 🔴 방식을 선언으로 못박는다 — 추론에 맡기면 프로덕션에서만 드러나는 차이가 생긴다
//    (docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-dynamic'

// 생성 표면: 컨트롤러와 결과 캔버스만 소유하고, 생성 실행은 generate-image feature가 담당한다.
export default async function GenerateImagePage() {
	const { user } = await requireUser(routes.studio.image)
	// 시작 계약 하나만 싣는다 — 교체 후보 목록은 자산 브라우저가 열릴 때 /api/image-profiles가 내려준다.
	const [config] = await listImageStudioConfigs(user)
	// 근거는 `/studio/graphic`의 같은 자리에 적혀 있다.
	// 🔴 slug가 없는 프로파일은 딥링크가 없다 — 그때는 여기서 그대로 그린다.
	if (config?.image.slug) redirect(getStudioImageRoute(config.image.slug))

	return (
		<StudioWorkspacePage
			title="이미지 생성"
			description="프롬프트와 이미지 프로파일을 조합해 브랜드 이미지 후보를 만듭니다."
			hideHeading
		>
			<ImageGenerator config={config ?? null} />
		</StudioWorkspacePage>
	)
}
