import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_actions_type" AS ENUM('link', 'copy');
  CREATE TYPE "public"."enum__actions_v_type" AS ENUM('link', 'copy');
  CREATE TABLE "actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_actions_type" DEFAULT 'link',
  	"href" varchar
  );
  
  CREATE TABLE "actions_locales" (
  	"label" varchar,
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_actions_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__actions_v_type" DEFAULT 'link',
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_actions_v_locales" (
  	"label" varchar,
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "cards" ADD COLUMN "background_color_id" integer;
  ALTER TABLE "cards" ADD COLUMN "foreground_color_id" integer;
  ALTER TABLE "_cards_v" ADD COLUMN "background_color_id" integer;
  ALTER TABLE "_cards_v" ADD COLUMN "foreground_color_id" integer;
  ALTER TABLE "actions" ADD CONSTRAINT "actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "actions_locales" ADD CONSTRAINT "actions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_actions_v" ADD CONSTRAINT "_actions_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_actions_v_locales" ADD CONSTRAINT "_actions_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_actions_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "actions_order_idx" ON "actions" USING btree ("_order");
  CREATE INDEX "actions_parent_id_idx" ON "actions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "actions_locales_locale_parent_id_unique" ON "actions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_actions_v_order_idx" ON "_actions_v" USING btree ("_order");
  CREATE INDEX "_actions_v_parent_id_idx" ON "_actions_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_actions_v_locales_locale_parent_id_unique" ON "_actions_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "cards" ADD CONSTRAINT "cards_background_color_id_brand_colors_id_fk" FOREIGN KEY ("background_color_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cards" ADD CONSTRAINT "cards_foreground_color_id_brand_colors_id_fk" FOREIGN KEY ("foreground_color_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cards_v" ADD CONSTRAINT "_cards_v_background_color_id_brand_colors_id_fk" FOREIGN KEY ("background_color_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cards_v" ADD CONSTRAINT "_cards_v_foreground_color_id_brand_colors_id_fk" FOREIGN KEY ("foreground_color_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cards_background_color_idx" ON "cards" USING btree ("background_color_id");
  CREATE INDEX "cards_foreground_color_idx" ON "cards" USING btree ("foreground_color_id");
  CREATE INDEX "_cards_v_background_color_idx" ON "_cards_v" USING btree ("background_color_id");
  CREATE INDEX "_cards_v_foreground_color_idx" ON "_cards_v" USING btree ("foreground_color_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "actions_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_actions_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_actions_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "actions" CASCADE;
  DROP TABLE "actions_locales" CASCADE;
  DROP TABLE "_actions_v" CASCADE;
  DROP TABLE "_actions_v_locales" CASCADE;
  ALTER TABLE "cards" DROP CONSTRAINT "cards_background_color_id_brand_colors_id_fk";
  
  ALTER TABLE "cards" DROP CONSTRAINT "cards_foreground_color_id_brand_colors_id_fk";
  
  ALTER TABLE "_cards_v" DROP CONSTRAINT "_cards_v_background_color_id_brand_colors_id_fk";
  
  ALTER TABLE "_cards_v" DROP CONSTRAINT "_cards_v_foreground_color_id_brand_colors_id_fk";
  
  DROP INDEX "cards_background_color_idx";
  DROP INDEX "cards_foreground_color_idx";
  DROP INDEX "_cards_v_background_color_idx";
  DROP INDEX "_cards_v_foreground_color_idx";
  ALTER TABLE "cards" DROP COLUMN "background_color_id";
  ALTER TABLE "cards" DROP COLUMN "foreground_color_id";
  ALTER TABLE "_cards_v" DROP COLUMN "background_color_id";
  ALTER TABLE "_cards_v" DROP COLUMN "foreground_color_id";
  DROP TYPE "public"."enum_actions_type";
  DROP TYPE "public"."enum__actions_v_type";`)
}
