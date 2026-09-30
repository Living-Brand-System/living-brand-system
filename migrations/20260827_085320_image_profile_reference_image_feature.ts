import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "image_profiles_blocks_reference_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "_image_profiles_v_blocks_reference_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "image_profiles_blocks_reference_image" ADD CONSTRAINT "image_profiles_blocks_reference_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."image_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_image_profiles_v_blocks_reference_image" ADD CONSTRAINT "_image_profiles_v_blocks_reference_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_image_profiles_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "image_profiles_blocks_reference_image_order_idx" ON "image_profiles_blocks_reference_image" USING btree ("_order");
  CREATE INDEX "image_profiles_blocks_reference_image_parent_id_idx" ON "image_profiles_blocks_reference_image" USING btree ("_parent_id");
  CREATE INDEX "image_profiles_blocks_reference_image_path_idx" ON "image_profiles_blocks_reference_image" USING btree ("_path");
  CREATE INDEX "_image_profiles_v_blocks_reference_image_order_idx" ON "_image_profiles_v_blocks_reference_image" USING btree ("_order");
  CREATE INDEX "_image_profiles_v_blocks_reference_image_parent_id_idx" ON "_image_profiles_v_blocks_reference_image" USING btree ("_parent_id");
  CREATE INDEX "_image_profiles_v_blocks_reference_image_path_idx" ON "_image_profiles_v_blocks_reference_image" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "image_profiles_blocks_reference_image" CASCADE;
  DROP TABLE "_image_profiles_v_blocks_reference_image" CASCADE;`)
}
