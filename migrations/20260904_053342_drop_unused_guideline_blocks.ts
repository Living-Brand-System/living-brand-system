import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * 한 번도 쓰이지 않은 블록 셋 — 하위 블록(sbk)·콜아웃·콘텐츠 열 — 의 테이블과 enum을 지운다.
 * 게시 스냅샷(2026-08-26) 기준 셋 모두 0건이다. 🔴 초안에 남은 행이 있으면 함께 사라진다.
 * `enum_image_scale`은 콘텐츠 열만 쓰던 공용 enum이라 같이 떨어진다.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "guideline_docs_blocks_content_columns_columns" CASCADE;
  DROP TABLE "guideline_docs_blocks_content_columns_columns_locales" CASCADE;
  DROP TABLE "guideline_docs_blocks_content_columns" CASCADE;
  DROP TABLE "guideline_docs_blocks_callout_items" CASCADE;
  DROP TABLE "guideline_docs_blocks_callout_items_locales" CASCADE;
  DROP TABLE "guideline_docs_blocks_callout" CASCADE;
  DROP TABLE "guideline_docs_blocks_callout_locales" CASCADE;
  DROP TABLE "sbk" CASCADE;
  DROP TABLE "sbk_locales" CASCADE;
  DROP TABLE "_guideline_docs_v_blocks_content_columns_columns" CASCADE;
  DROP TABLE "_guideline_docs_v_blocks_content_columns_columns_locales" CASCADE;
  DROP TABLE "_guideline_docs_v_blocks_content_columns" CASCADE;
  DROP TABLE "_guideline_docs_v_blocks_callout_items" CASCADE;
  DROP TABLE "_guideline_docs_v_blocks_callout_items_locales" CASCADE;
  DROP TABLE "_guideline_docs_v_blocks_callout" CASCADE;
  DROP TABLE "_guideline_docs_v_blocks_callout_locales" CASCADE;
  DROP TABLE "_sbk_v" CASCADE;
  DROP TABLE "_sbk_v_locales" CASCADE;
  DROP TYPE "public"."enum_image_scale";
  DROP TYPE "public"."enum_guideline_docs_blocks_content_columns_image_ratio";
  DROP TYPE "public"."enum_guideline_docs_blocks_callout_kind";
  DROP TYPE "public"."enum__guideline_docs_v_blocks_content_columns_image_ratio";
  DROP TYPE "public"."enum__guideline_docs_v_blocks_callout_kind";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_image_scale" AS ENUM('10', '20', '30', '40', '50', '60', '70', '80', '90', '100');
  CREATE TYPE "public"."enum_guideline_docs_blocks_content_columns_image_ratio" AS ENUM('original', '1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16');
  CREATE TYPE "public"."enum_guideline_docs_blocks_callout_kind" AS ENUM('must', 'recommended', 'dont');
  CREATE TYPE "public"."enum__guideline_docs_v_blocks_content_columns_image_ratio" AS ENUM('original', '1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16');
  CREATE TYPE "public"."enum__guideline_docs_v_blocks_callout_kind" AS ENUM('must', 'recommended', 'dont');
  CREATE TABLE "guideline_docs_blocks_content_columns_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_background_color_id" integer,
  	"image_scale" "enum_image_scale" DEFAULT '100'
  );
  
  CREATE TABLE "guideline_docs_blocks_content_columns_columns_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "guideline_docs_blocks_content_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_ratio" "enum_guideline_docs_blocks_content_columns_image_ratio" DEFAULT '4:3',
  	"block_name" varchar
  );
  
  CREATE TABLE "guideline_docs_blocks_callout_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "guideline_docs_blocks_callout_items_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "guideline_docs_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_guideline_docs_blocks_callout_kind" DEFAULT 'must',
  	"block_name" varchar
  );
  
  CREATE TABLE "guideline_docs_blocks_callout_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "sbk" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background_id" integer,
  	"background_tone" "enum_background_tone" DEFAULT 'solid',
  	"inner_background_id" integer,
  	"arrangement" "enum_block_arrangement" DEFAULT 'grid',
  	"columns" numeric DEFAULT 2,
  	"gap" "enum_block_gap" DEFAULT 'default',
  	"aspect_ratio" "enum_block_aspect_ratio" DEFAULT '1:1',
  	"block_name" varchar
  );
  
  CREATE TABLE "sbk_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_guideline_docs_v_blocks_content_columns_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_background_color_id" integer,
  	"image_scale" "enum_image_scale" DEFAULT '100',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_guideline_docs_v_blocks_content_columns_columns_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_guideline_docs_v_blocks_content_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_ratio" "enum__guideline_docs_v_blocks_content_columns_image_ratio" DEFAULT '4:3',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_guideline_docs_v_blocks_callout_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_guideline_docs_v_blocks_callout_items_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_guideline_docs_v_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__guideline_docs_v_blocks_callout_kind" DEFAULT 'must',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_guideline_docs_v_blocks_callout_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_sbk_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background_id" integer,
  	"background_tone" "enum_background_tone" DEFAULT 'solid',
  	"inner_background_id" integer,
  	"arrangement" "enum_block_arrangement" DEFAULT 'grid',
  	"columns" numeric DEFAULT 2,
  	"gap" "enum_block_gap" DEFAULT 'default',
  	"aspect_ratio" "enum_block_aspect_ratio" DEFAULT '1:1',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_sbk_v_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "guideline_docs_blocks_content_columns_columns" ADD CONSTRAINT "guideline_docs_blocks_content_columns_columns_image_id_application_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guideline_docs_blocks_content_columns_columns" ADD CONSTRAINT "guideline_docs_blocks_content_columns_columns_image_background_color_id_brand_colors_id_fk" FOREIGN KEY ("image_background_color_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guideline_docs_blocks_content_columns_columns" ADD CONSTRAINT "guideline_docs_blocks_content_columns_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs_blocks_content_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guideline_docs_blocks_content_columns_columns_locales" ADD CONSTRAINT "guideline_docs_blocks_content_columns_columns_locales_par_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs_blocks_content_columns_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guideline_docs_blocks_content_columns" ADD CONSTRAINT "guideline_docs_blocks_content_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guideline_docs_blocks_callout_items" ADD CONSTRAINT "guideline_docs_blocks_callout_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guideline_docs_blocks_callout_items_locales" ADD CONSTRAINT "guideline_docs_blocks_callout_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs_blocks_callout_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guideline_docs_blocks_callout" ADD CONSTRAINT "guideline_docs_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guideline_docs_blocks_callout_locales" ADD CONSTRAINT "guideline_docs_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sbk" ADD CONSTRAINT "sbk_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sbk" ADD CONSTRAINT "sbk_inner_background_id_brand_colors_id_fk" FOREIGN KEY ("inner_background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sbk" ADD CONSTRAINT "sbk_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sbk_locales" ADD CONSTRAINT "sbk_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sbk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_blocks_content_columns_columns" ADD CONSTRAINT "_guideline_docs_v_blocks_content_columns_columns_image_id_application_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_blocks_content_columns_columns" ADD CONSTRAINT "_guideline_docs_v_blocks_content_columns_columns_image_background_color_id_brand_colors_id_fk" FOREIGN KEY ("image_background_color_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_blocks_content_columns_columns" ADD CONSTRAINT "_guideline_docs_v_blocks_content_columns_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v_blocks_content_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_blocks_content_columns_columns_locales" ADD CONSTRAINT "_guideline_docs_v_blocks_content_columns_columns_locales__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v_blocks_content_columns_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_blocks_content_columns" ADD CONSTRAINT "_guideline_docs_v_blocks_content_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_blocks_callout_items" ADD CONSTRAINT "_guideline_docs_v_blocks_callout_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_blocks_callout_items_locales" ADD CONSTRAINT "_guideline_docs_v_blocks_callout_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v_blocks_callout_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_blocks_callout" ADD CONSTRAINT "_guideline_docs_v_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_blocks_callout_locales" ADD CONSTRAINT "_guideline_docs_v_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sbk_v" ADD CONSTRAINT "_sbk_v_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sbk_v" ADD CONSTRAINT "_sbk_v_inner_background_id_brand_colors_id_fk" FOREIGN KEY ("inner_background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sbk_v" ADD CONSTRAINT "_sbk_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sbk_v_locales" ADD CONSTRAINT "_sbk_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_sbk_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "guideline_docs_blocks_content_columns_columns_order_idx" ON "guideline_docs_blocks_content_columns_columns" USING btree ("_order");
  CREATE INDEX "guideline_docs_blocks_content_columns_columns_parent_id_idx" ON "guideline_docs_blocks_content_columns_columns" USING btree ("_parent_id");
  CREATE INDEX "guideline_docs_blocks_content_columns_columns_image_idx" ON "guideline_docs_blocks_content_columns_columns" USING btree ("image_id");
  CREATE INDEX "guideline_docs_blocks_content_columns_columns_image_back_idx" ON "guideline_docs_blocks_content_columns_columns" USING btree ("image_background_color_id");
  CREATE UNIQUE INDEX "guideline_docs_blocks_content_columns_columns_locales_locale" ON "guideline_docs_blocks_content_columns_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "guideline_docs_blocks_content_columns_order_idx" ON "guideline_docs_blocks_content_columns" USING btree ("_order");
  CREATE INDEX "guideline_docs_blocks_content_columns_parent_id_idx" ON "guideline_docs_blocks_content_columns" USING btree ("_parent_id");
  CREATE INDEX "guideline_docs_blocks_content_columns_path_idx" ON "guideline_docs_blocks_content_columns" USING btree ("_path");
  CREATE INDEX "guideline_docs_blocks_callout_items_order_idx" ON "guideline_docs_blocks_callout_items" USING btree ("_order");
  CREATE INDEX "guideline_docs_blocks_callout_items_parent_id_idx" ON "guideline_docs_blocks_callout_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "guideline_docs_blocks_callout_items_locales_locale_parent_id" ON "guideline_docs_blocks_callout_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "guideline_docs_blocks_callout_order_idx" ON "guideline_docs_blocks_callout" USING btree ("_order");
  CREATE INDEX "guideline_docs_blocks_callout_parent_id_idx" ON "guideline_docs_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "guideline_docs_blocks_callout_path_idx" ON "guideline_docs_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "guideline_docs_blocks_callout_locales_locale_parent_id_uniqu" ON "guideline_docs_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "sbk_order_idx" ON "sbk" USING btree ("_order");
  CREATE INDEX "sbk_parent_id_idx" ON "sbk" USING btree ("_parent_id");
  CREATE INDEX "sbk_path_idx" ON "sbk" USING btree ("_path");
  CREATE INDEX "sbk_background_idx" ON "sbk" USING btree ("background_id");
  CREATE INDEX "sbk_inner_background_idx" ON "sbk" USING btree ("inner_background_id");
  CREATE UNIQUE INDEX "sbk_locales_locale_parent_id_unique" ON "sbk_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_guideline_docs_v_blocks_content_columns_columns_order_idx" ON "_guideline_docs_v_blocks_content_columns_columns" USING btree ("_order");
  CREATE INDEX "_guideline_docs_v_blocks_content_columns_columns_parent_id_idx" ON "_guideline_docs_v_blocks_content_columns_columns" USING btree ("_parent_id");
  CREATE INDEX "_guideline_docs_v_blocks_content_columns_columns_image_idx" ON "_guideline_docs_v_blocks_content_columns_columns" USING btree ("image_id");
  CREATE INDEX "_guideline_docs_v_blocks_content_columns_columns_image_b_idx" ON "_guideline_docs_v_blocks_content_columns_columns" USING btree ("image_background_color_id");
  CREATE UNIQUE INDEX "_guideline_docs_v_blocks_content_columns_columns_locales_loc" ON "_guideline_docs_v_blocks_content_columns_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_guideline_docs_v_blocks_content_columns_order_idx" ON "_guideline_docs_v_blocks_content_columns" USING btree ("_order");
  CREATE INDEX "_guideline_docs_v_blocks_content_columns_parent_id_idx" ON "_guideline_docs_v_blocks_content_columns" USING btree ("_parent_id");
  CREATE INDEX "_guideline_docs_v_blocks_content_columns_path_idx" ON "_guideline_docs_v_blocks_content_columns" USING btree ("_path");
  CREATE INDEX "_guideline_docs_v_blocks_callout_items_order_idx" ON "_guideline_docs_v_blocks_callout_items" USING btree ("_order");
  CREATE INDEX "_guideline_docs_v_blocks_callout_items_parent_id_idx" ON "_guideline_docs_v_blocks_callout_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_guideline_docs_v_blocks_callout_items_locales_locale_parent" ON "_guideline_docs_v_blocks_callout_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_guideline_docs_v_blocks_callout_order_idx" ON "_guideline_docs_v_blocks_callout" USING btree ("_order");
  CREATE INDEX "_guideline_docs_v_blocks_callout_parent_id_idx" ON "_guideline_docs_v_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "_guideline_docs_v_blocks_callout_path_idx" ON "_guideline_docs_v_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "_guideline_docs_v_blocks_callout_locales_locale_parent_id_un" ON "_guideline_docs_v_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_sbk_v_order_idx" ON "_sbk_v" USING btree ("_order");
  CREATE INDEX "_sbk_v_parent_id_idx" ON "_sbk_v" USING btree ("_parent_id");
  CREATE INDEX "_sbk_v_path_idx" ON "_sbk_v" USING btree ("_path");
  CREATE INDEX "_sbk_v_background_idx" ON "_sbk_v" USING btree ("background_id");
  CREATE INDEX "_sbk_v_inner_background_idx" ON "_sbk_v" USING btree ("inner_background_id");
  CREATE UNIQUE INDEX "_sbk_v_locales_locale_parent_id_unique" ON "_sbk_v_locales" USING btree ("_locale","_parent_id");`)
}
