'use client'

import type { GraphicRuntimeAdapter } from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import {
	createShaderCanvasRuntime,
	type ShaderCanvasRuntime,
} from '@/features/graphic-generation/runtime/client/shader-canvas.client'
import { FLUTED_GLASS_SOURCE_SPAN } from './definition'
import {
	type FlutedGlassInput,
	type FlutedGlassLinearInput,
	type FlutedGlassRadialInput,
	flutedGlassColorToRgb,
	flutedGlassDistortionShapeToUniform,
	toFlutedGlassInput,
	toFlutedGlassShaderPoint,
} from './model'
import linearFragmentBody from './shader.linear'
import radialFragmentBody from './shader.radial'
import sweepFragmentBody from './shader.sweep'

/** 모양별 셰이더 원문. 세로는 가로 원문에 회전된 입력을 흘려 넣는다. */
const FRAGMENT_BODIES = {
	linear: linearFragmentBody,
	sweep: sweepFragmentBody,
	radial: radialFragmentBody,
} as const

const ARIA_LABELS = {
	linear: 'Fluted Glass 그래픽 미리보기',
	sweep: 'Fluted Glass 그래픽 미리보기',
	radial: 'Fluted Glass 그래픽 미리보기',
} as const

/** 네 모양이 공유하는 uniform — 광선·색·유리는 어느 원문에도 같은 이름으로 있다. */
function bindSharedUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
	const uniforms = {
		source: gl.getUniformLocation(program, 'uSource'),
		zoom: gl.getUniformLocation(program, 'uZoom'),
		tilt: gl.getUniformLocation(program, 'uTilt'),
		vignette: gl.getUniformLocation(program, 'uVignette'),
		bloomColor: gl.getUniformLocation(program, 'uBloomColor'),
		rayColor1: gl.getUniformLocation(program, 'uRayColor1'),
		rayColor2: gl.getUniformLocation(program, 'uRayColor2'),
		rayColor3: gl.getUniformLocation(program, 'uRayColor3'),
		rayColor4: gl.getUniformLocation(program, 'uRayColor4'),
		rayColor5: gl.getUniformLocation(program, 'uRayColor5'),
		rayBackgroundColor: gl.getUniformLocation(program, 'uRayBackgroundColor'),
		rayBloom: gl.getUniformLocation(program, 'uRayBloom'),
		rayIntensity: gl.getUniformLocation(program, 'uGodrayIntensity'),
		rayDensity: gl.getUniformLocation(program, 'uGodrayDensity'),
		raySpotty: gl.getUniformLocation(program, 'uRaySpotty'),
		rayMidSize: gl.getUniformLocation(program, 'uRayMidSize'),
		rayMidIntensity: gl.getUniformLocation(program, 'uRayMidIntensity'),
		speed: gl.getUniformLocation(program, 'uGodraySpeed'),
		frameOffsetMs: gl.getUniformLocation(program, 'uFrameOffsetMs'),
		rayScale: gl.getUniformLocation(program, 'uRayScale'),
		rayRotation: gl.getUniformLocation(program, 'uRayRotation'),
		pulseIntensity: gl.getUniformLocation(program, 'uPulseIntensity'),
		pulseSpeed: gl.getUniformLocation(program, 'uPulseSpeed'),
		pulseDensity: gl.getUniformLocation(program, 'uPulseDensity'),
		pulseWidth: gl.getUniformLocation(program, 'uPulseWidth'),
		glassSize: gl.getUniformLocation(program, 'uGlassSize'),
		glassAngle: gl.getUniformLocation(program, 'uGlassAngle'),
		glassOriginOffset: gl.getUniformLocation(program, 'uGlassOriginOffset'),
		glassOffset: gl.getUniformLocation(program, 'uGlassOffset'),
		glassSpeed: gl.getUniformLocation(program, 'uGlassSpeed'),
		glassDrift: gl.getUniformLocation(program, 'uGlassDrift'),
		glassDriftSpeed: gl.getUniformLocation(program, 'uGlassDriftSpeed'),
		glassDistortion: gl.getUniformLocation(program, 'uGlassDistortion'),
		glassEdgeSoftness: gl.getUniformLocation(program, 'uGlassEdgeSoftness'),
		glassBlur: gl.getUniformLocation(program, 'uGlassBlur'),
		glassScattering: gl.getUniformLocation(program, 'uGlassScattering'),
		glassHighlights: gl.getUniformLocation(program, 'uGlassHighlights'),
		glassShadows: gl.getUniformLocation(program, 'uGlassShadows'),
		distortionShape: gl.getUniformLocation(program, 'uDistortionShape'),
	}

	return (input: FlutedGlassLinearInput | FlutedGlassRadialInput) => {
		const [sourceX, sourceY] = toFlutedGlassShaderPoint(input.source, {
			x: input.sourceOffsetX,
			y: input.sourceOffsetY,
		})
		const [glassOriginX, glassOriginY] = toFlutedGlassShaderPoint(input.glassOriginOffset)
		const [glassDriftX, glassDriftY] = toFlutedGlassShaderPoint(input.glassDrift)
		// pad의 ±1을 판 밖까지 늘린다 — 셰이더는 ±1을 판 가장자리로 읽는다.
		gl.uniform2f(
			uniforms.source,
			sourceX * FLUTED_GLASS_SOURCE_SPAN,
			sourceY * FLUTED_GLASS_SOURCE_SPAN,
		)
		gl.uniform1f(uniforms.zoom, input.zoom)
		gl.uniform1f(uniforms.tilt, input.tilt)
		gl.uniform1f(uniforms.vignette, input.vignette)
		gl.uniform3f(uniforms.bloomColor, ...flutedGlassColorToRgb(input.bloomColor))
		gl.uniform3f(uniforms.rayColor1, ...flutedGlassColorToRgb(input.rayColor1))
		gl.uniform3f(uniforms.rayColor2, ...flutedGlassColorToRgb(input.rayColor2))
		gl.uniform3f(uniforms.rayColor3, ...flutedGlassColorToRgb(input.rayColor3))
		gl.uniform3f(uniforms.rayColor4, ...flutedGlassColorToRgb(input.rayColor4))
		gl.uniform3f(uniforms.rayColor5, ...flutedGlassColorToRgb(input.rayColor5))
		gl.uniform3f(
			uniforms.rayBackgroundColor,
			...flutedGlassColorToRgb(input.rayBackgroundColor),
		)
		gl.uniform1f(uniforms.rayBloom, input.rayBloom)
		gl.uniform1f(uniforms.rayIntensity, input.rayIntensity)
		gl.uniform1f(uniforms.rayDensity, input.rayDensity)
		gl.uniform1f(uniforms.raySpotty, input.raySpotty)
		gl.uniform1f(uniforms.rayMidSize, input.rayMidSize)
		gl.uniform1f(uniforms.rayMidIntensity, input.rayMidIntensity)
		gl.uniform1f(uniforms.speed, input.speed)
		gl.uniform1f(uniforms.frameOffsetMs, input.frameOffsetMs)
		gl.uniform1f(uniforms.rayScale, input.rayScale)
		gl.uniform1f(uniforms.rayRotation, input.rayRotation)
		gl.uniform1f(uniforms.pulseIntensity, input.pulseIntensity)
		gl.uniform1f(uniforms.pulseSpeed, input.pulseSpeed)
		gl.uniform1f(uniforms.pulseDensity, input.pulseDensity)
		gl.uniform1f(uniforms.pulseWidth, input.pulseWidth)
		gl.uniform1f(uniforms.glassSize, input.glassSize)
		gl.uniform1f(uniforms.glassAngle, input.glassAngle)
		gl.uniform2f(uniforms.glassOriginOffset, glassOriginX, glassOriginY)
		gl.uniform1f(uniforms.glassOffset, input.glassOffset)
		gl.uniform1f(uniforms.glassSpeed, input.glassSpeed)
		gl.uniform2f(uniforms.glassDrift, glassDriftX, glassDriftY)
		gl.uniform2f(uniforms.glassDriftSpeed, input.glassDriftSpeedX, input.glassDriftSpeedY)
		gl.uniform1f(uniforms.glassDistortion, input.glassDistortion)
		gl.uniform1f(uniforms.glassEdgeSoftness, input.glassEdgeSoftness)
		gl.uniform1f(uniforms.glassBlur, input.glassBlur)
		gl.uniform1f(uniforms.glassScattering, input.glassScattering)
		gl.uniform1f(uniforms.glassHighlights, input.glassHighlights)
		gl.uniform1f(uniforms.glassShadows, input.glassShadows)
		gl.uniform1i(
			uniforms.distortionShape,
			flutedGlassDistortionShapeToUniform(input.distortionShape),
		)
	}
}

