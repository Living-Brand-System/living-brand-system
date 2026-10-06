import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_token_limits_daily_mode" AS ENUM('default', 'unlimited', 'limit');
  CREATE TYPE "public"."enum_users_token_limits_monthly_mode" AS ENUM('default', 'unlimited', 'limit');
  CREATE TYPE "public"."enum_ai_token_limits_daily_mode" AS ENUM('unlimited', 'limit');
  CREATE TYPE "public"."enum_ai_token_limits_monthly_mode" AS ENUM('unlimited', 'limit');
  CREATE TABLE "ai_token_limits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"daily_mode" "enum_ai_token_limits_daily_mode" DEFAULT 'unlimited',
  	"daily_tokens" numeric,
  	"monthly_mode" "enum_ai_token_limits_monthly_mode" DEFAULT 'unlimited',
  	"monthly_tokens" numeric,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "token_limits_daily_mode" "enum_users_token_limits_daily_mode" DEFAULT 'default';
  ALTER TABLE "users" ADD COLUMN "token_limits_daily_tokens" numeric;
  ALTER TABLE "users" ADD COLUMN "token_limits_monthly_mode" "enum_users_token_limits_monthly_mode" DEFAULT 'default';
  ALTER TABLE "users" ADD COLUMN "token_limits_monthly_tokens" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ai_token_limits" CASCADE;
  ALTER TABLE "users" DROP COLUMN "token_limits_daily_mode";
  ALTER TABLE "users" DROP COLUMN "token_limits_daily_tokens";
  ALTER TABLE "users" DROP COLUMN "token_limits_monthly_mode";
  ALTER TABLE "users" DROP COLUMN "token_limits_monthly_tokens";
  DROP TYPE "public"."enum_users_token_limits_daily_mode";
  DROP TYPE "public"."enum_users_token_limits_monthly_mode";
  DROP TYPE "public"."enum_ai_token_limits_daily_mode";
  DROP TYPE "public"."enum_ai_token_limits_monthly_mode";`)
}
