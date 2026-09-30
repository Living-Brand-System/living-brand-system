import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "graphic_profiles_presets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"preset_id" varchar,
  	"label" varchar,
  	"values" jsonb
  );
  
  CREATE TABLE "_graphic_profiles_v_version_presets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"preset_id" varchar,
  	"label" varchar,
  	"values" jsonb,
  	"_uuid" varchar
  );
  
  ALTER TABLE "graphic_profiles_presets" ADD CONSTRAINT "graphic_profiles_presets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."graphic_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_graphic_profiles_v_version_presets" ADD CONSTRAINT "_graphic_profiles_v_version_presets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_graphic_profiles_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "graphic_profiles_presets_order_idx" ON "graphic_profiles_presets" USING btree ("_order");
  CREATE INDEX "graphic_profiles_presets_parent_id_idx" ON "graphic_profiles_presets" USING btree ("_parent_id");
  CREATE INDEX "_graphic_profiles_v_version_presets_order_idx" ON "_graphic_profiles_v_version_presets" USING btree ("_order");
  CREATE INDEX "_graphic_profiles_v_version_presets_parent_id_idx" ON "_graphic_profiles_v_version_presets" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "graphic_profiles_presets" CASCADE;
  DROP TABLE "_graphic_profiles_v_version_presets" CASCADE;`)
}
