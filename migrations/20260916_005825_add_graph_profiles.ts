import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_graph_profiles_export_policy_allowed_formats" AS ENUM('png', 'jpeg', 'tiff', 'pdf', 'svg', 'mp4');
  CREATE TYPE "public"."enum_graph_profiles_runtime" AS ENUM('infographic');
  CREATE TYPE "public"."enum_graph_profiles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__graph_profiles_v_version_export_policy_allowed_formats" AS ENUM('png', 'jpeg', 'tiff', 'pdf', 'svg', 'mp4');
  CREATE TYPE "public"."enum__graph_profiles_v_version_runtime" AS ENUM('infographic');
  CREATE TYPE "public"."enum__graph_profiles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__graph_profiles_v_published_locale" AS ENUM('ko', 'en');
  CREATE TABLE "graph_profiles_export_policy_allowed_formats" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_graph_profiles_export_policy_allowed_formats",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "graph_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"runtime" "enum_graph_profiles_runtime",
  	"preview_image_id" integer,
  	"display_order" numeric DEFAULT 0,
  	"controller_restrictions" jsonb,
  	"controller_presentation" jsonb,
  	"export_policy_print_allowed_ppi" jsonb,
  	"export_policy_video_allowed_fps" jsonb,
  	"export_policy_video_max_duration_seconds" numeric,
  	"export_policy_video_max_width" numeric,
  	"export_policy_video_max_height" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_graph_profiles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_graph_profiles_v_version_export_policy_allowed_formats" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__graph_profiles_v_version_export_policy_allowed_formats",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_graph_profiles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_runtime" "enum__graph_profiles_v_version_runtime",
  	"version_preview_image_id" integer,
  	"version_display_order" numeric DEFAULT 0,
  	"version_controller_restrictions" jsonb,
  	"version_controller_presentation" jsonb,
  	"version_export_policy_print_allowed_ppi" jsonb,
  	"version_export_policy_video_allowed_fps" jsonb,
  	"version_export_policy_video_max_duration_seconds" numeric,
  	"version_export_policy_video_max_width" numeric,
  	"version_export_policy_video_max_height" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__graph_profiles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__graph_profiles_v_published_locale",
  	"latest" boolean
  );
  
  -- 🔴 아래에서 enum을 다시 만들며 'infographic'을 뺀다. 그 값을 쓰는 행이 남아 있으면
  -- USING 캐스팅이 실패해 마이그레이션이 통째로 죽으므로 먼저 치운다.
  -- 이 행은 콘텐츠가 아니라 레퍼런스 데이터다 — Graph 컬렉션에는
  -- scripts/seed-infographic-profile.ts가 다시 심는다(재실행 안전).
  DELETE FROM "_graphic_profiles_v" WHERE "version_runtime" = 'infographic';
  DELETE FROM "graphic_profiles_export_policy_allowed_formats" WHERE "parent_id" IN (
    SELECT "id" FROM "graphic_profiles" WHERE "runtime" = 'infographic'
  );
  DELETE FROM "graphic_profiles" WHERE "runtime" = 'infographic';

  ALTER TABLE "graphic_profiles" ALTER COLUMN "runtime" SET DATA TYPE text;
  DROP TYPE "public"."enum_graphic_profiles_runtime";
  CREATE TYPE "public"."enum_graphic_profiles_runtime" AS ENUM('fluted-glass', 'forward-straight', 'key-visual-formation', 'key-visual-line', 'key-visual-pattern');
  ALTER TABLE "graphic_profiles" ALTER COLUMN "runtime" SET DATA TYPE "public"."enum_graphic_profiles_runtime" USING "runtime"::"public"."enum_graphic_profiles_runtime";
  ALTER TABLE "_graphic_profiles_v" ALTER COLUMN "version_runtime" SET DATA TYPE text;
  DROP TYPE "public"."enum__graphic_profiles_v_version_runtime";
  CREATE TYPE "public"."enum__graphic_profiles_v_version_runtime" AS ENUM('fluted-glass', 'forward-straight', 'key-visual-formation', 'key-visual-line', 'key-visual-pattern');
  ALTER TABLE "_graphic_profiles_v" ALTER COLUMN "version_runtime" SET DATA TYPE "public"."enum__graphic_profiles_v_version_runtime" USING "version_runtime"::"public"."enum__graphic_profiles_v_version_runtime";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "graph_profiles_id" integer;
  ALTER TABLE "graph_profiles_export_policy_allowed_formats" ADD CONSTRAINT "graph_profiles_export_policy_allowed_formats_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."graph_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "graph_profiles" ADD CONSTRAINT "graph_profiles_preview_image_id_application_images_id_fk" FOREIGN KEY ("preview_image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_graph_profiles_v_version_export_policy_allowed_formats" ADD CONSTRAINT "_graph_profiles_v_version_export_policy_allowed_formats_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_graph_profiles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_graph_profiles_v" ADD CONSTRAINT "_graph_profiles_v_parent_id_graph_profiles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."graph_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_graph_profiles_v" ADD CONSTRAINT "_graph_profiles_v_version_preview_image_id_application_images_id_fk" FOREIGN KEY ("version_preview_image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "graph_profiles_export_policy_allowed_formats_order_idx" ON "graph_profiles_export_policy_allowed_formats" USING btree ("order");
  CREATE INDEX "graph_profiles_export_policy_allowed_formats_parent_idx" ON "graph_profiles_export_policy_allowed_formats" USING btree ("parent_id");
  CREATE UNIQUE INDEX "graph_profiles_runtime_idx" ON "graph_profiles" USING btree ("runtime");
  CREATE INDEX "graph_profiles_preview_image_idx" ON "graph_profiles" USING btree ("preview_image_id");
  CREATE INDEX "graph_profiles_updated_at_idx" ON "graph_profiles" USING btree ("updated_at");
  CREATE INDEX "graph_profiles_created_at_idx" ON "graph_profiles" USING btree ("created_at");
  CREATE INDEX "graph_profiles__status_idx" ON "graph_profiles" USING btree ("_status");
  CREATE INDEX "_graph_profiles_v_version_export_policy_allowed_formats_order_idx" ON "_graph_profiles_v_version_export_policy_allowed_formats" USING btree ("order");
  CREATE INDEX "_graph_profiles_v_version_export_policy_allowed_formats_parent_idx" ON "_graph_profiles_v_version_export_policy_allowed_formats" USING btree ("parent_id");
  CREATE INDEX "_graph_profiles_v_parent_idx" ON "_graph_profiles_v" USING btree ("parent_id");
  CREATE INDEX "_graph_profiles_v_version_version_runtime_idx" ON "_graph_profiles_v" USING btree ("version_runtime");
  CREATE INDEX "_graph_profiles_v_version_version_preview_image_idx" ON "_graph_profiles_v" USING btree ("version_preview_image_id");
  CREATE INDEX "_graph_profiles_v_version_version_updated_at_idx" ON "_graph_profiles_v" USING btree ("version_updated_at");
  CREATE INDEX "_graph_profiles_v_version_version_created_at_idx" ON "_graph_profiles_v" USING btree ("version_created_at");
  CREATE INDEX "_graph_profiles_v_version_version__status_idx" ON "_graph_profiles_v" USING btree ("version__status");
  CREATE INDEX "_graph_profiles_v_created_at_idx" ON "_graph_profiles_v" USING btree ("created_at");
  CREATE INDEX "_graph_profiles_v_updated_at_idx" ON "_graph_profiles_v" USING btree ("updated_at");
  CREATE INDEX "_graph_profiles_v_snapshot_idx" ON "_graph_profiles_v" USING btree ("snapshot");
  CREATE INDEX "_graph_profiles_v_published_locale_idx" ON "_graph_profiles_v" USING btree ("published_locale");
  CREATE INDEX "_graph_profiles_v_latest_idx" ON "_graph_profiles_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_graph_profiles_fk" FOREIGN KEY ("graph_profiles_id") REFERENCES "public"."graph_profiles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_graph_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("graph_profiles_id");`)
}

