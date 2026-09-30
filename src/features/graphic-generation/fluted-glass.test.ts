import { describe, expect, it } from 'vitest'
import flutedGlassRuntimeManifest, {
	FLUTED_GLASS_PALETTES,
	FLUTED_GLASS_SHAPE_INPUTS,
	FLUTED_GLASS_SHAPES,
	FLUTED_GLASS_SOURCE_SPAN,
	FLUTED_GLASS_STYLE_IDS,
	FLUTED_GLASS_STYLES,
} from '@/features/graphic-generation/graphic-runtimes/fluted-glass/definition'
import {
	flutedGlassColorToRgb,
	flutedGlassDistortionShapeToUniform,
	toFlutedGlassInput,
	toFlutedGlassShaderPoint,
} from '@/features/graphic-generation/graphic-runtimes/fluted-glass/model'
import {
	type ControllerGroupDefinition,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'

const SHADER_DIR = 'src/features/graphic-generation/graphic-runtimes/fluted-glass'

describe('flutedGlass', () => {
	const groups: readonly ControllerGroupDefinition[] =
		flutedGlassRuntimeManifest.controller.groups
	const controls = groups.flatMap((group) => group.controls)
	const defaults = () => createControllerValues(groups)

	it('네 모양을 셰이더 묶음 둘로 나눠 그린다', () => {
		expect(FLUTED_GLASS_SHAPES).toEqual(['linear', 'vertical', 'sweep', 'radial'])
		for (const shape of FLUTED_GLASS_SHAPES) {
			const resolved = toFlutedGlassInput({ ...defaults(), shape })
			expect(resolved.shape, shape).toBe(shape)
			expect(resolved.family, shape).toBe(shape === 'vertical' ? 'linear' : shape)
		}
	})

	it('모양이 자기 기하를 정한다 — 가로는 눕고 세로는 선다', () => {
		const linear = toFlutedGlassInput({ ...defaults(), shape: 'linear' }).input
		const vertical = toFlutedGlassInput({ ...defaults(), shape: 'vertical' }).input
		expect(linear.rayRotation).toBe(0)
		expect(linear.glassAngle).toBe(0)
		expect(vertical.rayRotation).toBe(-90)
		expect(vertical.glassAngle).toBe(90)
	})

	it('방사는 광선 밭이 돌지 않는다 — 스윕 속도 0이 그 뜻이다', () => {
		const radial = toFlutedGlassInput({ ...defaults(), shape: 'radial' })
		const sweep = toFlutedGlassInput({ ...defaults(), shape: 'sweep' })
		expect(radial.family === 'radial' && radial.input.sweepSpeed).toBe(0)
		expect(sweep.family === 'sweep' && sweep.input.sweepSpeed).toBe(
			FLUTED_GLASS_SHAPE_INPUTS.sweep.sweepSpeed,
		)
	})

	it('색 조합은 모양과 독립이다 — 모양을 바꿔도 따라오지 않는다', () => {
		const values = { ...defaults(), rayColor1: '#123456', speed: 1.11 }
		for (const shape of FLUTED_GLASS_SHAPES) {
			const { input } = toFlutedGlassInput({ ...values, shape })
			expect(input.rayColor1, shape).toBe('#123456')
			expect(input.speed, shape).toBe(1.11)
		}
		// 만지지 않으면 네 모양이 같은 조합 하나를 쓴다.
		const untouched = FLUTED_GLASS_SHAPES.map(
			(shape) => toFlutedGlassInput({ ...defaults(), shape }).input.rayColor1,
		)
		expect(new Set(untouched).size).toBe(1)
	})

	it('스타일이 만지지 않은 잔 축을 정한다 — 가로·세로만 스타일을 갖는다', () => {
		const focused = toFlutedGlassInput({ ...defaults(), shape: 'linear', preset: 'focused' })
		expect(focused.family === 'linear' && focused.input.axisFalloff).toBe(
			FLUTED_GLASS_STYLES.linear.focused.axisFalloff,
		)
		// 🔴 이 축은 컨트롤로도 선언돼 있다 — 만지지 않았으면 스타일이 이겨야 한다.
		expect(focused.input.rayDensity).toBe(FLUTED_GLASS_STYLES.linear.focused.rayDensity)
		expect(focused.input.glassBlur).toBe(FLUTED_GLASS_STYLES.linear.focused.glassBlur)

		// 스윕·방사는 스타일이 없다 — 골라도 모양 기본값 그대로다.
		for (const shape of ['sweep', 'radial'] as const) {
			const styled = toFlutedGlassInput({ ...defaults(), shape, preset: 'focused' })
			expect(styled.input.rayDensity, shape).toBe(FLUTED_GLASS_SHAPE_INPUTS[shape].rayDensity)
		}
	})

	it('창작자가 만진 잔 축은 스타일이 덮지 않는다', () => {
		const { input } = toFlutedGlassInput({
			...defaults(),
			shape: 'linear',
			preset: 'focused',
			rayDensity: 0.77,
		})
		expect(input.rayDensity).toBe(0.77)
	})

	it('알 수 없는 모양·스타일은 기본으로 떨어진다 — 저장된 값이 낡아도 화면은 뜬다', () => {
		expect(toFlutedGlassInput({ ...defaults(), shape: 'no-such-shape' }).shape).toBe('sweep')
		const styled = toFlutedGlassInput({
			...defaults(),
			shape: 'linear',
			preset: 'no-such-style',
		})
		expect(styled.input.rayDensity).toBe(FLUTED_GLASS_SHAPE_INPUTS.linear.rayDensity)
	})

	it('모양·스타일 select이 목록을 그대로 담는다', () => {
		const options = (id: string) => {
			const control = controls.find((candidate) => candidate.id === id)
			return control && 'options' in control ? control.options.map((o) => o.value) : null
		}
		expect(options('shape')).toEqual([...FLUTED_GLASS_SHAPES])
		expect(options('preset')).toEqual([...FLUTED_GLASS_STYLE_IDS])
	})

	it('모양은 다시 마운트해야 하는 축으로 선언된다 — uniform으로는 반영되지 않는다', () => {
		expect(flutedGlassRuntimeManifest.controller.remountOn).toEqual(['shape'])
	})

	it('네 모양의 축 집합이 달라도 합집합 컨트롤이 입력을 깨지 않는다', () => {
		// sweepSpeed는 가로에 없는 축이다 — 값을 밀어 넣어도 strictObject가 거부하지 않아야 한다.
		expect(() =>
			toFlutedGlassInput({ ...defaults(), shape: 'linear', sweepSpeed: 0.5 }),
		).not.toThrow()
		expect(() =>
			toFlutedGlassInput({ ...defaults(), shape: 'sweep', ribCurve: 2 }),
		).not.toThrow()
	})

	it('범위 밖 값은 거부한다', () => {
		expect(() => toFlutedGlassInput({ ...defaults(), speed: 2.01 })).toThrow()
		expect(() => toFlutedGlassInput({ ...defaults(), sourceOffsetX: 2.01 })).toThrow()
	})

	it('색상 reset은 모양이 아니라 그 하나의 색 조합으로 되돌아간다', () => {
		// 🔴 가로의 자기 기본 색(#001a0b…)으로 떨어지면 「색 조합」이 모양에 묶여 버린다.
		for (const shape of FLUTED_GLASS_SHAPES) {
			const { input } = toFlutedGlassInput({
				...defaults(),
				shape,
				bloomColor: null,
				rayColor1: null,
			})
			expect(input.bloomColor, shape).toBe(FLUTED_GLASS_SHAPE_INPUTS.sweep.bloomColor)
			expect(input.rayColor1, shape).toBe(FLUTED_GLASS_SHAPE_INPUTS.sweep.rayColor1)
		}
		expect(flutedGlassColorToRgb('#3dff8a')).toEqual([61 / 255, 1, 138 / 255])
	})

	it('🔴 팔레트는 첫 조합의 색조를 통째로 돌린 것이다 — 칸 몇 개만 바꾸면 안 된다', () => {
		// 한 팔레트 안에서 색조가 칸마다 다른 각도로 움직이면 두 계열이 섞여 「초록에 하늘이 낀」
		// 것처럼 읽힌다. 조화의 정본은 첫 팔레트이고, 새 팔레트는 그것의 회전이어야 한다.
		const toHsl = (hex: string) => {
			const [r, g, b] = flutedGlassColorToRgb(hex)
			const max = Math.max(r, g, b)
			const min = Math.min(r, g, b)
			const lightness = (max + min) / 2
			if (max === min) return { hue: 0, saturation: 0, lightness }
			const span = max - min
			const saturation = lightness > 0.5 ? span / (2 - max - min) : span / (max + min)
			const hue =
				max === r
					? ((g - b) / span + (g < b ? 6 : 0)) * 60
					: max === g
						? ((b - r) / span + 2) * 60
						: ((r - g) / span + 4) * 60
			return { hue, saturation, lightness }
		}
		const base = FLUTED_GLASS_PALETTES.green.colors
		const ids = Object.keys(base) as (keyof typeof base)[]

		for (const [name, palette] of Object.entries(FLUTED_GLASS_PALETTES)) {
			if (name === 'green') continue
			// 🔑 색조 회전각은 한 팔레트 안에서 하나여야 한다. 명도가 거의 0인 칸(배경·최암부)은
			//    8bit 양자화 때문에 각도가 크게 튀므로 각도 비교에서 뺀다 — 채도·명도는 전부 본다.
			const angles: number[] = []
			for (const id of ids) {
				const from = toHsl(base[id])
				const to = toHsl(palette.colors[id])

				expect(to.saturation, `${name}.${id} 채도`).toBeCloseTo(from.saturation, 2)
				expect(to.lightness, `${name}.${id} 명도`).toBeCloseTo(from.lightness, 2)
				if (from.lightness >= 0.05) angles.push((to.hue - from.hue + 360) % 360)
			}

			expect(angles.length, `${name}: 각도를 잴 칸`).toBeGreaterThan(3)
			const spread = Math.max(...angles) - Math.min(...angles)
			expect(
				spread,
				`${name}: 색조 회전각이 칸마다 다르다 (${angles.join(', ')})`,
			).toBeLessThan(2)
		}
	})

	it('네이비 팔레트의 중간 톤이 HD DISCOVERY BLUE다 — 브랜드 남색이 팔레트의 중심이다', () => {
		expect(FLUTED_GLASS_PALETTES.navy.colors.rayColor3).toBe('#003087')
	})

	it('🔴 팔레트 선택지의 색이 색 칸의 순서와 개수를 그대로 맞춘다', () => {
		// 칩이 띠를 순서대로 채우므로 순서가 어긋나면 배경색이 광선색 칸에 들어간다.
		const palette = controls.find((control) => control.id === 'palette')
		if (!palette || !('options' in palette)) throw new Error('팔레트 컨트롤이 없다')
		const colorIds = controls.filter((control) => control.kind === 'color').map((c) => c.id)
		const declared = defaults()
		for (const option of palette.options) {
			expect(option.colors, option.value).toHaveLength(colorIds.length)
		}
		const green = palette.options.find((option) => option.value === 'green')
		// 기본 조합은 선언된 색 칸의 기본값과 같은 것이어야 한다 — 첫 화면이 팔레트와 어긋나지 않는다.
		expect(green?.colors).toEqual(colorIds.map((id) => declared[id]))
	})

	it('광원 pad는 판 밖까지 닿는다 — pad ±1이 판의 세 배다', () => {
		// 합치기 전 스윕은 판 밖으로 나가려 admin 전용 오프셋(-0.35)을 썼다. 이제 pad 값 하나로 닿는다.
		const { input } = toFlutedGlassInput({ ...defaults(), shape: 'sweep' })
		expect(input.source.x * FLUTED_GLASS_SOURCE_SPAN).toBeCloseTo(-1.35)
		expect(input.sourceOffsetX).toBe(0)
	})

	it('Controller 화면 좌표의 Y축을 WebGL 좌표로 반전한다', () => {
		expect(toFlutedGlassShaderPoint({ x: -0.75, y: 0.5 })).toEqual([-0.75, -0.5])
		expect(toFlutedGlassShaderPoint({ x: -0.75, y: 0.5 }, { x: -0.5, y: 0.75 })).toEqual([
			-1.25, -1.25,
		])
	})

	it('왜곡 형태를 shader 정수 uniform으로 변환한다', () => {
		expect(flutedGlassDistortionShapeToUniform('cascade')).toBe(0)
		expect(flutedGlassDistortionShapeToUniform('lens')).toBe(3)
	})

	// uniform 이름 오타는 컴파일도 통과하고 화면만 조용히 비므로 텍스트로 대조한다.
	it('세 셰이더가 선언한 uniform과 runtime이 배선하는 uniform이 서로를 덮는다', async () => {
		const { readFile } = await import('node:fs/promises')
		const read = (file: string) => readFile(`${SHADER_DIR}/${file}`, 'utf8')
		const [linear, sweep, radial, runtime] = await Promise.all([
			read('shader.linear.ts'),
			read('shader.sweep.ts'),
			read('shader.radial.ts'),
			read('runtime.client.ts'),
		])
		const declared = (source: string) =>
			new Set(Array.from(source.matchAll(/^uniform\s+\w+\s+(\w+);/gm), (m) => m[1]))
		const written = new Set(
			Array.from(runtime.matchAll(/getUniformLocation\(program,\s*'(\w+)'\)/g), (m) => m[1]),
		)
		const shaders = {
			linear: declared(linear),
			sweep: declared(sweep),
			radial: declared(radial),
		}

		// 선언했는데 배선되지 않은 uniform은 그 축이 죽은 것이다.
		for (const [name, names] of Object.entries(shaders)) {
			expect([...names].filter((id) => !written.has(id)).sort(), name).toEqual([])
		}
		// 배선했는데 어느 셰이더에도 없는 이름은 오타다.
		const anyShader = new Set(Object.values(shaders).flatMap((names) => [...names]))
		expect([...written].filter((id) => !anyShader.has(id)).sort()).toEqual([])
		// 방사에만 없는 uniform은 스윕 회전 하나다 — 배선을 공유하고 WebGL이 null 대입을 무시한다.
		expect([...shaders.sweep].filter((id) => !shaders.radial.has(id)).sort()).toEqual([
			'uSweepSpeed',
		])
	})
})
