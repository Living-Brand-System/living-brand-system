import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "items" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "_locale" "_locales" NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "label" varchar,
    "value" varchar
  );

  CREATE TABLE "specs" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "_locale" "_locales" NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar
  );

  CREATE TABLE "_items_v" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_locale" "_locales" NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "label" varchar,
    "value" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_specs_v" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_locale" "_locales" NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "_uuid" varchar
  );

  ALTER TABLE "items" ADD CONSTRAINT "items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."specs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "specs" ADD CONSTRAINT "specs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_items_v" ADD CONSTRAINT "_items_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_specs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_specs_v" ADD CONSTRAINT "_specs_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "items_order_idx" ON "items" USING btree ("_order");
  CREATE INDEX "items_parent_id_idx" ON "items" USING btree ("_parent_id");
  CREATE INDEX "items_locale_idx" ON "items" USING btree ("_locale");
  CREATE INDEX "specs_order_idx" ON "specs" USING btree ("_order");
  CREATE INDEX "specs_parent_id_idx" ON "specs" USING btree ("_parent_id");
  CREATE INDEX "specs_locale_idx" ON "specs" USING btree ("_locale");
  CREATE INDEX "_items_v_order_idx" ON "_items_v" USING btree ("_order");
  CREATE INDEX "_items_v_parent_id_idx" ON "_items_v" USING btree ("_parent_id");
  CREATE INDEX "_items_v_locale_idx" ON "_items_v" USING btree ("_locale");
  CREATE INDEX "_specs_v_order_idx" ON "_specs_v" USING btree ("_order");
  CREATE INDEX "_specs_v_parent_id_idx" ON "_specs_v" USING btree ("_parent_id");
  CREATE INDEX "_specs_v_locale_idx" ON "_specs_v" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "items" CASCADE;
  DROP TABLE "specs" CASCADE;
  DROP TABLE "_items_v" CASCADE;
  DROP TABLE "_specs_v" CASCADE;`)
}
