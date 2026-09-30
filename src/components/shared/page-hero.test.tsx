import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import flutedGlassManifest, {
	FLUTED_GLASS_SHAPE_INPUTS,
} from '@/features/graphic-generation/graphic-runtimes/fluted-glass/definition'
import { toFlutedGlassInput } from '@/features/graphic-generation/graphic-runtimes/fluted-glass/model'
import type { ControllerValues } from '@/modules/studio-controller/controller-definition'
import { PageHero } from './page-hero'

const mount = vi.fn((_options: { values: ControllerValues }) => ({
	update: () => {},
	resize: () => {},
	getViewport: () => ({ width: 0, height: 0 }),
	artifacts: {},
	destroy: () => {},
}))

vi.mock('@/features/graphic-generation/graphic-runtimes/catalog/runtime.generated.client', () => ({
	graphicRuntimeCatalog: {
		'fluted-glass': () => Promise.resolve({ type: 'shader', mount }),
	},
}))

// jsdom에는 둘 다 없다. PageHero는 모션 감소 확인과 리사이즈 관찰에 이것들을 쓴다.
vi.stubGlobal('matchMedia', () => ({ matches: false }))
vi.stubGlobal(
	'ResizeObserver',
	class {
		observe() {}
		disconnect() {}
	},
)

afterEach(() => {
	cleanup()
	mount.mockClear()
})

describe('PageHero', () => {
	it('런타임 manifest 기본값을 채워 mount한다', async () => {
		await act(async () => {
			render(<PageHero runtimeId={flutedGlassManifest.id} fallbackSrc="/hero.png" />)
		})

		const values = mount.mock.lastCall?.[0].values ?? {}
		// 빈 객체를 넘기면 shader 입력 검증이 전부 undefined로 터진다.
		expect(toFlutedGlassInput(values).shape).toBe('sweep')
	})

	// 히어로마다 다른 모양을 쓴다(어드민은 방사, 가이드라인 메인은 가로) — 이 통로가 막히면 둘이 같아진다.
	it('넘긴 값이 런타임 기본값을 덮는다', async () => {
		await act(async () => {
			render(
				<PageHero
					runtimeId={flutedGlassManifest.id}
					values={{ shape: 'linear' }}
					fallbackSrc="/hero.png"
				/>,
			)
		})

		const resolved = toFlutedGlassInput(mount.mock.lastCall?.[0].values ?? {})
		expect(resolved.shape).toBe('linear')
		expect(resolved.input.rayRotation).toBe(FLUTED_GLASS_SHAPE_INPUTS.linear.rayRotation)
	})
})
