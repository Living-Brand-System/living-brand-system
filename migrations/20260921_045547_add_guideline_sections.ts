import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cards_ratio" AS ENUM('1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16');
  CREATE TYPE "public"."enum_cards_display_type" AS ENUM('image');
  CREATE TYPE "public"."enum_cards_display_fit" AS ENUM('contain', 'cover');
  CREATE TYPE "public"."enum_cards_status" AS ENUM('none', 'allowed', 'prohibited');
  CREATE TYPE "public"."enum_cards_download_source" AS ENUM('none', 'assets', 'registered');
  CREATE TYPE "public"."enum_cards_caption_type" AS ENUM('basic', 'list', 'specification');
  CREATE TYPE "public"."enum_containers_type" AS ENUM('grid');
  CREATE TYPE "public"."enum_containers_columns" AS ENUM('1', '2', '3', '4', '5');
  CREATE TYPE "public"."enum_containers_size" AS ENUM('xs', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "public"."enum_sections_type" AS ENUM('section', 'subsection', 'incorrect-usages');
  CREATE TYPE "public"."enum_sections_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_sections_download_source" AS ENUM('none', 'assets', 'registered');
  CREATE TYPE "public"."enum_guideline_docs_content_model" AS ENUM('legacy', 'sections');
  CREATE TYPE "public"."enum__cards_v_ratio" AS ENUM('1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16');
  CREATE TYPE "public"."enum__cards_v_display_type" AS ENUM('image');
  CREATE TYPE "public"."enum__cards_v_display_fit" AS ENUM('contain', 'cover');
  CREATE TYPE "public"."enum__cards_v_status" AS ENUM('none', 'allowed', 'prohibited');
  CREATE TYPE "public"."enum__cards_v_download_source" AS ENUM('none', 'assets', 'registered');
  CREATE TYPE "public"."enum__cards_v_caption_type" AS ENUM('basic', 'list', 'specification');
  CREATE TYPE "public"."enum__containers_v_type" AS ENUM('grid');
  CREATE TYPE "public"."enum__containers_v_columns" AS ENUM('1', '2', '3', '4', '5');
  CREATE TYPE "public"."enum__containers_v_size" AS ENUM('xs', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "public"."enum__sections_v_type" AS ENUM('section', 'subsection', 'incorrect-usages');
  CREATE TYPE "public"."enum__sections_v_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__sections_v_download_source" AS ENUM('none', 'assets', 'registered');
  CREATE TYPE "public"."enum__guideline_docs_v_version_content_model" AS ENUM('legacy', 'sections');
  CREATE TABLE "rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ratio" "enum_cards_ratio" DEFAULT '4:3',
  	"display_type" "enum_cards_display_type" DEFAULT 'image',
  	"display_fit" "enum_cards_display_fit" DEFAULT 'contain',
  	"display_scale" numeric DEFAULT 80,
  	"status" "enum_cards_status",
  	"download_source" "enum_cards_download_source" DEFAULT 'none',
  	"caption_type" "enum_cards_caption_type" DEFAULT 'basic'
  );
  
  CREATE TABLE "cards_locales" (
  	"display_alt" varchar,
  	"caption_title" varchar,
  	"caption_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "containers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_containers_type" DEFAULT 'grid',
  	"columns" "enum_containers_columns" DEFAULT '3',
  	"size" "enum_containers_size" DEFAULT 'md'
  );
  
  CREATE TABLE "sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_sections_type" DEFAULT 'section',
  	"anchor" varchar,
  	"align" "enum_sections_align" DEFAULT 'start',
  	"download_source" "enum_sections_download_source" DEFAULT 'none'
  );
  
  CREATE TABLE "sections_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_rows_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cards_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ratio" "enum__cards_v_ratio" DEFAULT '4:3',
  	"display_type" "enum__cards_v_display_type" DEFAULT 'image',
  	"display_fit" "enum__cards_v_display_fit" DEFAULT 'contain',
  	"display_scale" numeric DEFAULT 80,
  	"status" "enum__cards_v_status",
  	"download_source" "enum__cards_v_download_source" DEFAULT 'none',
  	"caption_type" "enum__cards_v_caption_type" DEFAULT 'basic',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cards_v_locales" (
  	"display_alt" varchar,
  	"caption_title" varchar,
  	"caption_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_containers_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__containers_v_type" DEFAULT 'grid',
  	"columns" "enum__containers_v_columns" DEFAULT '3',
  	"size" "enum__containers_v_size" DEFAULT 'md',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_sections_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__sections_v_type" DEFAULT 'section',
  	"anchor" varchar,
  	"align" "enum__sections_v_align" DEFAULT 'start',
  	"download_source" "enum__sections_v_download_source" DEFAULT 'none',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_sections_v_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "guideline_docs" ADD COLUMN "content_model" "enum_guideline_docs_content_model" DEFAULT 'legacy';
  ALTER TABLE "guideline_docs_rels" ADD COLUMN "application_images_id" integer;
  ALTER TABLE "guideline_docs_rels" ADD COLUMN "brand_icons_id" integer;
  ALTER TABLE "guideline_docs_rels" ADD COLUMN "brand_logos_id" integer;
  ALTER TABLE "_guideline_docs_v" ADD COLUMN "version_content_model" "enum__guideline_docs_v_version_content_model" DEFAULT 'legacy';
  ALTER TABLE "_guideline_docs_v_rels" ADD COLUMN "application_images_id" integer;
  ALTER TABLE "_guideline_docs_v_rels" ADD COLUMN "brand_icons_id" integer;
  ALTER TABLE "_guideline_docs_v_rels" ADD COLUMN "brand_logos_id" integer;
  ALTER TABLE "rows" ADD CONSTRAINT "rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cards" ADD CONSTRAINT "cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."containers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cards_locales" ADD CONSTRAINT "cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "containers" ADD CONSTRAINT "containers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sections" ADD CONSTRAINT "sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sections_locales" ADD CONSTRAINT "sections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_rows_v" ADD CONSTRAINT "_rows_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cards_v" ADD CONSTRAINT "_cards_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_containers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cards_v_locales" ADD CONSTRAINT "_cards_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_containers_v" ADD CONSTRAINT "_containers_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_sections_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sections_v" ADD CONSTRAINT "_sections_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sections_v_locales" ADD CONSTRAINT "_sections_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_sections_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "rows_order_idx" ON "rows" USING btree ("_order");
  CREATE INDEX "rows_parent_id_idx" ON "rows" USING btree ("_parent_id");
  CREATE INDEX "rows_locale_idx" ON "rows" USING btree ("_locale");
  CREATE INDEX "cards_order_idx" ON "cards" USING btree ("_order");
  CREATE INDEX "cards_parent_id_idx" ON "cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "cards_locales_locale_parent_id_unique" ON "cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "containers_order_idx" ON "containers" USING btree ("_order");
  CREATE INDEX "containers_parent_id_idx" ON "containers" USING btree ("_parent_id");
  CREATE INDEX "sections_order_idx" ON "sections" USING btree ("_order");
  CREATE INDEX "sections_parent_id_idx" ON "sections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "sections_locales_locale_parent_id_unique" ON "sections_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_rows_v_order_idx" ON "_rows_v" USING btree ("_order");
  CREATE INDEX "_rows_v_parent_id_idx" ON "_rows_v" USING btree ("_parent_id");
  CREATE INDEX "_rows_v_locale_idx" ON "_rows_v" USING btree ("_locale");
  CREATE INDEX "_cards_v_order_idx" ON "_cards_v" USING btree ("_order");
  CREATE INDEX "_cards_v_parent_id_idx" ON "_cards_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_cards_v_locales_locale_parent_id_unique" ON "_cards_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_containers_v_order_idx" ON "_containers_v" USING btree ("_order");
  CREATE INDEX "_containers_v_parent_id_idx" ON "_containers_v" USING btree ("_parent_id");
  CREATE INDEX "_sections_v_order_idx" ON "_sections_v" USING btree ("_order");
  CREATE INDEX "_sections_v_parent_id_idx" ON "_sections_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_sections_v_locales_locale_parent_id_unique" ON "_sections_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "guideline_docs_rels" ADD CONSTRAINT "guideline_docs_rels_application_images_fk" FOREIGN KEY ("application_images_id") REFERENCES "public"."application_images"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guideline_docs_rels" ADD CONSTRAINT "guideline_docs_rels_brand_icons_fk" FOREIGN KEY ("brand_icons_id") REFERENCES "public"."brand_icons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guideline_docs_rels" ADD CONSTRAINT "guideline_docs_rels_brand_logos_fk" FOREIGN KEY ("brand_logos_id") REFERENCES "public"."brand_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_rels" ADD CONSTRAINT "_guideline_docs_v_rels_application_images_fk" FOREIGN KEY ("application_images_id") REFERENCES "public"."application_images"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_rels" ADD CONSTRAINT "_guideline_docs_v_rels_brand_icons_fk" FOREIGN KEY ("brand_icons_id") REFERENCES "public"."brand_icons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_rels" ADD CONSTRAINT "_guideline_docs_v_rels_brand_logos_fk" FOREIGN KEY ("brand_logos_id") REFERENCES "public"."brand_logos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "guideline_docs_rels_application_images_id_idx" ON "guideline_docs_rels" USING btree ("application_images_id");
  CREATE INDEX "guideline_docs_rels_brand_icons_id_idx" ON "guideline_docs_rels" USING btree ("brand_icons_id");
  CREATE INDEX "guideline_docs_rels_brand_logos_id_idx" ON "guideline_docs_rels" USING btree ("brand_logos_id");
  CREATE INDEX "_guideline_docs_v_rels_application_images_id_idx" ON "_guideline_docs_v_rels" USING btree ("application_images_id");
  CREATE INDEX "_guideline_docs_v_rels_brand_icons_id_idx" ON "_guideline_docs_v_rels" USING btree ("brand_icons_id");
  CREATE INDEX "_guideline_docs_v_rels_brand_logos_id_idx" ON "_guideline_docs_v_rels" USING btree ("brand_logos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cards_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "containers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sections_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_rows_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cards_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cards_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_containers_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_sections_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_sections_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "rows" CASCADE;
  DROP TABLE "cards" CASCADE;
  DROP TABLE "cards_locales" CASCADE;
  DROP TABLE "containers" CASCADE;
  DROP TABLE "sections" CASCADE;
  DROP TABLE "sections_locales" CASCADE;
  DROP TABLE "_rows_v" CASCADE;
  DROP TABLE "_cards_v" CASCADE;
  DROP TABLE "_cards_v_locales" CASCADE;
  DROP TABLE "_containers_v" CASCADE;
  DROP TABLE "_sections_v" CASCADE;
  DROP TABLE "_sections_v_locales" CASCADE;
  ALTER TABLE "guideline_docs_rels" DROP CONSTRAINT "guideline_docs_rels_application_images_fk";
  
  ALTER TABLE "guideline_docs_rels" DROP CONSTRAINT "guideline_docs_rels_brand_icons_fk";
  
  ALTER TABLE "guideline_docs_rels" DROP CONSTRAINT "guideline_docs_rels_brand_logos_fk";
  
  ALTER TABLE "_guideline_docs_v_rels" DROP CONSTRAINT "_guideline_docs_v_rels_application_images_fk";
  
  ALTER TABLE "_guideline_docs_v_rels" DROP CONSTRAINT "_guideline_docs_v_rels_brand_icons_fk";
  
  ALTER TABLE "_guideline_docs_v_rels" DROP CONSTRAINT "_guideline_docs_v_rels_brand_logos_fk";
  
  DROP INDEX "guideline_docs_rels_application_images_id_idx";
  DROP INDEX "guideline_docs_rels_brand_icons_id_idx";
  DROP INDEX "guideline_docs_rels_brand_logos_id_idx";
  DROP INDEX "_guideline_docs_v_rels_application_images_id_idx";
  DROP INDEX "_guideline_docs_v_rels_brand_icons_id_idx";
  DROP INDEX "_guideline_docs_v_rels_brand_logos_id_idx";
  ALTER TABLE "guideline_docs" DROP COLUMN "content_model";
  ALTER TABLE "guideline_docs_rels" DROP COLUMN "application_images_id";
  ALTER TABLE "guideline_docs_rels" DROP COLUMN "brand_icons_id";
  ALTER TABLE "guideline_docs_rels" DROP COLUMN "brand_logos_id";
  ALTER TABLE "_guideline_docs_v" DROP COLUMN "version_content_model";
  ALTER TABLE "_guideline_docs_v_rels" DROP COLUMN "application_images_id";
  ALTER TABLE "_guideline_docs_v_rels" DROP COLUMN "brand_icons_id";
  ALTER TABLE "_guideline_docs_v_rels" DROP COLUMN "brand_logos_id";
  DROP TYPE "public"."enum_cards_ratio";
  DROP TYPE "public"."enum_cards_display_type";
  DROP TYPE "public"."enum_cards_display_fit";
  DROP TYPE "public"."enum_cards_status";
  DROP TYPE "public"."enum_cards_download_source";
  DROP TYPE "public"."enum_cards_caption_type";
  DROP TYPE "public"."enum_containers_type";
  DROP TYPE "public"."enum_containers_columns";
  DROP TYPE "public"."enum_containers_size";
  DROP TYPE "public"."enum_sections_type";
  DROP TYPE "public"."enum_sections_align";
  DROP TYPE "public"."enum_sections_download_source";
  DROP TYPE "public"."enum_guideline_docs_content_model";
  DROP TYPE "public"."enum__cards_v_ratio";
  DROP TYPE "public"."enum__cards_v_display_type";
  DROP TYPE "public"."enum__cards_v_display_fit";
  DROP TYPE "public"."enum__cards_v_status";
  DROP TYPE "public"."enum__cards_v_download_source";
  DROP TYPE "public"."enum__cards_v_caption_type";
  DROP TYPE "public"."enum__containers_v_type";
  DROP TYPE "public"."enum__containers_v_columns";
  DROP TYPE "public"."enum__containers_v_size";
  DROP TYPE "public"."enum__sections_v_type";
  DROP TYPE "public"."enum__sections_v_align";
  DROP TYPE "public"."enum__sections_v_download_source";
  DROP TYPE "public"."enum__guideline_docs_v_version_content_model";`)
}