/**
 * 🔴 되돌려도 Graph 프로파일 행은 돌아오지 않는다 — 스키마만 되돌린다.
 * 행은 seed로 다시 심는다(scripts/seed-infographic-profile.ts).
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_graphic_profiles_runtime" ADD VALUE 'infographic' BEFORE 'key-visual-formation';
  ALTER TYPE "public"."enum__graphic_profiles_v_version_runtime" ADD VALUE 'infographic' BEFORE 'key-visual-formation';
  ALTER TABLE "graph_profiles_export_policy_allowed_formats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "graph_profiles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_graph_profiles_v_version_export_policy_allowed_formats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_graph_profiles_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "graph_profiles_export_policy_allowed_formats" CASCADE;
  DROP TABLE "graph_profiles" CASCADE;
  DROP TABLE "_graph_profiles_v_version_export_policy_allowed_formats" CASCADE;
  DROP TABLE "_graph_profiles_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_graph_profiles_fk";
  
  DROP INDEX "payload_locked_documents_rels_graph_profiles_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "graph_profiles_id";
  DROP TYPE "public"."enum_graph_profiles_export_policy_allowed_formats";
  DROP TYPE "public"."enum_graph_profiles_runtime";
  DROP TYPE "public"."enum_graph_profiles_status";
  DROP TYPE "public"."enum__graph_profiles_v_version_export_policy_allowed_formats";
  DROP TYPE "public"."enum__graph_profiles_v_version_runtime";
  DROP TYPE "public"."enum__graph_profiles_v_version_status";
  DROP TYPE "public"."enum__graph_profiles_v_published_locale";`)
}
