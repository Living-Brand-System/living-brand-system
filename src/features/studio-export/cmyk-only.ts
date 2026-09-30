import { inflateSync } from 'node:zlib'
import { PDFArray, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib'

/**
 * 만들어진 PDF에 CMYK 아닌 색이 남았는지 찾는다. 비어 있으면 파일 전체가 CMYK 하나다.
 *
 * 🔴 이 검사가 있는 이유: 색 하나만 RGB로 남아도 Illustrator가 「RGB·CMYK 혼재」로 열고 문서
 *    모드를 하나 골라 나머지를 변환한다 — 그러면 **도형의 정본 CMYK 수치가 통째로 깨진다**
 *    (2026-09-09 실측). 상류 분기 하나하나를 믿는 대신 출구에서 한 번 본다.
 * 🔑 색이 들어오는 길이 둘이라 둘 다 본다 — 도형은 content stream의 연산자(`rg`·`g`)로,
 *    사진은 XObject의 `/ColorSpace`로 들어간다. 하나만 보면 나머지가 조용히 통과한다.
 * 🔴 도형은 페이지에만 있지 않다. 묶음은 **Form XObject** 안에서 그려지므로 그 스트림도 같은
 *    규칙으로 본다 — 페이지만 보면 판의 도형 대부분이 검사 밖에 남는다.
 */
export async function findNonCmykColors(pdf: Buffer): Promise<string[]> {
	// 🔴 Buffer를 그대로 넘기지 않는다. pdf-lib은 `instanceof Uint8Array`로 입력을 검사하는데,
	//    node Buffer는 다른 realm(테스트의 jsdom 등)에서 그 검사를 통과하지 못해 타입 오류로
	//    죽는다. 뷰로 감싸면 복사 없이 이 모듈의 realm에 맞춰진다.
	const doc = await PDFDocument.load(new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength))
	const problems: string[] = []

	for (const [index, page] of doc.getPages().entries()) {
		const contents = page.node.get(PDFName.of('Contents'))
		const resolved = doc.context.lookup(contents)
		const refs = resolved instanceof PDFArray ? resolved.asArray() : [contents]
		let content = ''
		for (const ref of refs) {
			const stream = doc.context.lookup(ref)
			if (stream instanceof PDFRawStream) content += `${decode(stream)}\n`
		}
		problems.push(...nonCmykShapes(content, `${index + 1}쪽`))
	}

	for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
		if (!(object instanceof PDFRawStream)) continue
		const subtype = String(object.dict.get(PDFName.of('Subtype')))
		if (subtype === '/Form') {
			problems.push(...nonCmykShapes(decode(object), `form ${ref.objectNumber}번`))
			continue
		}
		if (subtype !== '/Image') continue
		const colorSpace = object.dict.get(PDFName.of('ColorSpace'))
		const space = String(colorSpace)
		if (/DeviceRGB|Indexed|CalRGB|CalGray/.test(space))
			problems.push(`이미지 색 공간이 CMYK가 아니다: ${space.replace(/\s+/g, ' ')}`)
		// 🔴 `[/ICCBased ref]`라는 것만으로는 CMYK가 아니다 — 채널 수는 프로파일 스트림의 `/N`이
		//    갖는다. 이름만 보고 통과시키면 RGB 프로파일(N=3)을 단 이미지가 검사를 지난다.
		if (colorSpace instanceof PDFArray && String(colorSpace.get(0)) === '/ICCBased') {
			const profile = doc.context.lookup(colorSpace.get(1))
			const channels =
				profile instanceof PDFRawStream ? String(profile.dict.get(PDFName.of('N'))) : '없음'
			if (channels !== '4')
				problems.push(`이미지 ICC 프로파일이 4채널이 아니다: N=${channels}`)
		}
		// 🔴 알파 마스크(`/SMask`)는 DeviceGray가 정상이다 — 색이 아니라 투명도를 싣는다.
		if (/DeviceGray/.test(space) && !isSoftMask(doc, object))
			problems.push(`이미지 색 공간이 CMYK가 아니다: ${space.replace(/\s+/g, ' ')}`)
		// 🔴 CMYK를 JPEG으로 실으면 APP14 Adobe 반전 관례가 딸려와 `/Decode` 선언 하나에 색이
		//    뒤집힌다(2026-09-09 실물). 그 표현을 쓰지 않기로 정했으므로 여기서 집행한다 —
		//    결정을 주석에만 두면 다음 사람이 되살린다.
		if (String(object.dict.get(PDFName.of('Filter'))).includes('DCTDecode'))
			problems.push('CMYK 이미지를 JPEG(DCTDecode)으로 실었다 — 잉크 샘플로 실어야 한다')
	}

	return problems
}

/**
 * content stream에 남은 RGB·회색조 도형. 페이지든 form이든 같은 규칙으로 본다.
 * 연산자는 공백으로 끊긴 토큰이다 — `gs`·`RG`가 서로 섞이지 않게 경계를 함께 본다.
 */
function nonCmykShapes(content: string, where: string): string[] {
	const rgb = (content.match(/(?:^|\s)(?:rg|RG)(?:\s|$)/g) ?? []).length
	const gray = (content.match(/(?:^|\s)(?:g|G)(?:\s|$)/g) ?? []).length
	return [
		...(rgb > 0 ? [`${where}: RGB 도형 ${rgb}개`] : []),
		...(gray > 0 ? [`${where}: 회색조 도형 ${gray}개`] : []),
	]
}

/** 이 스트림이 다른 이미지의 알파 마스크인가. 마스크는 DeviceGray가 정상이다. */
function isSoftMask(doc: PDFDocument, candidate: PDFRawStream): boolean {
	for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
		if (!(object instanceof PDFRawStream)) continue
		const mask = object.dict.get(PDFName.of('SMask'))
		if (mask && doc.context.lookup(mask) === candidate) return Boolean(ref)
	}
	return false
}

/** flate 스트림을 펼친다. 압축이 아니면 원본 바이트를 그대로 읽는다. */
function decode(stream: PDFRawStream): string {
	const bytes = Buffer.from(stream.contents)
	try {
		return inflateSync(bytes).toString('latin1')
	} catch {
		return bytes.toString('latin1')
	}
}
