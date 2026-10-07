import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" ADD COLUMN "default_session" jsonb;
  ALTER TABLE "_templates_v" ADD COLUMN "version_default_session" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" DROP COLUMN "default_session";
  ALTER TABLE "_templates_v" DROP COLUMN "version_default_session";`)
}
