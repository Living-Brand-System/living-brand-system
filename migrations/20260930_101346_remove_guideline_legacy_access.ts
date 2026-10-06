import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** CMS 등록만 제거한다. 구형 본문·버전 테이블은 이력 보존을 위해 삭제하지 않는다. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		DO $$ BEGIN
			IF EXISTS (SELECT 1 FROM "guideline_docs" WHERE "content_model" IS DISTINCT FROM 'sections') THEN
				RAISE EXCEPTION 'Legacy guideline documents remain. Migrate their content before removing legacy CMS access.';
			END IF;
		END $$;
		ALTER TABLE "guideline_docs" ALTER COLUMN "content_model" DROP DEFAULT;
		ALTER TABLE "_guideline_docs_v" ALTER COLUMN "version_content_model" DROP DEFAULT;
	`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
		ALTER TABLE "guideline_docs" ALTER COLUMN "content_model" SET DEFAULT 'legacy';
		ALTER TABLE "_guideline_docs_v" ALTER COLUMN "version_content_model" SET DEFAULT 'legacy';
	`)
}
