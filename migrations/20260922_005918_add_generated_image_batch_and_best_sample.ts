import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "generated_images" ADD COLUMN "batch_key" varchar;
  ALTER TABLE "generated_images" ADD COLUMN "best_sample" boolean DEFAULT false;
  ALTER TABLE "_generated_images_v" ADD COLUMN "version_batch_key" varchar;
  ALTER TABLE "_generated_images_v" ADD COLUMN "version_best_sample" boolean DEFAULT false;
  CREATE INDEX "generated_images_batch_key_idx" ON "generated_images" USING btree ("batch_key");
  CREATE INDEX "generated_images_best_sample_idx" ON "generated_images" USING btree ("best_sample");
  CREATE INDEX "_generated_images_v_version_version_batch_key_idx" ON "_generated_images_v" USING btree ("version_batch_key");
  CREATE INDEX "_generated_images_v_version_version_best_sample_idx" ON "_generated_images_v" USING btree ("version_best_sample");`)

  // 도입 이전 행 채우기(expand → backfill). batchKey는 생성 요청 단위인데 그 시점에는 기록이
  // 없었으므로 추론한다: 같은 사용자·같은 프롬프트·같은 프로파일이 30초 안에 이어진 묶음.
  // 🔴 장수 상한(IMAGE_BATCH_SIZES의 최대 4)으로 자른다 — 같은 프롬프트를 반복 생성한 구간이
  //    시간만으로는 한 묶음으로 뭉쳐 12장·14장짜리 가짜 배치가 나온다.
  // 🔴 키에 'inferred-' 접두사를 남긴다. 추론으로 채운 행과 실제 요청 키를 나중에 구분할 수 있어야 한다.
  await db.execute(sql`
    WITH ordered AS (
      SELECT id, created_by_id, coalesce(input_prompt, '') AS p, scenario_id, created_at,
        CASE WHEN extract(epoch FROM created_at - lag(created_at) OVER w) < 30 THEN 0 ELSE 1 END AS brk
      FROM generated_images
      WINDOW w AS (
        PARTITION BY created_by_id, coalesce(input_prompt, ''), scenario_id
        ORDER BY created_at, id
      )
    ), grouped AS (
      SELECT *, sum(brk) OVER (
        PARTITION BY created_by_id, p, scenario_id ORDER BY created_at, id
      ) AS g
      FROM ordered
    ), capped AS (
      SELECT id, created_by_id, p, scenario_id, g,
        (row_number() OVER (
          PARTITION BY created_by_id, p, scenario_id, g ORDER BY created_at, id
        ) - 1) / 4 AS chunk
      FROM grouped
    )
    UPDATE generated_images gi
    SET batch_key = 'inferred-' || md5(
      capped.created_by_id::text || '|' || capped.p || '|' ||
      coalesce(capped.scenario_id::text, '') || '|' || capped.g::text || '|' || capped.chunk::text
    )
    FROM capped
    WHERE capped.id = gi.id AND gi.batch_key IS NULL;`)

  // 버전 행도 같은 키를 갖게 한다 — 안 맞추면 되돌리기·버전 비교에서 묶음이 사라진다.
  await db.execute(sql`
    UPDATE "_generated_images_v" v
    SET version_batch_key = gi.batch_key
    FROM generated_images gi
    WHERE gi.id = v.parent_id AND v.version_batch_key IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "generated_images_batch_key_idx";
  DROP INDEX "generated_images_best_sample_idx";
  DROP INDEX "_generated_images_v_version_version_batch_key_idx";
  DROP INDEX "_generated_images_v_version_version_best_sample_idx";
  ALTER TABLE "generated_images" DROP COLUMN "batch_key";
  ALTER TABLE "generated_images" DROP COLUMN "best_sample";
  ALTER TABLE "_generated_images_v" DROP COLUMN "version_batch_key";
  ALTER TABLE "_generated_images_v" DROP COLUMN "version_best_sample";`)
}
