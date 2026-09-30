// @vitest-environment node
// 🔴 jsdom에서는 pdf-lib이 node Buffer를 자기 realm의 Uint8Array로 못 알아본다. 제품은 서버에서만
//    도는 경로라 이 파일만 node 환경으로 돈다.
import { inflateSync } from 'node:zlib'
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRawStream } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import type { VectorPrimitive, VectorScene } from '@/modules/studio-artifact/studio-artifact'
import { vectorSceneToPdf } from './vector-scene-to-pdf.pdf-lib'

const printOptions = {
	cmyk: {
		colors: new Map(),
		iccProfile: Buffer.alloc(0),
		iccProfileName: 'cgats21-crpc6',
		images: new Map(),
	},
	ppi: 150,
}

const box = (x: number): VectorPrimitive => ({
	fill: '#00AF41',
	height: 20,
	kind: 'rect',
	width: 20,
	x,
	y: 0,
})

/** 묶음 하나. 씬에서 `layer`를 다는 것은 워커이고 이름의 정본은 레이어 패널과 같다. */
const group = (layer: string, children: VectorPrimitive[]): VectorPrimitive => ({
	children,
	kind: 'group',
	label: layer,
	layer,
})

/**
 * 실측 판 모양: 루트 프레임 하나가 묶음들을 감싼다. 루트 프레임은 슬롯이 아니므로 배경 묶음이고,
 * 그래서 그것이 직접 그리는 칠(판 바닥)도 배경에 든다.
 */
function plate(children: VectorPrimitive[]): VectorScene {
	return {
		height: 100,
		primitives: [{ children, kind: 'group', label: 'Poster', layer: 'Background' }],
		width: 200,
	}
}

async function load(pdf: Buffer) {
	return PDFDocument.load(new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength))
}

function decode(stream: PDFRawStream): string {
	const bytes = Buffer.from(stream.contents)
	try {
		return inflateSync(bytes).toString('latin1')
	} catch {
		return bytes.toString('latin1')
	}
}

function pageContent(doc: PDFDocument): string {
	const node = doc.getPage(0).node
	const contents = doc.context.lookup(node.get(PDFName.of('Contents')))
	const refs =
		contents instanceof PDFArray ? contents.asArray() : [node.get(PDFName.of('Contents'))]
	return refs
		.map((ref) => {
			const found = doc.context.lookup(ref)
			return found instanceof PDFRawStream ? decode(found) : ''
		})
		.join('\n')
}

/**
 * 페이지가 **부른 순서대로** form을 따라간다. 오브젝트 목록을 훑으면 순서가 파일 배치를 따라가므로
 * 겹침 순서를 볼 수 없다 — 겹침 순서는 페이지 스트림의 `Do` 순서가 갖는다.
 */
async function drawnForms(pdf: Buffer) {
	const doc = await load(pdf)
	const xObjects = doc
		.getPage(0)
		.node.normalizedEntries()
		.Resources.lookup(PDFName.of('XObject'), PDFDict)
	// 🔴 pdf-lib의 XObject 키에는 `-`가 섞인다(`Layer-7098480789`) — `\w`만으로는 안 잡힌다.
	return Array.from(pageContent(doc).matchAll(/\/([\w-]+) Do/g)).map((match) => {
		const stream = doc.context.lookup(xObjects.get(PDFName.of(match[1])))
		if (!(stream instanceof PDFRawStream)) throw new Error(`form을 못 찾았다: ${match[1]}`)
		return {
			bbox: String(stream.dict.get(PDFName.of('BBox'))),
			content: decode(stream),
			subtype: String(stream.dict.get(PDFName.of('Subtype'))),
		}
	})
}

/** OCG 이름을 카탈로그 순서(`Order`)로 되읽는다. 한글이 깨지면 여기서 드러난다. */
async function layerNames(pdf: Buffer): Promise<string[]> {
	const doc = await load(pdf)
	const properties = doc.catalog.lookup(PDFName.of('OCProperties'), PDFDict)
	if (!properties) return []
	const ocgs = properties.lookup(PDFName.of('OCGs'), PDFArray)
	return ocgs.asArray().map((ref) => {
		const raw = doc.context.lookup(ref, PDFDict).get(PDFName.of('Name'))
		return raw instanceof PDFHexString ? raw.decodeText() : String(raw)
	})
}

/**
 * 🔴 Illustrator는 PDF에서 **Form XObject 하나를 그룹 하나로** 연다(2026-09-11 실측: form에 담은
 * 사각형 3개는 `<클립 그룹>` 1개, form 없이 그린 3개는 `<패스>` 3개). 그래서 묶음
 * (text·image·CI·background)을 form으로 싣는다 — 디자이너는 열어서 `Release to Layers`를 한 번
 * 누르면 레이어가 된다. OCG는 Illustrator가 읽지 않지만 Acrobat·Affinity가 읽으므로 함께 남긴다.
 */
