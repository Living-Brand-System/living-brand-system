import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_langs_language" AS ENUM('ko', 'en', 'enCaps');
  CREATE TYPE "public"."enum_cards_display_sample" AS ENUM('a', 'b', 'c', 'grid-labels');
  CREATE TYPE "public"."enum_cards_display_weight" AS ENUM('light', 'medium', 'bold');
  CREATE TYPE "public"."enum_cards_display_palette" AS ENUM('primary', 'supportive', 'monotone', 'brand');
  CREATE TYPE "public"."enum_cards_display_variant" AS ENUM('swatches', 'logo-backgrounds');
  CREATE TYPE "public"."enum_cards_display_palette_layout" AS ENUM('uniform', 'ranked');
  CREATE TYPE "public"."enum_containers_height" AS ENUM('sm', 'md', 'lg', 'xl');
  CREATE TYPE "public"."enum_containers_navigation" AS ENUM('counter', 'labels');
  CREATE TYPE "public"."enum_containers_sticky_mode" AS ENUM('switch', 'individual');
  CREATE TYPE "public"."enum__langs_v_language" AS ENUM('ko', 'en', 'enCaps');
  CREATE TYPE "public"."enum__cards_v_display_sample" AS ENUM('a', 'b', 'c', 'grid-labels');
  CREATE TYPE "public"."enum__cards_v_display_weight" AS ENUM('light', 'medium', 'bold');
  CREATE TYPE "public"."enum__cards_v_display_palette" AS ENUM('primary', 'supportive', 'monotone', 'brand');
  CREATE TYPE "public"."enum__cards_v_display_variant" AS ENUM('swatches', 'logo-backgrounds');
  CREATE TYPE "public"."enum__cards_v_display_palette_layout" AS ENUM('uniform', 'ranked');
  CREATE TYPE "public"."enum__containers_v_height" AS ENUM('sm', 'md', 'lg', 'xl');
  CREATE TYPE "public"."enum__containers_v_navigation" AS ENUM('counter', 'labels');
  CREATE TYPE "public"."enum__containers_v_sticky_mode" AS ENUM('switch', 'individual');
  CREATE TYPE "public"."enum_brand_color_groups_family" AS ENUM('primary', 'supportive', 'monotone');
  CREATE TYPE "public"."enum__brand_color_groups_v_version_family" AS ENUM('primary', 'supportive', 'monotone');
  ALTER TYPE "public"."enum_cards_display_type" ADD VALUE 'guide';
  ALTER TYPE "public"."enum_cards_display_type" ADD VALUE 'layout-grid';
  ALTER TYPE "public"."enum_cards_display_type" ADD VALUE 'layout-overlay';
  ALTER TYPE "public"."enum_cards_display_type" ADD VALUE 'type-weight';
  ALTER TYPE "public"."enum_cards_display_type" ADD VALUE 'palette';
  ALTER TYPE "public"."enum_cards_display_type" ADD VALUE 'swatch';
  ALTER TYPE "public"."enum_cards_display_type" ADD VALUE 'logo-background';
  ALTER TYPE "public"."enum_containers_type" ADD VALUE 'carousel';
  ALTER TYPE "public"."enum_containers_type" ADD VALUE 'sticky';
  ALTER TYPE "public"."enum__cards_v_display_type" ADD VALUE 'guide';
  ALTER TYPE "public"."enum__cards_v_display_type" ADD VALUE 'layout-grid';
  ALTER TYPE "public"."enum__cards_v_display_type" ADD VALUE 'layout-overlay';
  ALTER TYPE "public"."enum__cards_v_display_type" ADD VALUE 'type-weight';
  ALTER TYPE "public"."enum__cards_v_display_type" ADD VALUE 'palette';
  ALTER TYPE "public"."enum__cards_v_display_type" ADD VALUE 'swatch';
  ALTER TYPE "public"."enum__cards_v_display_type" ADD VALUE 'logo-background';
  ALTER TYPE "public"."enum__containers_v_type" ADD VALUE 'carousel';
  ALTER TYPE "public"."enum__containers_v_type" ADD VALUE 'sticky';
  CREATE TABLE "langs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_langs_language" DEFAULT 'ko'
  );
  
  CREATE TABLE "_langs_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"language" "enum__langs_v_language" DEFAULT 'ko',
  	"_uuid" varchar
  );
  
  ALTER TABLE "cards" ADD COLUMN "display_dim_background" boolean DEFAULT false;
  ALTER TABLE "cards" ADD COLUMN "display_sample" "enum_cards_display_sample" DEFAULT 'a';
  ALTER TABLE "cards" ADD COLUMN "display_margin_pct" numeric DEFAULT 4.5;
  ALTER TABLE "cards" ADD COLUMN "display_gutter_x" numeric DEFAULT 75;
  ALTER TABLE "cards" ADD COLUMN "display_gutter_y" numeric DEFAULT 75;
  ALTER TABLE "cards" ADD COLUMN "display_weight" "enum_cards_display_weight" DEFAULT 'medium';
  ALTER TABLE "cards" ADD COLUMN "display_adjustable" boolean DEFAULT true;
  ALTER TABLE "cards" ADD COLUMN "display_palette" "enum_cards_display_palette" DEFAULT 'brand';
  ALTER TABLE "cards" ADD COLUMN "display_variant" "enum_cards_display_variant" DEFAULT 'swatches';
  ALTER TABLE "cards" ADD COLUMN "display_palette_layout" "enum_cards_display_palette_layout" DEFAULT 'uniform';
  ALTER TABLE "cards" ADD COLUMN "display_color_id" integer;
  ALTER TABLE "cards" ADD COLUMN "display_opacity" numeric DEFAULT 1;
  ALTER TABLE "cards_locales" ADD COLUMN "selection_label" varchar;
  ALTER TABLE "containers" ADD COLUMN "height" "enum_containers_height" DEFAULT 'md';
  ALTER TABLE "containers" ADD COLUMN "navigation" "enum_containers_navigation" DEFAULT 'counter';
  ALTER TABLE "containers" ADD COLUMN "loop" boolean DEFAULT true;
  ALTER TABLE "containers" ADD COLUMN "autoplay" boolean DEFAULT false;
  ALTER TABLE "containers" ADD COLUMN "sticky_mode" "enum_containers_sticky_mode" DEFAULT 'switch';
  ALTER TABLE "_cards_v" ADD COLUMN "display_dim_background" boolean DEFAULT false;
  ALTER TABLE "_cards_v" ADD COLUMN "display_sample" "enum__cards_v_display_sample" DEFAULT 'a';
  ALTER TABLE "_cards_v" ADD COLUMN "display_margin_pct" numeric DEFAULT 4.5;
  ALTER TABLE "_cards_v" ADD COLUMN "display_gutter_x" numeric DEFAULT 75;
  ALTER TABLE "_cards_v" ADD COLUMN "display_gutter_y" numeric DEFAULT 75;
  ALTER TABLE "_cards_v" ADD COLUMN "display_weight" "enum__cards_v_display_weight" DEFAULT 'medium';
  ALTER TABLE "_cards_v" ADD COLUMN "display_adjustable" boolean DEFAULT true;
  ALTER TABLE "_cards_v" ADD COLUMN "display_palette" "enum__cards_v_display_palette" DEFAULT 'brand';
  ALTER TABLE "_cards_v" ADD COLUMN "display_variant" "enum__cards_v_display_variant" DEFAULT 'swatches';
  ALTER TABLE "_cards_v" ADD COLUMN "display_palette_layout" "enum__cards_v_display_palette_layout" DEFAULT 'uniform';
  ALTER TABLE "_cards_v" ADD COLUMN "display_color_id" integer;
  ALTER TABLE "_cards_v" ADD COLUMN "display_opacity" numeric DEFAULT 1;
  ALTER TABLE "_cards_v_locales" ADD COLUMN "selection_label" varchar;
  ALTER TABLE "_containers_v" ADD COLUMN "height" "enum__containers_v_height" DEFAULT 'md';
  ALTER TABLE "_containers_v" ADD COLUMN "navigation" "enum__containers_v_navigation" DEFAULT 'counter';
  ALTER TABLE "_containers_v" ADD COLUMN "loop" boolean DEFAULT true;
  ALTER TABLE "_containers_v" ADD COLUMN "autoplay" boolean DEFAULT false;
  ALTER TABLE "_containers_v" ADD COLUMN "sticky_mode" "enum__containers_v_sticky_mode" DEFAULT 'switch';
  ALTER TABLE "brand_color_groups" ADD COLUMN "family" "enum_brand_color_groups_family";
  ALTER TABLE "_brand_color_groups_v" ADD COLUMN "version_family" "enum__brand_color_groups_v_version_family";
  ALTER TABLE "langs" ADD CONSTRAINT "langs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_langs_v" ADD CONSTRAINT "_langs_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "langs_order_idx" ON "langs" USING btree ("_order");
  CREATE INDEX "langs_parent_id_idx" ON "langs" USING btree ("_parent_id");
  CREATE INDEX "_langs_v_order_idx" ON "_langs_v" USING btree ("_order");
  CREATE INDEX "_langs_v_parent_id_idx" ON "_langs_v" USING btree ("_parent_id");
  ALTER TABLE "cards" ADD CONSTRAINT "cards_display_color_id_brand_colors_id_fk" FOREIGN KEY ("display_color_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cards_v" ADD CONSTRAINT "_cards_v_display_color_id_brand_colors_id_fk" FOREIGN KEY ("display_color_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cards_display_display_color_idx" ON "cards" USING btree ("display_color_id");
  CREATE INDEX "_cards_v_display_display_color_idx" ON "_cards_v" USING btree ("display_color_id");
  CREATE UNIQUE INDEX "brand_color_groups_family_idx" ON "brand_color_groups" USING btree ("family");
  CREATE INDEX "_brand_color_groups_v_version_version_family_idx" ON "_brand_color_groups_v" USING btree ("version_family");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "langs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_langs_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "langs" CASCADE;
  DROP TABLE "_langs_v" CASCADE;
  ALTER TABLE "cards" DROP CONSTRAINT "cards_display_color_id_brand_colors_id_fk";
  
  ALTER TABLE "_cards_v" DROP CONSTRAINT "_cards_v_display_color_id_brand_colors_id_fk";
  
  ALTER TABLE "cards" ALTER COLUMN "display_type" SET DATA TYPE text;
  ALTER TABLE "cards" ALTER COLUMN "display_type" SET DEFAULT 'image'::text;
  DROP TYPE "public"."enum_cards_display_type";
  CREATE TYPE "public"."enum_cards_display_type" AS ENUM('image');
  ALTER TABLE "cards" ALTER COLUMN "display_type" SET DEFAULT 'image'::"public"."enum_cards_display_type";
  ALTER TABLE "cards" ALTER COLUMN "display_type" SET DATA TYPE "public"."enum_cards_display_type" USING "display_type"::"public"."enum_cards_display_type";
  ALTER TABLE "containers" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "containers" ALTER COLUMN "type" SET DEFAULT 'grid'::text;
  DROP TYPE "public"."enum_containers_type";
  CREATE TYPE "public"."enum_containers_type" AS ENUM('grid');
  ALTER TABLE "containers" ALTER COLUMN "type" SET DEFAULT 'grid'::"public"."enum_containers_type";
  ALTER TABLE "containers" ALTER COLUMN "type" SET DATA TYPE "public"."enum_containers_type" USING "type"::"public"."enum_containers_type";
  ALTER TABLE "_cards_v" ALTER COLUMN "display_type" SET DATA TYPE text;
  ALTER TABLE "_cards_v" ALTER COLUMN "display_type" SET DEFAULT 'image'::text;
  DROP TYPE "public"."enum__cards_v_display_type";
  CREATE TYPE "public"."enum__cards_v_display_type" AS ENUM('image');
  ALTER TABLE "_cards_v" ALTER COLUMN "display_type" SET DEFAULT 'image'::"public"."enum__cards_v_display_type";
  ALTER TABLE "_cards_v" ALTER COLUMN "display_type" SET DATA TYPE "public"."enum__cards_v_display_type" USING "display_type"::"public"."enum__cards_v_display_type";
  ALTER TABLE "_containers_v" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "_containers_v" ALTER COLUMN "type" SET DEFAULT 'grid'::text;
  DROP TYPE "public"."enum__containers_v_type";
  CREATE TYPE "public"."enum__containers_v_type" AS ENUM('grid');
  ALTER TABLE "_containers_v" ALTER COLUMN "type" SET DEFAULT 'grid'::"public"."enum__containers_v_type";
  ALTER TABLE "_containers_v" ALTER COLUMN "type" SET DATA TYPE "public"."enum__containers_v_type" USING "type"::"public"."enum__containers_v_type";
  DROP INDEX "cards_display_display_color_idx";
  DROP INDEX "_cards_v_display_display_color_idx";
  DROP INDEX "brand_color_groups_family_idx";
  DROP INDEX "_brand_color_groups_v_version_version_family_idx";
  ALTER TABLE "cards" DROP COLUMN "display_dim_background";
  ALTER TABLE "cards" DROP COLUMN "display_sample";
  ALTER TABLE "cards" DROP COLUMN "display_margin_pct";
  ALTER TABLE "cards" DROP COLUMN "display_gutter_x";
  ALTER TABLE "cards" DROP COLUMN "display_gutter_y";
  ALTER TABLE "cards" DROP COLUMN "display_weight";
  ALTER TABLE "cards" DROP COLUMN "display_adjustable";
  ALTER TABLE "cards" DROP COLUMN "display_palette";
  ALTER TABLE "cards" DROP COLUMN "display_variant";
  ALTER TABLE "cards" DROP COLUMN "display_palette_layout";
  ALTER TABLE "cards" DROP COLUMN "display_color_id";
  ALTER TABLE "cards" DROP COLUMN "display_opacity";
  ALTER TABLE "cards_locales" DROP COLUMN "selection_label";
  ALTER TABLE "containers" DROP COLUMN "height";
  ALTER TABLE "containers" DROP COLUMN "navigation";
  ALTER TABLE "containers" DROP COLUMN "loop";
  ALTER TABLE "containers" DROP COLUMN "autoplay";
  ALTER TABLE "containers" DROP COLUMN "sticky_mode";
  ALTER TABLE "_cards_v" DROP COLUMN "display_dim_background";
  ALTER TABLE "_cards_v" DROP COLUMN "display_sample";
  ALTER TABLE "_cards_v" DROP COLUMN "display_margin_pct";
  ALTER TABLE "_cards_v" DROP COLUMN "display_gutter_x";
  ALTER TABLE "_cards_v" DROP COLUMN "display_gutter_y";
  ALTER TABLE "_cards_v" DROP COLUMN "display_weight";
  ALTER TABLE "_cards_v" DROP COLUMN "display_adjustable";
  ALTER TABLE "_cards_v" DROP COLUMN "display_palette";
  ALTER TABLE "_cards_v" DROP COLUMN "display_variant";
  ALTER TABLE "_cards_v" DROP COLUMN "display_palette_layout";
  ALTER TABLE "_cards_v" DROP COLUMN "display_color_id";
  ALTER TABLE "_cards_v" DROP COLUMN "display_opacity";
  ALTER TABLE "_cards_v_locales" DROP COLUMN "selection_label";
  ALTER TABLE "_containers_v" DROP COLUMN "height";
  ALTER TABLE "_containers_v" DROP COLUMN "navigation";
  ALTER TABLE "_containers_v" DROP COLUMN "loop";
  ALTER TABLE "_containers_v" DROP COLUMN "autoplay";
  ALTER TABLE "_containers_v" DROP COLUMN "sticky_mode";
  ALTER TABLE "brand_color_groups" DROP COLUMN "family";
  ALTER TABLE "_brand_color_groups_v" DROP COLUMN "version_family";
  DROP TYPE "public"."enum_langs_language";
  DROP TYPE "public"."enum_cards_display_sample";
  DROP TYPE "public"."enum_cards_display_weight";
  DROP TYPE "public"."enum_cards_display_palette";
  DROP TYPE "public"."enum_cards_display_variant";
  DROP TYPE "public"."enum_cards_display_palette_layout";
  DROP TYPE "public"."enum_containers_height";
  DROP TYPE "public"."enum_containers_navigation";
  DROP TYPE "public"."enum_containers_sticky_mode";
  DROP TYPE "public"."enum__langs_v_language";
  DROP TYPE "public"."enum__cards_v_display_sample";
  DROP TYPE "public"."enum__cards_v_display_weight";
  DROP TYPE "public"."enum__cards_v_display_palette";
  DROP TYPE "public"."enum__cards_v_display_variant";
  DROP TYPE "public"."enum__cards_v_display_palette_layout";
  DROP TYPE "public"."enum__containers_v_height";
  DROP TYPE "public"."enum__containers_v_navigation";
  DROP TYPE "public"."enum__containers_v_sticky_mode";
  DROP TYPE "public"."enum_brand_color_groups_family";
  DROP TYPE "public"."enum__brand_color_groups_v_version_family";`)
}
