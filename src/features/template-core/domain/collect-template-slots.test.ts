import { describe, expect, it } from 'vitest'
import { convertFigmaNodeToHtml } from '@/features/template-import/utils/figma-node-to-html'
import {
	collectTemplateImageSlots,
	collectTemplateSlots,
	collectTemplateVectorSlots,
} from './collect-template-slots'

const editablePolicy = {
	policy: {
		access: 'editable' as const,
	},
}

const html = [
	'<div data-node-id="1:1" data-figma-type="FRAME" data-name="Card">',
	'<p data-node-id="2:1" data-figma-type="TEXT" data-name="Korean Name">홍길동</p>',
	'<p data-node-id="2:2" data-figma-type="TEXT" data-name="English Name">Hong Gildong</p>',
	'<img data-node-id="3:1" data-figma-type="VECTOR" data-name="Vector" src="/logo.svg">',
	'</div>',
].join('')

describe('collectTemplateSlots', () => {
	it('input이 있는 텍스트 노드만 문서 순서로 모은다', () => {
		const slots = collectTemplateSlots(html, {
			'2:2': { input: { label: '영문 이름', aiInstruction: '영문 이름만' } },
			'2:1': { input: {} },
		})

		expect(slots).toEqual([
			{ nodeId: '2:1', name: 'Korean Name', text: '홍길동', input: {}, ...editablePolicy },
			{
				nodeId: '2:2',
				name: 'English Name',
				text: 'Hong Gildong',
				input: { label: '영문 이름', aiInstruction: '영문 이름만' },
				...editablePolicy,
			},
		])
	})

	it('텍스트 노드가 아닌 노드의 input과 input 없는 오버라이드는 무시한다', () => {
		const slots = collectTemplateSlots(html, {
			'3:1': { input: { label: '벡터에 붙은 잘못된 스펙' } },
			'2:1': { text: '김철수' },
			'9:9': { input: {} }, // base에 없는 고아 노드
		})

		expect(slots).toEqual([])
	})

	it('compose 왕복으로 속성값에 raw > 가 남은 HTML에서도 이름·텍스트를 정확히 읽는다', () => {
		const composed =
			'<p data-node-id="2:1" data-name="A > B" style="width:100px;height:50px">hi</p>'

		expect(collectTemplateSlots(composed, { '2:1': { input: {} } })).toEqual([
			{ nodeId: '2:1', name: 'A > B', text: 'hi', input: {}, ...editablePolicy },
		])
	})

	it('imageInput 오버라이드는 텍스트 슬롯에 영향을 주지 않는다', () => {
		const slots = collectTemplateSlots(html, {
			'1:1': { imageInput: {} },
			'2:1': { input: {} },
		})

		expect(slots).toEqual([
			{ nodeId: '2:1', name: 'Korean Name', text: '홍길동', input: {}, ...editablePolicy },
		])
	})
})