describe('벡터 PDF의 묶음(Form XObject)', () => {
	it('묶음 하나가 form 하나가 되고 판 전체 BBox를 갖는다', async () => {
		const pdf = await vectorSceneToPdf(
			plate([
				// 루트 프레임 자신의 칠 — 슬롯이 아니므로 배경 묶음이다.
				box(0),
				group('Image', [box(30)]),
				group('CI', [box(60)]),
				// 이웃한 같은 묶음은 한 form에 모인다 — 사이에 낀 것이 없으므로 순서가 안 바뀐다.
				group('Text', [box(90)]),
				group('Text', [box(120)]),
			]),
			printOptions,
		)

		const forms = await drawnForms(pdf)

		expect(forms).toHaveLength(4)
		expect(forms.every((form) => form.subtype === '/Form')).toBe(true)
		// 🔴 BBox를 묶음의 실제 bbox로 좁히면 Illustrator가 그것을 클리핑 마스크로 만들어 내용을 자른다.
		expect(forms.every((form) => form.bbox === '[ 0 0 200 100 ]')).toBe(true)
		expect(await layerNames(pdf)).toEqual(['Background', 'Image', 'CI', 'Text'])
	})

	/**
	 * 🔴 겹침 순서 정본은 DOM 순서다. 떨어져 있는 같은 묶음을 한 form으로 모으면 그 사이에 낀
	 * 요소와 위아래가 뒤집힌다 — 실측 12판 중 `Poster 2`가 텍스트를 CI 앞뒤로 갖는다.
	 */
	it('떨어져 있는 같은 묶음을 합치지 않는다 — 순서가 뒤집히기 때문', async () => {
		const pdf = await vectorSceneToPdf(
			plate([group('Text', [box(0)]), group('CI', [box(30)]), group('Text', [box(60)])]),
			printOptions,
		)

		const forms = await drawnForms(pdf)

		expect(forms).toHaveLength(3)
		// y는 뒤집혀 100 - 0 - 20 = 80이다. x로 어느 사각형인지 가른다.
		expect(forms.map((form) => form.content.match(/1 0 0 1 (\d+) 80 cm/)?.[1])).toEqual([
			'0',
			'30',
			'60',
		])
		// 🔴 같은 이름에 OCG를 두 번 만들지 않는다 — 「이름 정본이 하나」라는 계약이 깨진다.
		expect(await layerNames(pdf)).toEqual(['Text', 'CI'])
	})

	/** form 안에 넣은 것을 페이지에도 그리면 같은 그림이 두 겹으로 인쇄된다. */
	it('묶음의 내용이 페이지 스트림에 남지 않는다', async () => {
		const pdf = await vectorSceneToPdf(plate([group('CI', [box(30)])]), printOptions)

		expect(pageContent(await load(pdf))).not.toContain('1 0 0 1 30 80 cm')
	})

	/**
	 * 🔴 이름은 `PDFHexString.fromText`여야 한다. `PDFName`·`PDFString`은 한글을 깨뜨리는데
	 * 그 손상은 **PDF를 열어 보지 않으면 안 보인다** — 도형은 정상이고 레이어 이름만 쓰레기가 된다.
	 */
	it('한글 묶음 이름이 온전히 실린다', async () => {
		const pdf = await vectorSceneToPdf(
			plate([group('제목 한글 레이어', [box(0)])]),
			printOptions,
		)

		expect(await layerNames(pdf)).toEqual(['제목 한글 레이어'])
	})

	/** 🔴 BDC/EMC 짝은 우리가 맞춘다 — pdf-lib은 검사하지 않고, 깨지면 PDF 자체가 열리지 않는다. */
	it('BDC와 EMC가 짝을 맞춘다', async () => {
		const content = pageContent(
			await load(
				await vectorSceneToPdf(
					plate([group('Text', [box(0)]), group('CI', [box(30)])]),
					printOptions,
				),
			),
		)

		const begins = content.match(/\/OC \/MC\d+ BDC/g) ?? []
		const ends = content.match(/(?:^|\s)EMC(?:\s|$)/g) ?? []
		expect(begins).toHaveLength(2)
		expect(ends).toHaveLength(begins.length)
	})

	/** 🔴 이 키가 `g`·`G`면 출구 검사기(`cmyk-only`)가 회색조 연산자로 오탐한다. */
	it('Properties 키가 회색조 연산자로 오해되지 않는다', async () => {
		const pdf = await vectorSceneToPdf(plate([group('CI', [box(0)])]), printOptions)
		const doc = await load(pdf)
		const properties = doc
			.getPage(0)
			.node.normalizedEntries()
			.Resources.get(PDFName.of('Properties'))

		expect(String(properties)).toMatch(/MC0/)
		expect(String(properties)).not.toMatch(/\/[gG]\b/)
	})

	/** 묶음이 없는 씬(graphic 런타임)은 예전처럼 페이지에 바로 그린다 — 빈 껍데기를 만들지 않는다. */
	it('묶음이 없으면 form도 OCProperties도 만들지 않는다', async () => {
		const pdf = await vectorSceneToPdf(
			{ background: '#ffffff', height: 100, primitives: [box(0)], width: 200 },
			printOptions,
		)
		const doc = await load(pdf)

		expect(doc.catalog.get(PDFName.of('OCProperties'))).toBeUndefined()
		expect(await drawnForms(pdf)).toEqual([])
	})

	/** 임시 기록면이 파일에 남으면 인쇄소가 빈 페이지를 함께 받는다. */
	it('기록용 임시 페이지가 파일에 남지 않는다', async () => {
		const pdf = await vectorSceneToPdf(
			plate([group('Text', [box(0)]), group('CI', [box(30)])]),
			printOptions,
		)

		expect((await load(pdf)).getPageCount()).toBe(1)
	})

	/**
	 * 🔴 불투명도를 얹는 그룹은 펴지 않는다 — `q`/`Q` 래퍼가 자식과 떨어지면 40% 딤이 100%로
	 * 인쇄되거나 다음 묶음까지 흐려진다.
	 */
	it('반투명 그룹은 자기 묶음 안에서 q/Q를 유지한다', async () => {
		const pdf = await vectorSceneToPdf(
			plate([
				{ children: [box(0)], kind: 'group', label: 'Dim', layer: 'Text', opacity: 0.4 },
			]),
			printOptions,
		)

		const [form] = await drawnForms(pdf)

		expect(form.content).toMatch(/q\s+\/GS[\w-]+ gs/)
		expect(form.content.trimEnd().endsWith('Q')).toBe(true)
	})
})
