import { LandingHero, LandingLockup } from '@/components/shared/landing-hero'

// 렌더링: 정적. Payload 데이터를 읽지 않으므로 낡을 것이 없다.
// 🔴 방식을 선언으로 못박는다 — 선언이 없으면 Next가 추론하고, 그 추론은 프로덕션 빌드에서만
//    드러나 무관한 수정(권한·쿠키 조회 추가) 하나로 조용히 뒤집힌다(docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-static'

export default function HomePage() {
	return (
		// Figma 571:8681 — 그래픽은 아래에 깔리고 위로 갈수록 바탕이 된다. 진입은 상단 메뉴가 갖는다.
		<main className="h-full overflow-y-auto">
			<LandingHero size="screen" fade="up">
				<LandingLockup title="Living Brand System" />
			</LandingHero>
		</main>
	)
}
