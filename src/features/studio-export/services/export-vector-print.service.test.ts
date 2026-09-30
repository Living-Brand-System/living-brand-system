import { inflateSync } from 'node:zlib'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import type { VectorScene } from '@/modules/studio-artifact/studio-artifact'
import { findNonCmykColors } from '../cmyk-only'
import {
	exportVectorPrint,
	VectorPrintColorError,
	VectorPrintImageError,
	VectorPrintTextError,
} from './export-vector-print.service'

// 정본 조회는 Payload를 부팅하므로 repository를 세운다. HD HERITAGE GREEN에 ICC 계산값과 절대
// 겹치지 않는 잉크를 심어, 어느 쪽이 찍혔는지 바이트로 가를 수 있게 한다(계산값은 C76 M0 Y95 K1).
vi.mock('../repositories/brand-ink.payload.repository', () => ({
	listBrandInks: () =>
		Promise.resolve(new Map([['#00af41', { c: 0.5, k: 0.3, m: 0.1, y: 0.2 }]])),
}))

/** 압축된 content stream을 펼쳐 그리기 연산자를 읽는다. */
function contentStream(pdf: Buffer): string {
	const raw = pdf.toString('latin1')
	const streams: string[] = []
	for (
		let index = raw.indexOf('stream');
		index !== -1;
		index = raw.indexOf('stream', index + 6)
	) {
		const start = index + 'stream'.length + (raw[index + 6] === '\r' ? 2 : 1)
		const end = raw.indexOf('endstream', start)
		try {
			streams.push(
				inflateSync(Buffer.from(raw.slice(start, end), 'latin1')).toString('latin1'),
			)
		} catch {
			// 이미지처럼 flate가 아닌 스트림은 건너뛴다.
		}
	}
	return streams.join('\n')
}

const scene = (primitives: VectorScene['primitives']): VectorScene => ({
	width: 100,
	height: 100,
	background: '#ffffff',
	primitives,
})

