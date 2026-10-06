import { expect, it } from 'vitest'
import { graphicStudioPlugins } from '../graphic-runtimes/catalog/model.generated'
import {
	initialPlaygroundGraphics,
	playgroundGraphicColors,
	updatePlaygroundGraphic,
} from './playground-graphics'

it('벡터 4종의 미리보기·출력 모델에 같은 두 색을 전달하고 잘못된 색은 거부한다', () => {
	const initial = initialPlaygroundGraphics()
	for (const plugin of graphicStudioPlugins) {
		if (!('createVectorArtifact' in plugin)) continue
		const values = {
			...initial[plugin.manifest.id],
			...playgroundGraphicColors(plugin.manifest.id, '#123456', '#fedcba'),
		}
		const artifact = plugin.createVectorArtifact(values, { width: 600, height: 400 })
		expect(artifact.source.background).toBe('#fedcba')
		expect(artifact.source.primitives.length).toBeGreaterThan(0)
		expect(
			artifact.source.primitives.every(
				(primitive) =>
					('stroke' in primitive
						? primitive.stroke
						: 'fill' in primitive
							? primitive.fill
							: null) === '#123456',
			),
		).toBe(true)
		expect(() =>
			plugin.createVectorArtifact(
				{ ...values, ...playgroundGraphicColors(plugin.manifest.id, 'invalid', '#ffffff') },
				{ width: 600, height: 400 },
			),
		).toThrow()
	}
})

it('Pattern 프리셋은 이전 편집값을 버리고 기본값과 프리셋 값으로 교체한다', () => {
	const initial = initialPlaygroundGraphics()['key-visual-pattern']
	const edited = updatePlaygroundGraphic('key-visual-pattern', initial, 'columnGap', 22)
	const next = updatePlaygroundGraphic('key-visual-pattern', edited, 'preset', 'verticalDrift')
	expect(next).toMatchObject({
		columnGap: 14,
		rowGap: 14,
		direction: 'vertical',
		viewpoint: 'flat',
		maxWeight: 15,
	})
	expect(next.origin).toMatchObject({ x: expect.closeTo(-0.44), y: expect.closeTo(-0.12) })
	expect(initial.columnGap).toBe(30)
	const clamped = updatePlaygroundGraphic(
		'key-visual-pattern',
		{ ...next, minWeight: 8 },
		'maxWeight',
		3,
	)
	expect(clamped.minWeight).toBe(3)
})
