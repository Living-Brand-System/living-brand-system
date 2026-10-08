'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Typography } from '@/components/ui/typography'
import { snapCameraAngle } from './camera-orbit'

interface CameraAngles {
	azimuthDeg: number
	elevationDeg: number
}

interface CameraOrbitControlProps extends CameraAngles {
	azimuthLabel: string
	azimuthSteps: readonly number[]
	elevationLabel: string
	elevationSteps: readonly number[]
	onChange: (angles: CameraAngles) => void
	seedImage: string
}

interface SceneController {
	update: (angles: CameraAngles) => void
}

type CameraHandle = THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>

const CENTER = new THREE.Vector3(0, 0.75, 0)
const AZIMUTH_RADIUS = 2.4
const ELEVATION_RADIUS = 1.8
const CAMERA_DISTANCE = 2.1

export function CameraOrbitControl({
	azimuthDeg,
	azimuthLabel,
	azimuthSteps,
	elevationDeg,
	elevationLabel,
	elevationSteps,
	onChange,
	seedImage,
}: CameraOrbitControlProps) {
	const mountRef = useRef<HTMLDivElement>(null)
	const controllerRef = useRef<SceneController | null>(null)
	const onChangeRef = useRef(onChange)
	const azimuthStepsKey = azimuthSteps.join(',')
	const elevationStepsKey = elevationSteps.join(',')
	const initialAnglesRef = useRef({ azimuthDeg, elevationDeg })
	const [unsupported, setUnsupported] = useState(false)

	useEffect(() => {
		onChangeRef.current = onChange
	}, [onChange])

	useEffect(() => {
		controllerRef.current?.update({ azimuthDeg, elevationDeg })
	}, [azimuthDeg, elevationDeg])

	// 구간 배열은 부모가 매 렌더 새로 만든다(filter().map()). 그 참조를 의존성에 두면 드래그가
	// 일으킨 리렌더마다 씬이 다시 지어지고, 그 순간 pointer capture와 dragTarget이 함께 사라져
	// 핸들을 잡자마자 놓친다. 그래서 참조가 아니라 값(문자열 키)이 재생성을 정한다.
	useEffect(() => {
		const azimuthSteps = azimuthStepsKey.split(',').map(Number)
		const elevationSteps = elevationStepsKey.split(',').map(Number)
		const mount = mountRef.current
		if (!mount || typeof WebGL2RenderingContext === 'undefined') {
			setUnsupported(true)
			return
		}

		let renderer: THREE.WebGLRenderer
		try {
			renderer = new THREE.WebGLRenderer({
				alpha: true,
				antialias: true,
				powerPreference: 'high-performance',
			})
		} catch {
			setUnsupported(true)
			return
		}

		setUnsupported(false)
		const scene = new THREE.Scene()
		const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1_000)
		camera.position.set(4.5, 3, 4.5)
		camera.lookAt(CENTER)

		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		renderer.domElement.style.width = '100%'
		renderer.domElement.style.height = '100%'
		renderer.domElement.style.touchAction = 'none'
		renderer.domElement.setAttribute('aria-hidden', 'true')
		mount.appendChild(renderer.domElement)

		scene.add(new THREE.AmbientLight(undefined, 1.4))
		const directionalLight = new THREE.DirectionalLight(undefined, 2.2)
		directionalLight.position.set(5, 10, 5)
		scene.add(directionalLight)

		const azimuthColor = readCssColor(mount, '--chart-2')
		const elevationColor = readCssColor(mount, '--chart-4')
		const cameraColor = readCssColor(mount, '--chart-3')
		const gridStrongColor = readCssColor(mount, '--border')
		const gridWeakColor = readCssColor(mount, '--muted')
		const surfaceColor = readCssColor(mount, '--background')

		const grid = new THREE.GridHelper(8, 16, gridStrongColor, gridWeakColor)
		scene.add(grid)

		const targetMaterial = new THREE.MeshBasicMaterial({
			color: surfaceColor,
			side: THREE.DoubleSide,
		})
		const targetPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), targetMaterial)
		targetPlane.position.copy(CENTER)
		scene.add(targetPlane)

		let loadedTexture: THREE.Texture | null = null
		let disposed = false
		new THREE.TextureLoader().load(
			seedImage,
			(texture) => {
				if (disposed) {
					texture.dispose()
					return
				}
				loadedTexture = texture
				texture.colorSpace = THREE.SRGBColorSpace
				texture.minFilter = THREE.LinearFilter
				texture.magFilter = THREE.LinearFilter
				targetMaterial.map = texture
				targetMaterial.needsUpdate = true

				const image = texture.image as { height?: number; width?: number }
				if (!image.width || !image.height) return
				const aspectRatio = image.width / image.height
				const maxSize = 1.6
				const width = aspectRatio >= 1 ? maxSize : maxSize * aspectRatio
				const height = aspectRatio >= 1 ? maxSize / aspectRatio : maxSize
				targetPlane.geometry.dispose()
				targetPlane.geometry = new THREE.PlaneGeometry(width, height)
			},
			undefined,
			() => setUnsupported(true),
		)

		const cameraMaterial = new THREE.MeshStandardMaterial({
			color: cameraColor,
			metalness: 0.5,
			roughness: 0.3,
		})
		const cameraGroup = new THREE.Group()
		cameraGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.38), cameraMaterial))
		const lens = new THREE.Mesh(
			new THREE.CylinderGeometry(0.09, 0.11, 0.18, 16),
			cameraMaterial,
		)
		lens.rotation.x = Math.PI / 2
		lens.position.z = 0.26
		cameraGroup.add(lens)
		scene.add(cameraGroup)

		const azimuthMaterial = new THREE.MeshStandardMaterial({
			color: azimuthColor,
			emissive: azimuthColor,
			emissiveIntensity: 0.3,
		})
		const azimuthRing = new THREE.Mesh(
			new THREE.TorusGeometry(AZIMUTH_RADIUS, 0.04, 16, 64),
			azimuthMaterial,
		)
		azimuthRing.rotation.x = Math.PI / 2
		azimuthRing.position.y = 0.05
		scene.add(azimuthRing)

		const azimuthHandle = new THREE.Mesh(
			new THREE.SphereGeometry(0.18, 16, 16),
			azimuthMaterial.clone(),
		)
		azimuthHandle.userData.type = 'azimuth'
		scene.add(azimuthHandle)

		const elevationPoints = Array.from({ length: 33 }, (_, index) => {
			const degrees =
				elevationSteps[0] +
				((elevationSteps[elevationSteps.length - 1] - elevationSteps[0]) * index) / 32
			const radians = THREE.MathUtils.degToRad(degrees)
			return new THREE.Vector3(
				-0.8,
				ELEVATION_RADIUS * Math.sin(radians) + CENTER.y,
				ELEVATION_RADIUS * Math.cos(radians),
			)
		})
		const elevationMaterial = new THREE.MeshStandardMaterial({
			color: elevationColor,
			emissive: elevationColor,
			emissiveIntensity: 0.3,
		})
		const elevationArc = new THREE.Mesh(
			new THREE.TubeGeometry(new THREE.CatmullRomCurve3(elevationPoints), 32, 0.04, 8),
			elevationMaterial,
		)
		scene.add(elevationArc)

		const elevationHandle = new THREE.Mesh(
			new THREE.SphereGeometry(0.18, 16, 16),
			elevationMaterial.clone(),
		)
		elevationHandle.userData.type = 'elevation'
		scene.add(elevationHandle)

		let currentAzimuth = initialAnglesRef.current.azimuthDeg
		let currentElevation = initialAnglesRef.current.elevationDeg
		let dragTarget: CameraHandle | null = null
		let snapAnimation:
			| {
					from: CameraAngles
					startedAt: number
					to: CameraAngles
			  }
			| undefined

		function updatePositions(next: CameraAngles) {
			currentAzimuth = next.azimuthDeg
			currentElevation = next.elevationDeg
			const azimuthRadians = THREE.MathUtils.degToRad(currentAzimuth)
			const elevationRadians = THREE.MathUtils.degToRad(currentElevation)
			const horizontalDistance = CAMERA_DISTANCE * Math.cos(elevationRadians)

			cameraGroup.position.set(
				horizontalDistance * Math.sin(azimuthRadians),
				CAMERA_DISTANCE * Math.sin(elevationRadians) + CENTER.y,
				horizontalDistance * Math.cos(azimuthRadians),
			)
			cameraGroup.lookAt(CENTER)
			azimuthHandle.position.set(
				AZIMUTH_RADIUS * Math.sin(azimuthRadians),
				0.05,
				AZIMUTH_RADIUS * Math.cos(azimuthRadians),
			)
			elevationHandle.position.set(
				-0.8,
				ELEVATION_RADIUS * Math.sin(elevationRadians) + CENTER.y,
				ELEVATION_RADIUS * Math.cos(elevationRadians),
			)
		}

		controllerRef.current = {
			update: (next) => {
				snapAnimation = undefined
				updatePositions(next)
			},
		}
		updatePositions(initialAnglesRef.current)

		const raycaster = new THREE.Raycaster()
		const pointer = new THREE.Vector2()
		const intersection = new THREE.Vector3()
		const handles: CameraHandle[] = [azimuthHandle, elevationHandle]

		function updatePointer(event: PointerEvent) {
			const bounds = renderer.domElement.getBoundingClientRect()
			pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
			pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
			raycaster.setFromCamera(pointer, camera)
		}

		function setHandleActive(handle: CameraHandle, active: boolean) {
			handle.material.emissiveIntensity = active ? 1 : 0.5
			handle.scale.setScalar(active ? 1.25 : 1)
		}

		function handlePointerDown(event: PointerEvent) {
			updatePointer(event)
			const hit = raycaster.intersectObjects(handles, false)[0]?.object
			if (!hit || !handles.includes(hit as CameraHandle)) return
			event.preventDefault()
			snapAnimation = undefined
			dragTarget = hit as CameraHandle
			setHandleActive(dragTarget, true)
			renderer.domElement.setPointerCapture(event.pointerId)
			renderer.domElement.style.cursor = 'grabbing'
		}

		function handlePointerMove(event: PointerEvent) {
			updatePointer(event)
			if (!dragTarget) {
				const hovered = raycaster.intersectObjects(handles, false)[0]?.object
				for (const handle of handles) setHandleActive(handle, handle === hovered)
				renderer.domElement.style.cursor = hovered ? 'grab' : 'default'
				return
			}

			if (dragTarget.userData.type === 'azimuth') {
				const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05)
				if (raycaster.ray.intersectPlane(plane, intersection)) {
					currentAzimuth = THREE.MathUtils.radToDeg(
						Math.atan2(intersection.x, intersection.z),
					)
				}
			} else {
				const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.8)
				if (raycaster.ray.intersectPlane(plane, intersection)) {
					currentElevation = THREE.MathUtils.clamp(
						THREE.MathUtils.radToDeg(
							Math.atan2(intersection.y - CENTER.y, intersection.z),
						),
						elevationSteps[0],
						elevationSteps[elevationSteps.length - 1],
					)
				}
			}

			const next = {
				azimuthDeg: currentAzimuth,
				elevationDeg: currentElevation,
			}
			updatePositions(next)
			onChangeRef.current(next)
		}

		function finishDrag(event: PointerEvent) {
			if (!dragTarget) return
			if (renderer.domElement.hasPointerCapture(event.pointerId)) {
				renderer.domElement.releasePointerCapture(event.pointerId)
			}
			setHandleActive(dragTarget, false)
			dragTarget = null
			renderer.domElement.style.cursor = 'default'
			snapAnimation = {
				from: {
					azimuthDeg: currentAzimuth,
					elevationDeg: currentElevation,
				},
				startedAt: performance.now(),
				to: {
					azimuthDeg: snapCameraAngle(currentAzimuth, azimuthSteps, true),
					elevationDeg: snapCameraAngle(currentElevation, elevationSteps),
				},
			}
		}

		renderer.domElement.addEventListener('pointerdown', handlePointerDown)
		renderer.domElement.addEventListener('pointermove', handlePointerMove)
		renderer.domElement.addEventListener('pointerup', finishDrag)
		renderer.domElement.addEventListener('pointercancel', finishDrag)

		const resizeObserver = new ResizeObserver(() => {
			const width = mount.clientWidth
			const height = mount.clientHeight
			if (!width || !height) return
			camera.aspect = width / height
			camera.updateProjectionMatrix()
			renderer.setSize(width, height, false)
		})
		resizeObserver.observe(mount)

		renderer.setAnimationLoop((time) => {
			if (snapAnimation) {
				const progress = Math.min((time - snapAnimation.startedAt) / 200, 1)
				const eased = 1 - (1 - progress) ** 3
				let azimuthDifference = snapAnimation.to.azimuthDeg - snapAnimation.from.azimuthDeg
				if (azimuthDifference > 180) azimuthDifference -= 360
				if (azimuthDifference < -180) azimuthDifference += 360
				updatePositions({
					azimuthDeg: snapAnimation.from.azimuthDeg + azimuthDifference * eased,
					elevationDeg:
						snapAnimation.from.elevationDeg +
						(snapAnimation.to.elevationDeg - snapAnimation.from.elevationDeg) * eased,
				})
				if (progress === 1) {
					const resolved = snapAnimation.to
					snapAnimation = undefined
					onChangeRef.current(resolved)
				}
			}
			renderer.render(scene, camera)
		})

		return () => {
			disposed = true
			controllerRef.current = null
			resizeObserver.disconnect()
			renderer.setAnimationLoop(null)
			renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
			renderer.domElement.removeEventListener('pointermove', handlePointerMove)
			renderer.domElement.removeEventListener('pointerup', finishDrag)
			renderer.domElement.removeEventListener('pointercancel', finishDrag)
			loadedTexture?.dispose()

			const geometries = new Set<THREE.BufferGeometry>()
			const materials = new Set<THREE.Material>()
			scene.traverse((object) => {
				const resource = object as THREE.Object3D & {
					geometry?: THREE.BufferGeometry
					material?: THREE.Material | THREE.Material[]
				}
				if (resource.geometry) geometries.add(resource.geometry)
				if (Array.isArray(resource.material)) {
					for (const material of resource.material) materials.add(material)
				} else if (resource.material) {
					materials.add(resource.material)
				}
			})
			for (const geometry of geometries) geometry.dispose()
			for (const material of materials) material.dispose()
			renderer.dispose()
			renderer.domElement.remove()
		}
	}, [azimuthStepsKey, elevationStepsKey, seedImage])

	// 프레임(정사각 컨테이너·표면색)은 소비자인 킷의 CameraControl이 소유한다 — 여기서는 채우기만 한다.
	return (
		<div
			ref={mountRef}
			data-slot="controller-camera-orbit-control"
			role="img"
			aria-label={`3D 카메라 시점: ${azimuthLabel}, ${elevationLabel}`}
			className="relative size-full"
		>
			{/* 드래그 어포던스가 자명하지 않아 지원 여부와 조작법을 프리뷰 안에 겹쳐 알린다. */}
			<Typography
				size="xs"
				tone={unsupported ? 'destructive' : 'muted'}
				className="pointer-events-none absolute inset-x-3 bottom-2 z-10"
			>
				{unsupported
					? '이 브라우저에서는 3D 미리보기를 쓸 수 없어요. 아래 X·Y로 시점을 고르세요.'
					: '핸들을 드래그하면 가장 가까운 시점에 맞춰집니다.'}
			</Typography>
		</div>
	)
}

function readCssColor(element: HTMLElement, variable: string) {
	const value = getComputedStyle(element).getPropertyValue(variable).trim()
	const probe = document.createElement('canvas')
	probe.width = 1
	probe.height = 1
	const context = probe.getContext('2d', { willReadFrequently: true })
	if (!context || !value) return new THREE.Color()
	context.fillStyle = value
	context.fillRect(0, 0, 1, 1)
	const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
	return new THREE.Color().setRGB(red / 255, green / 255, blue / 255, THREE.SRGBColorSpace)
}
