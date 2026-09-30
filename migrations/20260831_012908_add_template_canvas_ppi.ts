import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" ADD COLUMN "canvas_ppi" numeric;
  ALTER TABLE "_templates_v" ADD COLUMN "version_canvas_ppi" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" DROP COLUMN "canvas_ppi";
  ALTER TABLE "_templates_v" DROP COLUMN "version_canvas_ppi";`)
}
