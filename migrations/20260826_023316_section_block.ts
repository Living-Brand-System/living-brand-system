import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "sec" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"background_id" integer,
  	"background_tone" "enum_background_tone" DEFAULT 'solid',
  	"block_name" varchar
  );
  
  CREATE TABLE "sec_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_sec_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"background_id" integer,
  	"background_tone" "enum_background_tone" DEFAULT 'solid',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_sec_v_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "sec" ADD CONSTRAINT "sec_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sec" ADD CONSTRAINT "sec_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sec_locales" ADD CONSTRAINT "sec_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sec_v" ADD CONSTRAINT "_sec_v_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sec_v" ADD CONSTRAINT "_sec_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sec_v_locales" ADD CONSTRAINT "_sec_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_sec_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "sec_order_idx" ON "sec" USING btree ("_order");
  CREATE INDEX "sec_parent_id_idx" ON "sec" USING btree ("_parent_id");
  CREATE INDEX "sec_path_idx" ON "sec" USING btree ("_path");
  CREATE INDEX "sec_background_idx" ON "sec" USING btree ("background_id");
  CREATE UNIQUE INDEX "sec_locales_locale_parent_id_unique" ON "sec_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_sec_v_order_idx" ON "_sec_v" USING btree ("_order");
  CREATE INDEX "_sec_v_parent_id_idx" ON "_sec_v" USING btree ("_parent_id");
  CREATE INDEX "_sec_v_path_idx" ON "_sec_v" USING btree ("_path");
  CREATE INDEX "_sec_v_background_idx" ON "_sec_v" USING btree ("background_id");
  CREATE UNIQUE INDEX "_sec_v_locales_locale_parent_id_unique" ON "_sec_v_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "sec" CASCADE;
  DROP TABLE "sec_locales" CASCADE;
  DROP TABLE "_sec_v" CASCADE;
  DROP TABLE "_sec_v_locales" CASCADE;`)
}
