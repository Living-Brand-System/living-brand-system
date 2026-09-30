import sharp from 'sharp'

/** PDF가 쓰는 0~1 CMYK 성분. */
export type CmykColor = { c: number; m: number; y: number; k: number }

/**
 * 색 몇 개를 ICC 프로파일로 CMYK 변환한다. 벡터 인쇄물의 도형 색이 래스터 경로와 같은 변환을
 * 타게 하려는 것이다 — 공식으로 근사하면 같은 판의 이미지와 도형이 다른 색으로 찍힌다.
 *
 * 🔑 색마다 sharp를 부르지 않고 **1픽셀씩 늘어놓은 가로 한 줄**을 한 번에 변환한다.
 */
export async function convertRgbToCmyk(
	hexColors: readonly string[],
	icc: string,
): Promise<Map<string, CmykColor>> {
	const unique = [...new Set(hexColors)].filter((hex) => /^#[0-9a-f]{6}$/i.test(hex))
	if (unique.length === 0) return new Map()

	const rgb = Buffer.alloc(unique.length * 3)
	unique.forEach((hex, index) => {
		const value = Number.parseInt(hex.slice(1), 16)
		rgb[index * 3] = (value >> 16) & 255
		rgb[index * 3 + 1] = (value >> 8) & 255
		rgb[index * 3 + 2] = value & 255
	})

	// 🔴 `toColourspace('cmyk')`를 먼저 부르면 sharp가 자체 변환으로 CMYK를 만들고 ICC가 그것을
	//    **또** 변환한다(이중 변환). 실측: HD 그린 #00ad45가 K2가 아니라 K11.8이 되어 탁해지고,
	//    #000000과 #1a1a1a가 완전히 같은 잉크값이 되어 어두운 톤 구분이 사라졌다.
	const { data: converted, info } = await sharp(rgb, {
		raw: { channels: 3, height: 1, width: unique.length },
	})
		.withIccProfile(icc)
		.raw()
		.toBuffer({ resolveWithObject: true })
	// 🔴 sharp는 ICC 변환 실패를 삼키고 경고만 남긴다 — 그러면 3채널 sRGB가 그대로 나오는데
	//    아래 인덱싱이 `*4`를 가정하므로 조용히 NaN 잉크가 된다. 인쇄물은 되돌릴 수 없다.
	if (info.channels !== 4) {
		throw new Error(`CMYK 변환이 4채널을 내지 않았습니다: ${info.channels}채널`)
	}

	return new Map(
		unique.map((hex, index) => {
			const key = hex.toLowerCase()
			// 🔴 순수 검정만 ICC 결과를 쓰지 않는다. CRPC6는 #000000을 C76.5 M71.8 Y61.6 K97.6
			//    (총 307.5%)로 분해한다 — 글자·로고가 네 판에 모두 찍혀 핀이 조금 어긋나면 테두리에
			//    색이 번지고, CRPC6 자신의 300% 잉크 상한도 넘어 인쇄소 preflight가 반려한다.
			//    Illustrator·InDesign도 「순수 검정 유지」로 같은 일을 한다.
			// ponytail: #000000만 잡는다. 근접 검정(#0a0a0a·#1a1a1a)도 같은 307.5%로 클리핑되지만
			//    「어디까지 검정으로 볼 것인가」는 임계값 결정이라 사용자 몫이다.
			if (key === '#000000') return [key, { c: 0, m: 0, y: 0, k: 1 }] as const
			return [
				key,
				{
					// 🔴 raw CMYK는 잉크량 그대로다(0 = 잉크 없음). JPEG로 나갈 때의 Adobe 반전
					//    관례와 다르므로 뒤집지 않는다 — 2026-08-27 실측: 흰색이 0,0,0,0으로 나온다.
					c: converted[index * 4] / 255,
					m: converted[index * 4 + 1] / 255,
					y: converted[index * 4 + 2] / 255,
					k: converted[index * 4 + 3] / 255,
				},
			] as const
		}),
	)
}
