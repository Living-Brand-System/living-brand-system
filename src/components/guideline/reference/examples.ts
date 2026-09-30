// Figma 4zXBMnMCPay346ohMBrMFA / 153:28의 개발용 표현 표본. CMS 콘텐츠를 쓰거나 대체하지 않는다.
export const identityCards = [
	{
		id: 'identification',
		image: {
			src: '/guideline/reference/identification.png',
			alt: '포워드마크와 HD 워드마크의 결합',
			width: 371,
			height: 157,
		},
		caption: {
			title: '브랜드 식별성 강화',
			description:
				'포워드마크 단독 사용 시 일반 그래픽으로 인식될 수 있으므로, 반드시 HD 워드마크와 함께 사용하여 브랜드를 올바르게 식별할 수 있도록 합니다.',
		},
	},
	{
		id: 'trademark',
		image: {
			src: '/guideline/reference/trademark.png',
			alt: '포워드마크와 워드마크의 상표 구성',
			width: 371,
			height: 249,
		},
		caption: {
			title: '상표권 보호 및 법적 안정성',
			description:
				'포워드마크는 단순 도형으로 인식될 가능성이 있어 일부 국가에서 상표로서의 식별력을 확보하기 어려울 수 있습니다. 포워드마크와 HD 워드마크를 함께 사용하면, 글로벌 상표권을 보다 안정적으로 유지할 수 있습니다.',
		},
	},
	{
		id: 'misuse',
		image: {
			src: '/guideline/reference/safe-area.png',
			alt: '워드마크와 함께 사용하는 로고의 구성과 보호 공간',
			width: 439,
			height: 243,
		},
		caption: {
			title: '오용 및 오인 방지',
			description:
				'포워드마크 단독 사용 시 화살표, 안내 표지, UI 아이콘 등으로 오용되거나 브랜드와 무관한 그래픽 요소로 오인될 수 있습니다. 워드마크와 함께 사용하여 이러한 오용과 혼동을 방지합니다.',
		},
	},
] as const

export const safeAreaCards = [
	{
		id: 'clear-space',
		image: {
			src: '/guideline/reference/safe-area.png',
			alt: '로고의 최소 여백과 기준 모듈 치수',
			width: 439,
			height: 243,
		},
		caption: {
			title: '최소 여백',
			description:
				'로고의 가독성을 보장하기 위해 로고를 직접 둘러싸는 영역을 보호해야 하며, 포워드 마크 높이의 1/2 규격 정사각형을 로고 최소 여백의 기준 모듈로 설정합니다.',
		},
	},
	{
		id: 'digital-1',
		image: null,
		caption: { title: '디지털 환경 1', description: 'Figma 원본의 도판이 비어 있습니다.' },
	},
	{
		id: 'minimum-size',
		image: {
			src: '/guideline/reference/minimum-size.png',
			alt: '디지털 환경의 최소 크기 표본',
			width: 155,
			height: 28,
			scale: 'small',
		},
		caption: {
			title: '최소 크기',
			description:
				'디지털 응용매체에서 즐겨찾기 아이콘(파비콘)으로 활용 시 예외적으로 최소 크기 규정보다 작은 사이즈로 사용 가능합니다.',
		},
	},
	{
		id: 'digital-2',
		image: null,
		caption: {
			title: '디지털 환경 2',
			description:
				'디지털 응용매체에서 즐겨찾기 아이콘(파비콘)으로 활용 시 예외적으로 최소 크기 규정보다 작은 사이즈로 사용 가능합니다.',
		},
	},
] as const
