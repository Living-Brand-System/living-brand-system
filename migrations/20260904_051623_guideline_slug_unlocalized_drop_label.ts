import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * 챕터·토픽의 slug를 언어 공통으로 옮기고(locales → 본 테이블), 아무 데서도 그리지 않던 토픽 `label`을 지운다.
 *
 * 🔴 생성기가 낸 SQL은 새 컬럼을 비운 채 옛 컬럼을 지운다 — 그대로 돌리면 slug가 전부 사라지고,
 *    `guideline_chapters.slug NOT NULL`은 행이 있는 표에서 바로 터진다. 그래서 순서를 바꿨다:
 *    nullable로 추가 → 로케일 행에서 채움(ko 우선, 없으면 아무 로케일) → NOT NULL → 옛 컬럼 삭제.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
  DROP INDEX "guideline_chapters_slug_idx";
  DROP INDEX "guideline_docs_slug_idx";
  DROP INDEX "_guideline_docs_v_version_version_slug_idx";
  ALTER TABLE "guideline_chapters" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "guideline_chapters" ADD COLUMN "slug" varchar;
  ALTER TABLE "guideline_docs" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "guideline_docs" ADD COLUMN "slug" varchar;
  ALTER TABLE "_guideline_docs_v" ADD COLUMN "version_generate_slug" boolean DEFAULT true;
  ALTER TABLE "_guideline_docs_v" ADD COLUMN "version_slug" varchar;`)

	// 로케일 행에서 채운다. 서버 read 경로가 읽던 기본 로케일(ko)을 우선하고, ko가 없으면 아무 로케일.
	await db.execute(sql`
  UPDATE "guideline_chapters" c SET
    "slug" = l."slug",
    "generate_slug" = COALESCE(l."generate_slug", true)
  FROM (
    SELECT DISTINCT ON ("_parent_id") "_parent_id", "slug", "generate_slug"
    FROM "guideline_chapters_locales"
    WHERE "slug" IS NOT NULL
    ORDER BY "_parent_id", ("_locale" = 'ko') DESC
  ) l WHERE l."_parent_id" = c."id";

  UPDATE "guideline_docs" d SET
    "slug" = l."slug",
    "generate_slug" = COALESCE(l."generate_slug", true)
  FROM (
    SELECT DISTINCT ON ("_parent_id") "_parent_id", "slug", "generate_slug"
    FROM "guideline_docs_locales"
    WHERE "slug" IS NOT NULL
    ORDER BY "_parent_id", ("_locale" = 'ko') DESC
  ) l WHERE l."_parent_id" = d."id";

  UPDATE "_guideline_docs_v" v SET
    "version_slug" = l."version_slug",
    "version_generate_slug" = COALESCE(l."version_generate_slug", true)
  FROM (
    SELECT DISTINCT ON ("_parent_id") "_parent_id", "version_slug", "version_generate_slug"
    FROM "_guideline_docs_v_locales"
    WHERE "version_slug" IS NOT NULL
    ORDER BY "_parent_id", ("_locale" = 'ko') DESC
  ) l WHERE l."_parent_id" = v."id";`)

	await db.execute(sql`
  ALTER TABLE "guideline_chapters" ALTER COLUMN "slug" SET NOT NULL;
  CREATE UNIQUE INDEX "guideline_chapters_slug_idx" ON "guideline_chapters" USING btree ("slug");
  CREATE INDEX "guideline_docs_slug_idx" ON "guideline_docs" USING btree ("slug");
  CREATE INDEX "_guideline_docs_v_version_version_slug_idx" ON "_guideline_docs_v" USING btree ("version_slug");
  ALTER TABLE "guideline_chapters_locales" DROP COLUMN "generate_slug";
  ALTER TABLE "guideline_chapters_locales" DROP COLUMN "slug";
  ALTER TABLE "guideline_docs_locales" DROP COLUMN "label";
  ALTER TABLE "guideline_docs_locales" DROP COLUMN "generate_slug";
  ALTER TABLE "guideline_docs_locales" DROP COLUMN "slug";
  ALTER TABLE "_guideline_docs_v_locales" DROP COLUMN "version_label";
  ALTER TABLE "_guideline_docs_v_locales" DROP COLUMN "version_generate_slug";
  ALTER TABLE "_guideline_docs_v_locales" DROP COLUMN "version_slug";`)
}

/** 되돌릴 때는 공통 slug를 모든 로케일 행에 복사한다. `label`은 값이 없었으므로 빈 컬럼만 되살린다. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
  DROP INDEX "guideline_chapters_slug_idx";
  DROP INDEX "guideline_docs_slug_idx";
  DROP INDEX "_guideline_docs_v_version_version_slug_idx";
  ALTER TABLE "guideline_chapters_locales" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "guideline_chapters_locales" ADD COLUMN "slug" varchar;
  ALTER TABLE "guideline_docs_locales" ADD COLUMN "label" varchar;
  ALTER TABLE "guideline_docs_locales" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "guideline_docs_locales" ADD COLUMN "slug" varchar;
  ALTER TABLE "_guideline_docs_v_locales" ADD COLUMN "version_label" varchar;
  ALTER TABLE "_guideline_docs_v_locales" ADD COLUMN "version_generate_slug" boolean DEFAULT true;
  ALTER TABLE "_guideline_docs_v_locales" ADD COLUMN "version_slug" varchar;

  UPDATE "guideline_chapters_locales" l SET "slug" = c."slug", "generate_slug" = c."generate_slug"
    FROM "guideline_chapters" c WHERE c."id" = l."_parent_id";
  UPDATE "guideline_docs_locales" l SET "slug" = d."slug", "generate_slug" = d."generate_slug"
    FROM "guideline_docs" d WHERE d."id" = l."_parent_id";
  UPDATE "_guideline_docs_v_locales" l SET "version_slug" = v."version_slug", "version_generate_slug" = v."version_generate_slug"
    FROM "_guideline_docs_v" v WHERE v."id" = l."_parent_id";

  ALTER TABLE "guideline_chapters_locales" ALTER COLUMN "slug" SET NOT NULL;
  CREATE UNIQUE INDEX "guideline_chapters_slug_idx" ON "guideline_chapters_locales" USING btree ("slug","_locale");
  CREATE INDEX "guideline_docs_slug_idx" ON "guideline_docs_locales" USING btree ("slug","_locale");
  CREATE INDEX "_guideline_docs_v_version_version_slug_idx" ON "_guideline_docs_v_locales" USING btree ("version_slug","_locale");
  ALTER TABLE "guideline_chapters" DROP COLUMN "generate_slug";
  ALTER TABLE "guideline_chapters" DROP COLUMN "slug";
  ALTER TABLE "guideline_docs" DROP COLUMN "generate_slug";
  ALTER TABLE "guideline_docs" DROP COLUMN "slug";
  ALTER TABLE "_guideline_docs_v" DROP COLUMN "version_generate_slug";
  ALTER TABLE "_guideline_docs_v" DROP COLUMN "version_slug";`)
}
