import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brand_logos" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "brand_logos" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "_brand_logos_v" ADD COLUMN "version_prefix" varchar DEFAULT '';
  ALTER TABLE "_brand_logos_v" ADD COLUMN "version__objectkey" varchar;
  ALTER TABLE "brand_typefaces" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "brand_typefaces" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "_brand_typefaces_v" ADD COLUMN "version_prefix" varchar DEFAULT '';
  ALTER TABLE "_brand_typefaces_v" ADD COLUMN "version__objectkey" varchar;
  ALTER TABLE "brand_icons" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "brand_icons" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "_brand_icons_v" ADD COLUMN "version_prefix" varchar DEFAULT '';
  ALTER TABLE "_brand_icons_v" ADD COLUMN "version__objectkey" varchar;
  ALTER TABLE "application_images" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "application_images" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "_application_images_v" ADD COLUMN "version_prefix" varchar DEFAULT '';
  ALTER TABLE "_application_images_v" ADD COLUMN "version__objectkey" varchar;
  ALTER TABLE "sample_images" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "sample_images" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "_sample_images_v" ADD COLUMN "version_prefix" varchar DEFAULT '';
  ALTER TABLE "_sample_images_v" ADD COLUMN "version__objectkey" varchar;
  ALTER TABLE "generated_images" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "generated_images" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "_generated_images_v" ADD COLUMN "version_prefix" varchar DEFAULT '';
  ALTER TABLE "_generated_images_v" ADD COLUMN "version__objectkey" varchar;
  ALTER TABLE "template_assets" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "template_assets" ADD COLUMN "_objectkey" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brand_logos" DROP COLUMN "prefix";
  ALTER TABLE "brand_logos" DROP COLUMN "_objectkey";
  ALTER TABLE "_brand_logos_v" DROP COLUMN "version_prefix";
  ALTER TABLE "_brand_logos_v" DROP COLUMN "version__objectkey";
  ALTER TABLE "brand_typefaces" DROP COLUMN "prefix";
  ALTER TABLE "brand_typefaces" DROP COLUMN "_objectkey";
  ALTER TABLE "_brand_typefaces_v" DROP COLUMN "version_prefix";
  ALTER TABLE "_brand_typefaces_v" DROP COLUMN "version__objectkey";
  ALTER TABLE "brand_icons" DROP COLUMN "prefix";
  ALTER TABLE "brand_icons" DROP COLUMN "_objectkey";
  ALTER TABLE "_brand_icons_v" DROP COLUMN "version_prefix";
  ALTER TABLE "_brand_icons_v" DROP COLUMN "version__objectkey";
  ALTER TABLE "application_images" DROP COLUMN "prefix";
  ALTER TABLE "application_images" DROP COLUMN "_objectkey";
  ALTER TABLE "_application_images_v" DROP COLUMN "version_prefix";
  ALTER TABLE "_application_images_v" DROP COLUMN "version__objectkey";
  ALTER TABLE "sample_images" DROP COLUMN "prefix";
  ALTER TABLE "sample_images" DROP COLUMN "_objectkey";
  ALTER TABLE "_sample_images_v" DROP COLUMN "version_prefix";
  ALTER TABLE "_sample_images_v" DROP COLUMN "version__objectkey";
  ALTER TABLE "generated_images" DROP COLUMN "prefix";
  ALTER TABLE "generated_images" DROP COLUMN "_objectkey";
  ALTER TABLE "_generated_images_v" DROP COLUMN "version_prefix";
  ALTER TABLE "_generated_images_v" DROP COLUMN "version__objectkey";
  ALTER TABLE "template_assets" DROP COLUMN "prefix";
  ALTER TABLE "template_assets" DROP COLUMN "_objectkey";`)
}