describe('exportVectorPrint', () => {
	/**
	 * 🔴 차단 케이스만 있으면 **전면 차단 회귀가 초록으로 통과한다** — 아무것도 못 만들게 되어도
	 * 「막혔다」는 단언은 계속 맞기 때문이다. 정상 씬이 실제로 바이트를 내는지 함께 잠근다.
	 */
	it('정상 씬은 PDF 바이트를 돌려준다', async () => {
		const pdf = await exportVectorPrint({
			ppi: 300,
			scene: scene([
				{ kind: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#00ad45' },
				{ kind: 'circle', cx: 20, cy: 20, radius: 10, fill: '#003087' },
			]),
		})

		expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
	})

	/**
	 * 🔴 브랜드 색이 정본 잉크로 찍히는지 잠근다. ICC 계산값은 정본과 최대 41%p 어긋나므로
	 * (2026-09-09 실측) 이 자리가 계산값으로 새면 인쇄물이 가이드라인과 다른 색으로 나간다.
	 * 잠그는 것은 결과다 — 필터든 Map 순서든 어느 쪽이 무너져도 이 단언이 걸린다.
	 */
	it('프로파일을 주면 브랜드 색을 정본 잉크로 찍는다', async () => {
		const content = contentStream(
			await exportVectorPrint({
				colorProfile: 'cgats21-crpc6',
				ppi: 300,
				scene: scene([
					{ kind: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#00AF41' },
				]),
			}),
		)

		expect(content).toContain('0.5 0.1 0.2 0.3 k')
	})

	/**
	 * 🔴 정본에 없는 색도 CMYK로 나가야 한다. RGB로 남으면 CMYK 출력의도를 단 파일 안에 관리되지
	 * 않은 색이 섞여, 인쇄소가 자기 기본값으로 추측해 변환한다.
	 */
	it('정본에 없는 색도 계산해서 CMYK로 찍는다', async () => {
		const content = contentStream(
			await exportVectorPrint({
				colorProfile: 'cgats21-crpc6',
				ppi: 300,
				scene: scene([
					{ kind: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#123456' },
				]),
			}),
		)

		expect(content).not.toContain(' rg\n')
		expect(content).toContain(' k\n')
	})

	/**
	 * 🔴 씬 계약은 `#rrggbb`를 약속하지만 `resolveColor`가 `#rgb`·`rgb(...)`도 관용적으로 받는다.
	 * 그 표기가 ICC 변환기의 hex 필터에서 탈락하면 **그 도형만 RGB로 나가 파일이 혼재가 되고**,
	 * Illustrator가 문서 모드를 하나 골라 나머지를 변환하면서 정본 CMYK 수치까지 깨진다.
	 */
	it.each([
		['#rgb 3자리 축약', '#f0a'],
		['rgb(...) 표기', 'rgb(200, 30, 40)'],
	])('%s도 CMYK로 찍는다 — RGB가 한 칸도 남지 않는다', async (_label, fill) => {
		const content = contentStream(
			await exportVectorPrint({
				colorProfile: 'cgats21-crpc6',
				ppi: 300,
				scene: scene([{ kind: 'rect', x: 0, y: 0, width: 50, height: 50, fill }]),
			}),
		)

		expect(content).not.toContain(' rg\n')
		expect(content).toContain(' k\n')
	})

	/** 🔴 정본은 표기가 축약이어도 이긴다 — 정규화한 hex로 찾지 않으면 계산값으로 새 나간다. */
	it('축약 표기로 적힌 브랜드 색도 정본 잉크로 찍는다', async () => {
		const content = contentStream(
			await exportVectorPrint({
				colorProfile: 'cgats21-crpc6',
				ppi: 300,
				// mock 정본의 `#00af41`을 `rgb()` 표기로 적었다. 같은 색이므로 정본 잉크가 나와야 한다.
				scene: scene([
					{ kind: 'rect', x: 0, y: 0, width: 50, height: 50, fill: 'rgb(0, 175, 65)' },
				]),
			}),
		)

		expect(content).toContain('0.5 0.1 0.2 0.3 k')
	})

	it('읽을 수 없는 색이 있으면 PDF를 만들지 않는다', async () => {
		await expect(
			exportVectorPrint({
				colorProfile: 'cgats21-crpc6',
				ppi: 300,
				scene: scene([{ kind: 'rect', x: 0, y: 0, width: 50, height: 50, fill: 'red' }]),
			}),
		).rejects.toBeInstanceOf(VectorPrintColorError)
	})

	/**
	 * 🔑 예전에는 투명 이미지가 내보내기를 **막았다** — CMYK JPEG이 알파를 구조적으로 못 담아서였다.
	 * 잉크 샘플 경로는 알파를 `/SMask`로 따로 싣기 때문에 그 제약이 사라졌다. 거부가 되살아나면
	 * 오려 낸 레이어가 든 판을 인쇄할 수 없게 되므로 여기서 「통과한다」를 잠근다.
	 */
	it('투명이 있는 이미지도 PDF로 나간다', async () => {
		// 2×2 반투명 PNG. 알파가 살아 있는 최소 입력이다.
		const png = await sharp({
			create: {
				background: { alpha: 0.5, b: 65, g: 175, r: 0 },
				channels: 4,
				height: 2,
				width: 2,
			},
		})
			.png()
			.toBuffer()
		const pdf = await exportVectorPrint({
			colorProfile: 'cgats21-crpc6',
			ppi: 300,
			scene: scene([
				{
					kind: 'image',
					x: 0,
					y: 0,
					width: 50,
					height: 50,
					href: `data:image/png;base64,${png.toString('base64')}`,
				},
			]),
		})

		expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
		// 알파가 버려지지 않았는지 — SMask가 없으면 오려 낸 자리가 불투명하게 인쇄된다.
		expect(await findNonCmykColors(pdf)).toEqual([])
		expect(pdf.toString('latin1')).toContain('SMask')
	})

	it('data URI가 아닌 이미지가 있으면 PDF를 만들지 않는다', async () => {
		await expect(
			exportVectorPrint({
				colorProfile: 'cgats21-crpc6',
				ppi: 300,
				scene: scene([
					{
						kind: 'image',
						x: 0,
						y: 0,
						width: 50,
						height: 50,
						href: '/api/media/file/x.png',
					},
				]),
			}),
		).rejects.toBeInstanceOf(VectorPrintImageError)
	})

	it('프로파일이 없으면 RGB로 낸다 — 안 준 판을 임의로 CMYK로 바꾸지 않는다', async () => {
		const content = contentStream(
			await exportVectorPrint({
				ppi: 300,
				scene: scene([
					{ kind: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#00AF41' },
				]),
			}),
		)

		expect(content).not.toContain(' k\n')
		expect(content).toContain(' rg\n')
	})

	/**
	 * 🔴 PDF 어댑터는 서체를 임베드하지 않는 계약이라 `text`를 아무것도 그리지 않고 넘어간다 —
	 * 막지 않으면 제목이 통째로 빠진 파일이 인쇄로 나간다. 리포의 템플릿 12개는 모두 아웃라인에
	 * 성공해서 화면으로는 이 경로를 밟을 수 없다. 그래서 여기서 잠근다.
	 */
	it('윤곽선으로 바꾸지 못한 글줄이 남아 있으면 PDF를 만들지 않는다', async () => {
		await expect(
			exportVectorPrint({
				ppi: 300,
				scene: scene([
					{
						kind: 'text',
						x: 0,
						y: 10,
						text: '빠질 제목',
						fontFamily: 'Pretendard',
						fontSize: 10,
						fill: '#000000',
					},
				]),
			}),
		).rejects.toThrow(VectorPrintTextError)
	})

	it('그룹 안에 숨은 글줄도 찾아낸다', async () => {
		await expect(
			exportVectorPrint({
				ppi: 300,
				scene: scene([
					{
						kind: 'group',
						children: [
							{
								kind: 'text',
								x: 0,
								y: 10,
								text: '빠질 제목',
								fontFamily: 'Pretendard',
								fontSize: 10,
								fill: '#000000',
							},
						],
					},
				]),
			}),
		).rejects.toThrow(VectorPrintTextError)
	})
})
