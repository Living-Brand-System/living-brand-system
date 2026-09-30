import sharp from 'sharp'
import { MAX_PRINT_PIXELS } from '../print-policy'

/**
 * PDF에 그대로 실을 수 있는 CMYK 잉크 샘플. 컨테이너가 아니라 **바이트**다.
 * `cmyk`는 행 우선 4채널이고 `0 = 잉크 없음`이다(패딩·프리멀티플라이 없음).
 */
export type CmykSamples = {
	width: number
	height: number
	cmyk: Buffer
	/** 8bit 알파. 불투명한 이미지에는 없다. */
	alpha?: Buffer
}

const DATA_URL = /^data:image\/(?:png|jpeg|jpg);base64,(.+)$/

/**
 * 이미지를 CMYK 잉크 샘플로 바꾼다. **컨테이너를 만들지 않는다.**
 *
 * 🔴 CMYK를 JPEG으로 운반하면 libjpeg이 APP14 Adobe 마커를 붙이고 샘플을 반전해 저장하는데, PDF
 *    리더는 그 마커를 읽지 않아 `/Decode [1 0 …]`로 되뒤집어야 한다. 그 선언 한 줄이 지워지면
 *    초록이 검정으로 열린다(2026-09-09 실물). 그래서 반전 관례가 **존재할 수 없는** raw 샘플로 낸다.
 * 🔴 sharp는 CMYK raw를 **되먹일 수 없다** — 4채널 입력을 RGBA로 추정해 바이트가 깨진다(실측).
 *    즉 우리가 통제한 샘플로 CMYK JPEG을 만들 길이 애초에 없다. 이것이 raw를 고른 이유다.
 * 🔑 알파는 `withIccProfile` 하나로 5번째 채널에 그대로 살아 나온다(프리멀티플라이 없음, 실측).
 *    따로 떼어 합칠 필요가 없다 — PDF의 `/SMask`가 그 바이트를 그대로 받는다.
 */
export async function imageToCmykSamples(href: string, icc: string): Promise<CmykSamples | null> {
	const match = href.match(DATA_URL)
	if (!match) return null
	// 🔴 sharp는 디코드 실패와 픽셀 상한 초과를 **던진다**. 밖으로 새면 라우트가 500을 내는데
	//    이건 서버 결함이 아니라 입력 문제다 — 호출부가 이미 「못 바꾼 이미지」를 422로 거부하고
	//    사람이 읽을 문구를 띄우므로 여기서 null로 합류시킨다.
	try {
		return await convert(Buffer.from(match[1], 'base64'), icc)
	} catch {
		return null
	}
}

async function convert(input: Buffer, icc: string): Promise<CmykSamples | null> {
	const { hasAlpha } = await sharp(input, { limitInputPixels: MAX_PRINT_PIXELS }).metadata()
	// 🔴 `toColourspace('cmyk')`를 먼저 부르면 ICC가 그 CMYK를 또 변환한다(이중 변환). 실측:
	//    K가 3에서 32로 튄다. `withIccProfile`이 프로파일의 색 공간으로 한 번만 옮기게 둔다.
	const { data, info } = await sharp(input, { limitInputPixels: MAX_PRINT_PIXELS })
		.withIccProfile(icc)
		.raw()
		.toBuffer({ resolveWithObject: true })

	// 🔴 sharp는 ICC 변환 실패를 삼키고 경고만 남긴다 — 그러면 3·4채널 sRGB가 그대로 나오는데
	//    아래가 잉크로 취급하면 인쇄물이 엉뚱한 색으로 나간다. raw 출력의 `info.space`는 항상
	//    undefined라 채널 수로만 판정한다(실측). 알파가 있으면 **5**가 성공이다.
	const expected = hasAlpha ? 5 : 4
	if (info.channels !== expected) return null

	if (!hasAlpha) {
		return { cmyk: data, height: info.height, width: info.width }
	}

	// 5채널 통짜를 한 번에 가른다. `extractChannel('alpha')`로 다시 뽑아도 바이트가 완전히 같지만
	// 그러면 이미지를 두 번 디코드한다(실측으로 동일 확인).
	const pixels = info.width * info.height
	const cmyk = Buffer.alloc(pixels * 4)
	const alpha = Buffer.alloc(pixels)
	for (let index = 0; index < pixels; index += 1) {
		data.copy(cmyk, index * 4, index * 5, index * 5 + 4)
		alpha[index] = data[index * 5 + 4]
	}
	// 🔴 알파 채널이 있다는 것과 실제로 투명하다는 것은 다르다 — sharp의 `composite`는 불투명한
	//    입력에도 알파를 붙인다(실측). 전부 255면 아무것도 가리지 않는 `/SMask`를 싣는 셈이라
	//    바이트가 25% 늘고, 뷰어·RIP가 쓸데없이 투명 합성 경로를 탄다.
	return alpha.every((byte) => byte === 255)
		? { cmyk, height: info.height, width: info.width }
		: { alpha, cmyk, height: info.height, width: info.width }
}
