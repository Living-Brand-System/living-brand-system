import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * 이미지 스튜디오 좌측 패널에 세울 본보기를 골라 둔다.
 *
 * 🔑 정본은 admin이다 — manager가 생성 기록에서 `bestSample`을 켜는 것이 실제 선정 경로이고,
 *    이 스크립트는 **한 번도 고르지 않은 DB에 빈 패널이 서지 않게** 씨앗만 놓는다.
 * 🔴 재실행 안전: 이미 하나라도 켜져 있으면 아무것도 하지 않는다. 사람이 고른 것을 덮지 않는다.
 *
 *   pnpm payload run scripts/seed-best-sample-images.ts
 */
const SEED_COUNT = 8

const payload = await getPayload({ config })
payload.logger.info(
	{ db: process.env.DATABASE_URL?.replace(/:\/\/[^@]*@/, '://***@') },
	'seed-best-samples.target',
)

const existing = await payload.count({
	collection: 'generated-images',
	overrideAccess: true,
	where: { bestSample: { equals: true } },
})
if (existing.totalDocs > 0) {
	payload.logger.info({ count: existing.totalDocs }, 'seed-best-samples.skipped')
	process.exit(0)
}

// 묶음마다 한 장씩만 집는다 — 같은 요청에서 나온 네 장이 본보기 자리를 다 채우면 볼 것이 없다.
const { docs } = await payload.find({
	collection: 'generated-images',
	depth: 0,
	limit: 200,
	overrideAccess: true,
	select: { batchKey: true },
	sort: '-createdAt',
	where: { _status: { equals: 'published' } },
})

const picked: number[] = []
const seenBatches = new Set<string>()
for (const doc of docs) {
	const key = doc.batchKey ?? `solo-${doc.id}`
	if (seenBatches.has(key)) continue
	seenBatches.add(key)
	picked.push(doc.id)
	if (picked.length >= SEED_COUNT) break
}

for (const id of picked) {
	await payload.update({
		collection: 'generated-images',
		data: { bestSample: true },
		id,
		overrideAccess: true,
	})
}
payload.logger.info({ ids: picked }, 'seed-best-samples.done')
process.exit(0)
