import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "guideline_chapters_locales" ADD COLUMN "description" varchar;
  ALTER TABLE "guideline_docs_locales" ADD COLUMN "description" varchar;
  ALTER TABLE "_guideline_docs_v_locales" ADD COLUMN "version_description" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "guideline_chapters_locales" DROP COLUMN "description";
  ALTER TABLE "guideline_docs_locales" DROP COLUMN "description";
  ALTER TABLE "_guideline_docs_v_locales" DROP COLUMN "version_description";`)
}
