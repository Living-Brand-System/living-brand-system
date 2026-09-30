import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplateLayerEditor } from './template-layer-editors'
import {
	canAssignImage,
	type LayerRow,
	parseLayers,
	pruneCarrierChildImageKeys,
	toggleAllowedId,
} from './template-layers'
import { TemplateLayersField } from './template-layers-field'

const payloadForm = vi.hoisted(() => ({
	dispatchFields: vi.fn(),
	fields: {} as Record<string, { value?: unknown }>,
	setModified: vi.fn(),
}))

// Payload Admin 런타임은 스텁하고 순수 레이어 규칙과 폼 커밋 계약만 검증한다.
vi.mock('@payloadcms/ui', () => ({
	Popup: ({ render }: { render: (props: { close: () => void }) => ReactNode }) =>
		render({ close: vi.fn() }),
	toast: { error: vi.fn() },
	useForm: () => ({
		dispatchFields: payloadForm.dispatchFields,
		setModified: payloadForm.setModified,
	}),
	useFormFields: (select: (state: [typeof payloadForm.fields]) => unknown) =>
		select([payloadForm.fields]),
}))

vi.mock('dialkit', () => ({
	useDialKit: () => ({ canvasHeight: 560, layerWidth: 260, workspaceGap: 16 }),
}))

const imageLayer: LayerRow = {
	id: 'image',
	depth: 1,
	name: 'Image',
	figmaType: 'RECTANGLE',
	tag: 'div',
	isText: false,
	isVector: false,
	imageAddress: 'self',
	text: '',
}

beforeEach(() => {
	payloadForm.dispatchFields.mockReset()
	payloadForm.setModified.mockReset()
	for (const key of Object.keys(payloadForm.fields)) delete payloadForm.fields[key]
})

afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
})

describe('parseLayers', () => {
	it('compose가 만든 -colorize 합성 오버레이 레이어를 숨긴다', () => {
		const rows = parseLayers(
			'<div data-node-id="1:1" data-figma-type="FRAME"><div data-node-id="1:1-colorize"></div></div>',
		)
		expect(rows.map((row) => row.id)).toEqual(['1:1'])
	})

	it('주소가 프레임이면 carrierChildId에 해석된 캐리어 자식을 담는다', () => {
		const rows = parseLayers(
			'<div data-node-id="root">' +
				'<div data-node-id="clip" style="overflow:hidden">' +
				'<div data-node-id="clip-child" data-image-carrier=""></div>' +
				'</div>' +
				'</div>',
		)
		const byId = new Map(rows.map((row) => [row.id, row]))
		expect(byId.get('clip')?.carrierChildId).toBe('clip-child')
		expect(byId.get('clip-child')?.imageAddress).toBe('parent')
	})

	it('<p>만 텍스트 편집 대상으로 textContent를 담는다', () => {
		const rows = parseLayers('<p data-node-id="t" data-figma-type="TEXT">안녕</p>')
		expect(rows[0]).toMatchObject({ isText: true, text: '안녕' })
	})
})

describe('canAssignImage — 주소 매트릭스', () => {
	it('배정 주소는 가시 창 하나 — 클립 프레임 또는 캐리어 자신, 둘 다는 아니다', () => {
		const rows = parseLayers(
			'<div data-node-id="root">' +
				// 클립 프레임 + 마킹 자식 1 → 주소는 프레임, 자식은 숨김.
				'<div data-node-id="clip" style="overflow:hidden">' +
				'<div data-node-id="clip-child" data-image-carrier=""></div>' +
				'</div>' +
				// 스탠드얼론 캐리어 → 자신이 주소.
				'<div data-node-id="standalone" data-image-carrier=""></div>' +
				// 비클립 GROUP 부모 → 부모는 주소가 아니고 마킹 자식이 주소.
				'<div data-node-id="group" data-figma-type="GROUP">' +
				'<div data-node-id="group-child" data-image-carrier=""></div>' +
				'</div>' +
				// 형제 캐리어 2개 → 프레임은 주소가 아니고 각 자식이 자기 주소.
				'<div data-node-id="twins" style="overflow:hidden">' +
				'<div data-node-id="twin-a" data-image-carrier=""></div>' +
				'<div data-node-id="twin-b" data-image-carrier=""></div>' +
				'</div>' +
				'</div>' +
				// 루트 클립 프레임은 주소가 될 수 없다(캔버스) — 캐리어 자식이 주소.
				'<div data-node-id="root-clip" style="overflow:hidden">' +
				'<div data-node-id="root-clip-child" data-image-carrier=""></div>' +
				'</div>' +
				'<p data-node-id="text" data-figma-type="TEXT">텍스트</p>' +
				'<img data-node-id="vector" data-figma-type="VECTOR">' +
				'<img data-node-id="polygon" data-figma-type="POLYGON">',
		)
		const byId = new Map(rows.map((row) => [row.id, row]))
		const allows = (id: string) => canAssignImage(byId.get(id) as (typeof rows)[number])

		expect(allows('clip')).toBe(true)
		expect(allows('clip-child')).toBe(false)
		expect(allows('standalone')).toBe(true)
		expect(allows('group')).toBe(false)
		expect(allows('group-child')).toBe(true)
		expect(allows('twins')).toBe(false)
		expect(allows('twin-a')).toBe(true)
		expect(allows('twin-b')).toBe(true)
		expect(allows('root-clip')).toBe(false)
		expect(allows('root-clip-child')).toBe(true)
		expect(allows('text')).toBe(false)
		expect(allows('vector')).toBe(false)
		expect(allows('polygon')).toBe(false)
		expect(byId.get('polygon')?.isVector).toBe(true)
	})
})

