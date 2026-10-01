import { GuidelineOnboard } from '@/components/guideline/pages/guideline-onboard'
import { getGuidelineNavigation } from '@/features/guideline/services/get-guideline-navigation.service'

// 렌더링: 정적 + 온디맨드 무효화. 목차를 읽으므로 낡을 수 있고, 콘텐츠 변경 훅이 이 캐시를 버린다
// (docs/05 「렌더링 캐시 무효화」). 진입 페이지라 매 요청 조회를 피하려고 정적으로 둔다.
// 🔴 dev는 이 캐시를 흉내내지 않는다. 확인은 preview:build + preview:start로 한다.
export const dynamic = 'force-static'

export default async function GuidelineIndexPage() {
	const navigation = await getGuidelineNavigation()

	return <GuidelineOnboard navigation={navigation} />
}
