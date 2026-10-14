import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "_templates_v" ADD COLUMN "version_deleted_at" timestamp(3) with time zone;
  CREATE INDEX "templates_deleted_at_idx" ON "templates" USING btree ("deleted_at");
  CREATE INDEX "_templates_v_version_version_deleted_at_idx" ON "_templates_v" USING btree ("version_deleted_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "templates_deleted_at_idx";
  DROP INDEX "_templates_v_version_version_deleted_at_idx";
  ALTER TABLE "templates" DROP COLUMN "deleted_at";
  ALTER TABLE "_templates_v" DROP COLUMN "version_deleted_at";`)
}