describe('pruneCarrierChildImageKeys', () => {
	it('프레임 주소에 이미지 커밋 시 캐리어 자식의 이미지 키만 제거한다', () => {
		expect(
			pruneCarrierChildImageKeys(
				{
					child: {
						backgroundImage: '/old.png',
						imageTransform: { x: 1, y: 2, scale: 1, rotate: 0 },
						text: '유지',
					},
				},
				'child',
				{ backgroundImage: '/new.png' },
			),
		).toEqual({ child: { text: '유지' } })
	})

	it('정리 후 빈 엔트리가 되면 키째 삭제한다', () => {
		const next = pruneCarrierChildImageKeys(
			{ child: { imageColorize: { line: '#112233' } } },
			'child',
			{ imageColorize: { line: '#445566' } },
		)
		expect('child' in next).toBe(false)
	})

	it('자식 키에 이미지 필드가 없거나 이미지 커밋이 아니면 map을 그대로 돌려준다', () => {
		const map = { child: { text: '캡션' } }
		// 이미지 키가 없는 patch(텍스트 커밋)는 아무것도 지우지 않는다.
		expect(pruneCarrierChildImageKeys(map, 'child', { text: '새 텍스트' })).toBe(map)
		// childId 없음(프레임 주소가 아님) — 그대로.
		expect(pruneCarrierChildImageKeys(map, undefined, { backgroundImage: '/x.png' })).toBe(map)
	})
})

describe('toggleAllowedId', () => {
	it('보이는 목록에 없는 저장값은 세지 않는다 — 미발행 프로파일이 섞여도 끄면 undefined로 넓어지지 않는다', () => {
		// 화면 목록은 [3]인데 저장값은 [3, 4](4는 이후 미발행)다. 3을 끄면 4만 남아야
		// 하고, "보이는 것 전부를 켰다"로 오인해 undefined(전체 허용)가 되면 안 된다.
		expect(toggleAllowedId([3, 4], [3], 3)).toEqual([4])
	})

	it('보이는 목록을 전부 켜면 undefined로 접힌다', () => {
		expect(toggleAllowedId([4], [3, 4], 3)).toBeUndefined()
	})
})

describe('TemplateLayersField 폼 계약', () => {
	it('이미지 슬롯은 발행 프로파일을 한 번 요청해 허용 토글로 그린다', async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ docs: [{ id: 3, name: 'Default' }] }),
			}),
		)
		vi.stubGlobal('fetch', fetchMock)

		render(
			createElement(TemplateLayerEditor, {
				selected: imageLayer,
				config: { imageInput: {} },
				onCommit: vi.fn(),
			}),
		)

		const toggle = await screen.findByRole('radiogroup', { name: 'Default 허용' })
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(within(toggle).getByRole('radio', { name: 'On' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
	})

	it('선택 레이어 편집을 overrides와 합성 html에 커밋하고 폼을 modified로 표시한다', () => {
		const baseHtml = '<p data-node-id="text" data-name="제목">기존</p>'
		Object.assign(payloadForm.fields, {
			html: { value: baseHtml },
			baseHtml: { value: baseHtml },
			overrides: { value: {} },
			width: { value: 320 },
			height: { value: 180 },
		})
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe() {}
				disconnect() {}
			},
		)

		render(createElement(TemplateLayersField))
		// 🔴 이름 끝으로 맞춘다 — 겹침 순서 손잡이가 `제목 위로`/`제목 아래로`로 같이 걸린다.
		fireEvent.click(screen.getByRole('button', { name: /제목$/ }))
		fireEvent.change(screen.getByLabelText('내용'), {
			target: { value: '변경' },
		})

		expect(payloadForm.dispatchFields).toHaveBeenNthCalledWith(1, {
			type: 'UPDATE',
			path: 'overrides',
			value: { text: { text: '변경' } },
		})
		expect(payloadForm.dispatchFields.mock.calls[1]?.[0]).toMatchObject({
			type: 'UPDATE',
			path: 'html',
		})
		expect(payloadForm.dispatchFields.mock.calls[1]?.[0].value).toContain('변경')
		expect(payloadForm.setModified).toHaveBeenCalledWith(true)
	})
})
