import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sections" DROP COLUMN "align";
  ALTER TABLE "_sections_v" DROP COLUMN "align";
  DROP TYPE "public"."enum_sections_align";
  DROP TYPE "public"."enum__sections_v_align";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_sections_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__sections_v_align" AS ENUM('start', 'center');
  ALTER TABLE "sections" ADD COLUMN "align" "enum_sections_align" DEFAULT 'start';
  ALTER TABLE "_sections_v" ADD COLUMN "align" "enum__sections_v_align" DEFAULT 'start';`)
}
