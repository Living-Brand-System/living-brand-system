import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "sbk" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"width" "enum_block_width" DEFAULT 'padded',
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
  
  CREATE TABLE "_sbk_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"width" "enum_block_width" DEFAULT 'padded',
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
  
  ALTER TABLE "sbk" ADD CONSTRAINT "sbk_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sbk" ADD CONSTRAINT "sbk_inner_background_id_brand_colors_id_fk" FOREIGN KEY ("inner_background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sbk" ADD CONSTRAINT "sbk_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sbk_locales" ADD CONSTRAINT "sbk_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sbk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sbk_v" ADD CONSTRAINT "_sbk_v_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sbk_v" ADD CONSTRAINT "_sbk_v_inner_background_id_brand_colors_id_fk" FOREIGN KEY ("inner_background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sbk_v" ADD CONSTRAINT "_sbk_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sbk_v_locales" ADD CONSTRAINT "_sbk_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_sbk_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "sbk_order_idx" ON "sbk" USING btree ("_order");
  CREATE INDEX "sbk_parent_id_idx" ON "sbk" USING btree ("_parent_id");
  CREATE INDEX "sbk_path_idx" ON "sbk" USING btree ("_path");
  CREATE INDEX "sbk_background_idx" ON "sbk" USING btree ("background_id");
  CREATE INDEX "sbk_inner_background_idx" ON "sbk" USING btree ("inner_background_id");
  CREATE UNIQUE INDEX "sbk_locales_locale_parent_id_unique" ON "sbk_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_sbk_v_order_idx" ON "_sbk_v" USING btree ("_order");
  CREATE INDEX "_sbk_v_parent_id_idx" ON "_sbk_v" USING btree ("_parent_id");
  CREATE INDEX "_sbk_v_path_idx" ON "_sbk_v" USING btree ("_path");
  CREATE INDEX "_sbk_v_background_idx" ON "_sbk_v" USING btree ("background_id");
  CREATE INDEX "_sbk_v_inner_background_idx" ON "_sbk_v" USING btree ("inner_background_id");
  CREATE UNIQUE INDEX "_sbk_v_locales_locale_parent_id_unique" ON "_sbk_v_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "sbk" CASCADE;
  DROP TABLE "sbk_locales" CASCADE;
  DROP TABLE "_sbk_v" CASCADE;
  DROP TABLE "_sbk_v_locales" CASCADE;`)
}