describe('collectTemplateImageSlots', () => {
	it('imageInput이 있는 노드만 문서 순서로 모은다', () => {
		const slots = collectTemplateImageSlots(html, {
			'1:1': { imageInput: { profileId: 7 } },
		})

		expect(slots).toEqual([
			{
				nodeId: '1:1',
				name: 'Card',
				profileId: 7,
				transformEnabled: true,
				...editablePolicy,
			},
		])
	})

	it('profileId가 없으면 개방만 표시한다', () => {
		const slots = collectTemplateImageSlots(html, {
			'1:1': { imageInput: {} },
		})

		expect(slots).toEqual([
			{ nodeId: '1:1', name: 'Card', transformEnabled: true, ...editablePolicy },
		])
	})

	it('슬롯 요소 자신의 inline width/height(px)를 박스로 읽는다 — emit의 여러 줄 style 그대로', () => {
		const boxedHtml = [
			'<div data-node-id="1:1" data-figma-type="FRAME" data-name="Image Area" style="',
			'\tbox-sizing:border-box;',
			'\tmin-width:100px;',
			'\twidth:911.5px;',
			'\theight:492px;',
			'">',
			'<div data-node-id="1:2" data-image-carrier="" style="width:2000px;height:2000px;"></div>',
			'</div>',
		].join('\n')

		const slots = collectTemplateImageSlots(boxedHtml, { '1:1': { imageInput: {} } })

		expect(slots).toEqual([
			{
				nodeId: '1:1',
				name: 'Image Area',
				boxWidth: 911.5,
				boxHeight: 492,
				transformEnabled: true,
				...editablePolicy,
			},
		])
	})

	it('inline px 치수가 없으면 박스를 남기지 않는다', () => {
		const slots = collectTemplateImageSlots(
			'<div data-node-id="1:1" data-name="Fluid" style="width:100%;height:auto;"></div>',
			{ '1:1': { imageInput: {} } },
		)

		expect(slots).toEqual([
			{ nodeId: '1:1', name: 'Fluid', transformEnabled: true, ...editablePolicy },
		])
	})

	it('> 가 든 레이어 이름의 실제 emit 출력에서도 이름·텍스트·박스를 정확히 읽는다', () => {
		const { html: emitted } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'Root',
			type: 'FRAME',
			absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
			children: [
				{
					id: '2:1',
					name: 'Header > Title',
					type: 'TEXT',
					characters: '홍길동',
					absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 40 },
					style: { fontFamily: 'Inter', fontSize: 16 },
				},
				{
					id: '3:1',
					name: 'Image > Area',
					type: 'FRAME',
					clipsContent: true,
					absoluteBoundingBox: { x: 0, y: 100, width: 300, height: 150 },
				},
			],
		})

		expect(collectTemplateSlots(emitted, { '2:1': { input: {} } })).toEqual([
			{ nodeId: '2:1', name: 'Header > Title', text: '홍길동', input: {}, ...editablePolicy },
		])
		expect(collectTemplateImageSlots(emitted, { '3:1': { imageInput: {} } })).toEqual([
			{
				nodeId: '3:1',
				name: 'Image > Area',
				boxWidth: 300,
				boxHeight: 150,
				transformEnabled: true,
				...editablePolicy,
			},
		])
	})

	it('compose 왕복으로 속성값에 raw > 가 남은 HTML에서도 이름·박스를 정확히 읽는다', () => {
		const composed =
			'<div data-node-id="1:1" data-name="Image > Area" style="width:300px;height:150px"></div>'

		expect(collectTemplateImageSlots(composed, { '1:1': { imageInput: {} } })).toEqual([
			{
				nodeId: '1:1',
				name: 'Image > Area',
				boxWidth: 300,
				boxHeight: 150,
				transformEnabled: true,
				...editablePolicy,
			},
		])
	})

	it('텍스트 노드의 imageInput·고아 노드·imageInput 없는 오버라이드는 무시한다', () => {
		const slots = collectTemplateImageSlots(html, {
			'2:1': { imageInput: {} }, // 텍스트 노드에 붙은 잘못된 스펙
			'1:1': { backgroundImage: '/bg.png' },
			'9:9': { imageInput: {} }, // base에 없는 고아 노드
		})

		expect(slots).toEqual([])
	})
})

describe('Template 공통 Creator 레이어 정책', () => {
	it('명시 access가 legacy 슬롯 선언보다 우선하고 벡터에도 같은 정책을 적용한다', () => {
		expect(
			collectTemplateSlots(html, {
				'2:1': { input: {}, creator: { access: 'hidden' } },
			}),
		).toEqual([])
		expect(
			collectTemplateVectorSlots(html, {
				'3:1': {
					creator: { access: 'editable' },
					vectorColor: '#112233',
				},
			}),
		).toEqual([
			{
				nodeId: '3:1',
				name: 'Vector',
				color: '#112233',
				policy: { access: 'editable' },
			},
		])
	})
})
