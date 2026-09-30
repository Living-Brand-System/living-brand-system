import sharp from 'sharp'
import type { PrintPpi } from '../print-policy'
import { MAX_PRINT_PIXELS } from '../print-policy'

/** PNG를 흰 배경의 CMYK TIFF로 변환하고 PPI와 ICC 프로파일을 첨부한다. */
export async function pngToCmykTiff(
	buffer: Buffer,
	ppi: PrintPpi,
	icc: string,
): Promise<Buffer | null> {
	try {
		// 🔴 `toColourspace('cmyk')`를 먼저 부르면 안 된다 — sharp가 자체 변환으로 CMYK를 만들고
		//    ICC 변환이 그 CMYK를 **또** 변환한다(이중 변환). 실측: HD 그린이 K2가 아니라 K11.8이
		//    되어 탁해지고, #000000과 #1a1a1a가 완전히 같은 잉크값이 되어 어두운 톤 구분이
		//    사라졌다. `withIccProfile`이 프로파일의 색 공간으로 한 번만 옮기게 둔다.
		// 🔑 이 TIFF는 사용자에게 그대로 나가므로 프로파일은 **첨부한다** — 붙은 프로파일이
		//    그 파일의 유일한 색 관리다(PDF 안으로 들어가는 JPEG과 반대다).
		const output = await sharp(buffer, { limitInputPixels: MAX_PRINT_PIXELS })
			.flatten({ background: '#ffffff' })
			.withMetadata({ density: ppi })
			.withIccProfile(icc)
			.tiff({ compression: 'lzw' })
			.toBuffer()
		// 🔴 sharp는 ICC 변환 실패를 삼키고 경고만 남긴다 — 그러면 sRGB가 그대로 나오는데 호출부는
		//    CMYK를 가정해 `/N 4` ICCBased를 씌운다(일러스트레이터가 못 여는 파일). 인쇄물은 되돌릴 수
		//    없으니 확인한다. `toBuffer`의 `info.channels`는 jpeg·tiff에서 3을 보고해 쓸 수 없다 —
		//    `metadata()`는 헤더만 읽고 space를 정확히 답한다.
		return (await sharp(output).metadata()).space === 'cmyk' ? output : null
	} catch {
		return null
	}
}
