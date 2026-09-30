import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ai_usage_events_studio" AS ENUM('image', 'graphic', 'graph', 'template', 'review', 'assets', 'mcp');
  ALTER TABLE "ai_usage_events" ADD COLUMN "studio" "enum_ai_usage_events_studio";
  CREATE INDEX "ai_usage_events_studio_idx" ON "ai_usage_events" USING btree ("studio");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "ai_usage_events_studio_idx";
  ALTER TABLE "ai_usage_events" DROP COLUMN "studio";
  DROP TYPE "public"."enum_ai_usage_events_studio";`)
}
