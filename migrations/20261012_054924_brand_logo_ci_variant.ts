import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_brand_logos_ci_variant" AS ENUM('default', 'wordmark', 'mono-black', 'mono-white');
  CREATE TYPE "public"."enum__brand_logos_v_version_ci_variant" AS ENUM('default', 'wordmark', 'mono-black', 'mono-white');
  ALTER TABLE "brand_logos" ADD COLUMN "ci_shape" varchar;
  ALTER TABLE "brand_logos" ADD COLUMN "ci_variant" "enum_brand_logos_ci_variant";
  ALTER TABLE "_brand_logos_v" ADD COLUMN "version_ci_shape" varchar;
  ALTER TABLE "_brand_logos_v" ADD COLUMN "version_ci_variant" "enum__brand_logos_v_version_ci_variant";`)

  // CI 색은 mask(vectorColor·vectorFit)가 아니라 칠된 로고 파일(vectorAsset)로 바꾼다. 노드 설정 스키마가
  // strict라 남은 키는 템플릿 파싱을 막으므로 저장분에서 지운다(되돌릴 수 없다 — down은 컬럼만 되돌린다).
  await db.execute(sql`
   UPDATE "templates" SET "overrides" = (
     SELECT jsonb_object_agg(e.key, CASE WHEN jsonb_typeof(e.value) = 'object' THEN e.value - 'vectorColor' - 'vectorFit' ELSE e.value END) FROM jsonb_each("overrides") e
   ) WHERE jsonb_typeof("overrides") = 'object' AND "overrides"::text ~ '"vector(Color|Fit)"';
  UPDATE "_templates_v" SET "version_overrides" = (
     SELECT jsonb_object_agg(e.key, CASE WHEN jsonb_typeof(e.value) = 'object' THEN e.value - 'vectorColor' - 'vectorFit' ELSE e.value END) FROM jsonb_each("version_overrides") e
   ) WHERE jsonb_typeof("version_overrides") = 'object' AND "version_overrides"::text ~ '"vector(Color|Fit)"';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brand_logos" DROP COLUMN "ci_shape";
  ALTER TABLE "brand_logos" DROP COLUMN "ci_variant";
  ALTER TABLE "_brand_logos_v" DROP COLUMN "version_ci_shape";
  ALTER TABLE "_brand_logos_v" DROP COLUMN "version_ci_variant";
  DROP TYPE "public"."enum_brand_logos_ci_variant";
  DROP TYPE "public"."enum__brand_logos_v_version_ci_variant";`)
}
