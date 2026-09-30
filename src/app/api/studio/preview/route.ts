import { isManager } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'
import { toStudioPreviewImage } from '@/modules/studio-controller/controller-definition'

// 렌더링: 매 요청. 사용자 권한을 확인하고 문서를 쓰므로 캐시하지 않는다.
export const dynamic = 'force-dynamic'

/**
 * 스튜디오 종류 → 프로파일 컬렉션과 **식별 방법**. 화면이 컬렉션 이름을 알지 않게 하는 경계다.
 *
 * 🔑 graphic은 숫자 id가 아니라 `runtime`으로 찾는다 — Graphic Studio Config의 `id`가 런타임 id이고
 * (`list-graphic-studio-configs.service.test.ts`가 계약으로 단정한다), `runtime` 필드가 unique라
 * 프로파일과 1:1이다. 환경마다 값이 달라지지 않아 숫자 id보다 오히려 안정적이다.
 */
const PROFILE_TARGETS = {
	graphic: { collection: 'graphic-profiles', lookup: 'runtime' },
	graph: { collection: 'graph-profiles', lookup: 'runtime' },
	image: { collection: 'image-profiles', lookup: 'id' },
	template: { collection: 'templates', lookup: 'id' },
} as const

type StudioKind = keyof typeof PROFILE_TARGETS

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

function isStudioKind(value: unknown): value is StudioKind {
	return typeof value === 'string' && value in PROFILE_TARGETS
}

/**
 * 스튜디오에서 지금 보고 있는 화면을 그 프로파일의 미리보기 이미지로 박는다.
 *
 * 🔑 새 `application-images` 행을 만들고 관계만 갈아끼운다 — 기존 행의 파일을 덮으면 URL이 그대로라
 * 브라우저가 옛 이미지를 계속 보여준다(교체했는데 안 바뀌는 것처럼 보이는 원인).
 */
export async function POST(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const { payload, user } = await authenticateRequest()
	if (!user) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}
	// 화면은 매니저에게만 버튼을 보여주지만 강제는 여기가 한다 — 표시와 강제를 같은 곳에 두지 않는다.
	if (!isManager(user)) {
		return Response.json({ message: 'Forbidden' }, { status: 403 })
	}

	const form = await request.formData()
	const studio = form.get('studio')
	const rawProfileId = form.get('profileId')
	const file = form.get('file')

	if (!isStudioKind(studio)) {
		return Response.json({ message: 'Unknown studio.' }, { status: 400 })
	}
	if (typeof rawProfileId !== 'string' || rawProfileId.length === 0) {
		return Response.json({ message: 'Missing profile id.' }, { status: 400 })
	}
	if (!(file instanceof File) || file.type !== 'image/png') {
		return Response.json({ message: 'PNG 이미지가 필요합니다.' }, { status: 400 })
	}
	if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
		return Response.json(
			{ message: '이미지 크기가 허용 범위를 벗어났습니다.' },
			{ status: 400 },
		)
	}

	const { collection, lookup } = PROFILE_TARGETS[studio]

	try {
		// 🔴 현재 `_status`를 읽어 update에 그대로 되쓴다. versioned 컬렉션은 이것을 빠뜨리면
		//    최신(초안) 버전의 상태를 따라 써서 **게시 문서가 초안으로 떨어진다**(2026-08-05 실사고).
		const current =
			lookup === 'id'
				? await payload.findByID({
						collection,
						id: Number(rawProfileId),
						depth: 0,
						draft: true,
						overrideAccess: false,
						user,
					})
				: (
						await payload.find({
							collection,
							where: { runtime: { equals: rawProfileId } },
							depth: 0,
							limit: 1,
							draft: true,
							overrideAccess: false,
							user,
						})
					).docs[0]
		if (!current) {
			return Response.json({ message: '프로파일을 찾을 수 없습니다.' }, { status: 404 })
		}
		const profileId = current.id

		const buffer = Buffer.from(await file.arrayBuffer())
		const image = await payload.create({
			collection: 'application-images',
			data: {
				name: `${current.name ?? collection} 미리보기`,
				alt: `${current.name ?? collection} 미리보기 이미지`,
				_status: 'published',
			},
			file: {
				data: buffer,
				mimetype: 'image/png',
				name: `${collection}-${profileId}-preview.png`,
				size: buffer.byteLength,
			},
			overrideAccess: false,
			user,
		})

		const updated = await payload.update({
			collection,
			id: profileId,
			data: { previewImage: image.id, _status: current._status },
			depth: 1,
			overrideAccess: false,
			user,
		})

		return Response.json({ previewImage: toStudioPreviewImage(updated.previewImage) })
	} catch (error) {
		payload.logger.error(
			{ err: error, studio, profileId: rawProfileId },
			'studio-preview-update.failed',
		)
		return Response.json({ message: '미리보기를 갱신하지 못했습니다.' }, { status: 500 })
	}
}