/** 가로·세로에만 있는 uniform — 축 감쇠·흐름·팔레트 위상·플루트 폭 커브. */
function bindLinearUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
	const shared = bindSharedUniforms(gl, program)
	const uniforms = {
		axisFalloff: gl.getUniformLocation(program, 'uAxisFalloff'),
		flowSpeed: gl.getUniformLocation(program, 'uFlowSpeed'),
		paletteShift: gl.getUniformLocation(program, 'uPaletteShift'),
		paletteDrift: gl.getUniformLocation(program, 'uPaletteDrift'),
		ribCurve: gl.getUniformLocation(program, 'uRibCurve'),
	}

	return (input: FlutedGlassLinearInput) => {
		shared(input)
		gl.uniform1f(uniforms.axisFalloff, input.axisFalloff)
		gl.uniform1f(uniforms.flowSpeed, input.flowSpeed)
		gl.uniform1f(uniforms.paletteShift, input.paletteShift)
		gl.uniform1f(uniforms.paletteDrift, input.paletteDrift)
		gl.uniform1f(uniforms.ribCurve, input.ribCurve)
	}
}

/**
 * 스윕·방사에만 있는 uniform.
 *
 * `uSweepSpeed`는 스윕 원문에만 있다 — 방사 프로그램에서는 location이 null이 되고 WebGL이
 * 그 대입을 조용히 무시한다. 그래서 두 원문이 같은 배선을 공유할 수 있다.
 */
function bindRadialUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
	const shared = bindSharedUniforms(gl, program)
	const uniforms = {
		sweepSpeed: gl.getUniformLocation(program, 'uSweepSpeed'),
		radialFalloff: gl.getUniformLocation(program, 'uRadialFalloff'),
		radialFlowSpeed: gl.getUniformLocation(program, 'uRadialFlowSpeed'),
		glassSourceFade: gl.getUniformLocation(program, 'uGlassSourceFade'),
	}

	return (input: FlutedGlassRadialInput) => {
		shared(input)
		gl.uniform1f(uniforms.sweepSpeed, input.sweepSpeed)
		gl.uniform1f(uniforms.radialFalloff, input.radialFalloff)
		gl.uniform1f(uniforms.radialFlowSpeed, input.radialFlowSpeed)
		gl.uniform2f(uniforms.glassSourceFade, input.glassSourceFadeStart, input.glassSourceFadeEnd)
	}
}

export type FlutedGlassRuntime = ShaderCanvasRuntime<
	FlutedGlassLinearInput | FlutedGlassRadialInput
>

/**
 * Fluted Glass의 브라우저 WebGL 미리보기를 소유한다.
 * Controller 상태는 호출자가, GPU resource 수명은 공용 shader canvas host가 소유한다.
 */
export function createFlutedGlassRuntime({
	container,
	input: { family, input },
}: {
	container: HTMLElement
	input: FlutedGlassInput
}): Promise<FlutedGlassRuntime> {
	return createShaderCanvasRuntime({
		container,
		input,
		fragmentBody: FRAGMENT_BODIES[family],
		ariaLabel: ARIA_LABELS[family],
		bindUniforms: (gl, program) =>
			family === 'linear'
				? (bindLinearUniforms(gl, program) as (
						next: FlutedGlassLinearInput | FlutedGlassRadialInput,
					) => void)
				: (bindRadialUniforms(gl, program) as (
						next: FlutedGlassLinearInput | FlutedGlassRadialInput,
					) => void),
	})
}

const flutedGlassRuntimeAdapter = {
	type: 'shader',
	async mount({ container, values }) {
		const mounted = toFlutedGlassInput(values)
		const runtime = await createFlutedGlassRuntime({ container, input: mounted })
		return {
			/**
			 * 🔴 모양이 바뀐 값은 여기로 흘려 넣지 않는다 — 컴파일된 프로그램이 그대로라 새 모양의
			 *    uniform이 조용히 무시된다. 모양은 `controller.remountOn`이 캔버스를 다시 세워
			 *    처리하므로, 그 사이에 도착한 다른 모양의 입력은 버린다.
			 */
			update: (next) => {
				const resolved = toFlutedGlassInput(next)
				if (resolved.family !== mounted.family) return
				runtime.update(resolved.input)
			},
			resize: (width, height) => runtime.resize(width, height),
			getViewport: () => runtime.getViewport(),
			artifacts: runtime.artifacts,
			destroy: () => runtime.destroy(),
		}
	},
} satisfies GraphicRuntimeAdapter

export default flutedGlassRuntimeAdapter
