import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "guideline_docs" DROP CONSTRAINT "guideline_docs_background_id_brand_colors_id_fk";
  
  ALTER TABLE "_guideline_docs_v" DROP CONSTRAINT "_guideline_docs_v_version_background_id_brand_colors_id_fk";
  
  DROP INDEX "guideline_docs_background_idx";
  DROP INDEX "_guideline_docs_v_version_version_background_idx";
  ALTER TABLE "sbk" DROP COLUMN "width";
  ALTER TABLE "blk" DROP COLUMN "width";
  ALTER TABLE "guideline_docs" DROP COLUMN "background_id";
  ALTER TABLE "guideline_docs" DROP COLUMN "background_tone";
  ALTER TABLE "guideline_docs_locales" DROP COLUMN "description";
  ALTER TABLE "_sbk_v" DROP COLUMN "width";
  ALTER TABLE "_blk_v" DROP COLUMN "width";
  ALTER TABLE "_guideline_docs_v" DROP COLUMN "version_background_id";
  ALTER TABLE "_guideline_docs_v" DROP COLUMN "version_background_tone";
  ALTER TABLE "_guideline_docs_v_locales" DROP COLUMN "version_description";
  DROP TYPE "public"."enum_block_width";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_block_width" AS ENUM('padded', 'full');
  ALTER TABLE "sbk" ADD COLUMN "width" "enum_block_width" DEFAULT 'padded';
  ALTER TABLE "blk" ADD COLUMN "width" "enum_block_width" DEFAULT 'padded';
  ALTER TABLE "guideline_docs" ADD COLUMN "background_id" integer;
  ALTER TABLE "guideline_docs" ADD COLUMN "background_tone" "enum_background_tone" DEFAULT 'solid';
  ALTER TABLE "guideline_docs_locales" ADD COLUMN "description" jsonb;
  ALTER TABLE "_sbk_v" ADD COLUMN "width" "enum_block_width" DEFAULT 'padded';
  ALTER TABLE "_blk_v" ADD COLUMN "width" "enum_block_width" DEFAULT 'padded';
  ALTER TABLE "_guideline_docs_v" ADD COLUMN "version_background_id" integer;
  ALTER TABLE "_guideline_docs_v" ADD COLUMN "version_background_tone" "enum_background_tone" DEFAULT 'solid';
  ALTER TABLE "_guideline_docs_v_locales" ADD COLUMN "version_description" jsonb;
  ALTER TABLE "guideline_docs" ADD CONSTRAINT "guideline_docs_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v" ADD CONSTRAINT "_guideline_docs_v_version_background_id_brand_colors_id_fk" FOREIGN KEY ("version_background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "guideline_docs_background_idx" ON "guideline_docs" USING btree ("background_id");
  CREATE INDEX "_guideline_docs_v_version_version_background_idx" ON "_guideline_docs_v" USING btree ("version_background_id");`)
}
