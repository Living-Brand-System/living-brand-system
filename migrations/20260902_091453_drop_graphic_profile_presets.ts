import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * 🔴 `migrate:create`가 이 마이그레이션에 `image_profiles_blocks_reference_image` 생성문을
 *    함께 뽑아냈다. 그 테이블은 20260827_085320이 이미 만든 것이고, 프리셋·canvasPpi 브랜치가
 *    #292보다 먼저 갈라져 나와 **그 브랜치들의 스냅샷에 빠져 있었기 때문**이다
 *    (직전 스냅샷 = 20260831_084134). 손으로 걷어냈다 — 함께 커밋되는 새 스냅샷이
 *    현재 스키마 전체를 담고 있어 갭은 여기서 닫힌다.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "graphic_profiles" DROP COLUMN "presets";
  ALTER TABLE "_graphic_profiles_v" DROP COLUMN "version_presets";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "graphic_profiles" ADD COLUMN "presets" jsonb;
  ALTER TABLE "_graphic_profiles_v" ADD COLUMN "version_presets" jsonb;`)
}
