import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_templates_output_kind" AS ENUM('digital', 'print');
  CREATE TYPE "public"."enum__templates_v_version_output_kind" AS ENUM('digital', 'print');
  ALTER TABLE "templates" ADD COLUMN "output_kind" "enum_templates_output_kind" DEFAULT 'digital';
  ALTER TABLE "templates" ADD COLUMN "size_width" numeric;
  ALTER TABLE "templates" ADD COLUMN "size_height" numeric;
  ALTER TABLE "_templates_v" ADD COLUMN "version_output_kind" "enum__templates_v_version_output_kind" DEFAULT 'digital';
  ALTER TABLE "_templates_v" ADD COLUMN "version_size_width" numeric;
  ALTER TABLE "_templates_v" ADD COLUMN "version_size_height" numeric;`)
  // 기존 템플릿은 모두 디지털판이다 — 판형 크기를 Figma 판 크기(px)로 채운다.
  await db.execute(sql`
   UPDATE "templates" SET "size_width" = "width", "size_height" = "height"
   WHERE "width" IS NOT NULL AND "height" IS NOT NULL;
   UPDATE "_templates_v" SET "version_size_width" = "version_width", "version_size_height" = "version_height"
   WHERE "version_width" IS NOT NULL AND "version_height" IS NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" DROP COLUMN "output_kind";
  ALTER TABLE "templates" DROP COLUMN "size_width";
  ALTER TABLE "templates" DROP COLUMN "size_height";
  ALTER TABLE "_templates_v" DROP COLUMN "version_output_kind";
  ALTER TABLE "_templates_v" DROP COLUMN "version_size_width";
  ALTER TABLE "_templates_v" DROP COLUMN "version_size_height";
  DROP TYPE "public"."enum_templates_output_kind";
  DROP TYPE "public"."enum__templates_v_version_output_kind";`)
}
