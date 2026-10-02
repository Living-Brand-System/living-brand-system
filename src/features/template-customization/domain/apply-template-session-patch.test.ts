import { describe, expect, it, vi } from 'vitest'
import {
	applyTemplateSessionPatch,
	type TemplateSessionWriters,
} from './apply-template-session-patch'

/** 호출 순서를 한 줄로 보게 만드는 기록기 — 순서가 이 함수의 절반이라 순서를 직접 단정한다. */
function writers() {
	const calls: string[] = []
	const log =
		(label: string) =>
		(...args: unknown[]) => {
			calls.push(`${label}(${args.map((arg) => JSON.stringify(arg)).join(',')})`)
		}
	const session: TemplateSessionWriters = {
		text: {
			values: {},
			setValue: log('text.setValue'),
			color: null,
			setColor: log('text.setColor'),
			clippedSlotIds: new Set(),
		},
		images: {
			states: {},
			contracts: {},
			update: log('images.update'),
			updateFeature: log('images.updateFeature'),
			selectProfile: log('images.selectProfile'),
			selectSampleImage: log('images.selectSampleImage'),
			generate: vi.fn(),
		},
		vectors: { slots: [], colors: {}, setColor: log('vectors.setColor') },
		layers: {
			visibility: {},
			setVisible: log('layers.setVisible'),
			selectedKind: null,
			selectedId: null,
			select: log('layers.select'),
		},
		background: {
			state: {} as TemplateSessionWriters['background']['state'],
			contracts: [],
			featureBindings: {},
			graphicConfigs: [],
			graphicBindings: {},
			update: log('background.update'),
			setColor: log('background.setColor'),
			selectType: log('background.selectType'),
			updateFeature: log('background.updateFeature'),
			selectImageProfile: log('background.selectImageProfile'),
			selectSampleImage: log('background.selectSampleImage'),
			selectGraphicConfig: log('background.selectGraphicConfig'),
			updateGraphic: log('background.updateGraphic'),
			generate: vi.fn(),
		},
	}
	return { session, calls }
}

describe('applyTemplateSessionPatch', () => {
	it('빈 패치는 세션을 건드리지 않는다', () => {
		const { session, calls } = writers()
		applyTemplateSessionPatch(session, {})
		expect(calls).toEqual([])
	})

	it('텍스트·색·벡터·표시여부를 세션의 setter로 흘린다', () => {
		const { session, calls } = writers()
		applyTemplateSessionPatch(session, {
			text: { t1: 'FUTURE', t2: 'BUILDERS' },
			textColor: '#ffffff',
			vectorColor: { logo: '#00af41' },
			visibility: { logo: false },
		})
		expect(calls).toEqual([
			'text.setValue("t1","FUTURE")',
			'text.setValue("t2","BUILDERS")',
			'text.setColor("#ffffff")',
			'vectors.setColor("logo","#00af41")',
			'layers.setVisible("logo",false)',
		])
	})

	it('textColor는 null도 흘린다 — 저작 색으로 되돌리는 값이다', () => {
		const { session, calls } = writers()
		applyTemplateSessionPatch(session, { textColor: null })
		expect(calls).toEqual(['text.setColor(null)'])
	})

	it('🔴 이미지 슬롯은 프로파일을 프롬프트보다 먼저 고른다 — 프롬프트가 현재 계약으로 검증된다', () => {
		const { session, calls } = writers()
		applyTemplateSessionPatch(session, {
			images: { img: { prompt: '컨테이너선', profileId: 7, imageMode: 'generate' } },
		})
		expect(calls[0]).toBe('images.selectProfile("img",7)')
		expect(calls[1]).toBe('images.update("img",{"imageMode":"generate","prompt":"컨테이너선"})')
	})

	it('이미지 featureValues는 프로파일 교체 뒤에 얹힌다 — 교체가 기본값을 갈아 끼운다', () => {
		const { session, calls } = writers()
		applyTemplateSessionPatch(session, {
			images: { img: { profileId: 7, featureValues: { lineColor: '#000000' } } },
		})
		expect(calls).toEqual([
			'images.selectProfile("img",7)',
			'images.updateFeature("img","lineColor","#000000")',
		])
	})

	it('값이 없으면 update를 부르지 않는다 — 빈 패치로 세션을 흔들지 않는다', () => {
		const { session, calls } = writers()
		applyTemplateSessionPatch(session, { images: { img: { profileId: 7 } } })
		expect(calls).toEqual(['images.selectProfile("img",7)'])
	})

	it('🔴 배경은 형식을 먼저 정한다 — 뒤의 값들이 그 형식에서만 뜻을 갖는다', () => {
		const { session, calls } = writers()
		applyTemplateSessionPatch(session, {
			background: {
				prompt: '항구 야경',
				profileId: 11,
				type: 'image',
				imageMode: 'generate',
				dimmer: true,
				dimmerOpacity: 0.4,
			},
		})
		expect(calls[0]).toBe('background.selectType("image")')
		expect(calls[1]).toBe('background.selectImageProfile(11)')
		expect(calls[2]).toBe(
			'background.update({"imageMode":"generate","prompt":"항구 야경","dimmer":true,"dimmerOpacity":0.4})',
		)
	})

	it('그래픽 배경은 config을 값보다 먼저 고른다', () => {
		const { session, calls } = writers()
		applyTemplateSessionPatch(session, {
			background: { graphicValues: { perspectiveGamma: 2.5 }, graphicConfigId: 'forward' },
		})
		expect(calls).toEqual([
			'background.selectGraphicConfig("forward")',
			'background.updateGraphic("perspectiveGamma",2.5)',
		])
	})

	it('배경 색의 null도 흘린다', () => {
		const { session, calls } = writers()
		applyTemplateSessionPatch(session, { background: { color: null } })
		expect(calls).toEqual(['background.setColor(null)'])
	})

	it('생성은 부르지 않는다 — 비동기이고 사용자가 누르는 동작이다', () => {
		const { session } = writers()
		applyTemplateSessionPatch(session, {
			images: { img: { profileId: 7, prompt: 'x' } },
			background: { type: 'image', profileId: 11, prompt: 'y' },
		})
		expect(session.images.generate).not.toHaveBeenCalled()
		expect(session.background.generate).not.toHaveBeenCalled()
	})
})
