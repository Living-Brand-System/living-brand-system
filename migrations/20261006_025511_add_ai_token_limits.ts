import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "ai_token_limits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"daily" numeric DEFAULT 100000 NOT NULL,
  	"monthly" numeric DEFAULT 1000000 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "token_limits_unlimited" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "token_limits_daily" numeric;
  ALTER TABLE "users" ADD COLUMN "token_limits_monthly" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ai_token_limits" CASCADE;
  ALTER TABLE "users" DROP COLUMN "token_limits_unlimited";
  ALTER TABLE "users" DROP COLUMN "token_limits_daily";
  ALTER TABLE "users" DROP COLUMN "token_limits_monthly";`)
}
