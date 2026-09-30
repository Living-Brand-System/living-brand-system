import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_sec_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum_bse_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum_ovw_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum_exm_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum__sec_v_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum__bse_v_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum__ovw_v_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum__exm_v_columns" AS ENUM('1', '2', '3', '4');
  ALTER TABLE "sec" ADD COLUMN "columns" "enum_sec_columns" DEFAULT '2';
  ALTER TABLE "bse" ADD COLUMN "columns" "enum_bse_columns" DEFAULT '2';
  ALTER TABLE "ovw" ADD COLUMN "columns" "enum_ovw_columns" DEFAULT '2';
  ALTER TABLE "exm" ADD COLUMN "columns" "enum_exm_columns" DEFAULT '2';
  ALTER TABLE "_sec_v" ADD COLUMN "columns" "enum__sec_v_columns" DEFAULT '2';
  ALTER TABLE "_bse_v" ADD COLUMN "columns" "enum__bse_v_columns" DEFAULT '2';
  ALTER TABLE "_ovw_v" ADD COLUMN "columns" "enum__ovw_v_columns" DEFAULT '2';
  ALTER TABLE "_exm_v" ADD COLUMN "columns" "enum__exm_v_columns" DEFAULT '2';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sec" DROP COLUMN "columns";
  ALTER TABLE "bse" DROP COLUMN "columns";
  ALTER TABLE "ovw" DROP COLUMN "columns";
  ALTER TABLE "exm" DROP COLUMN "columns";
  ALTER TABLE "_sec_v" DROP COLUMN "columns";
  ALTER TABLE "_bse_v" DROP COLUMN "columns";
  ALTER TABLE "_ovw_v" DROP COLUMN "columns";
  ALTER TABLE "_exm_v" DROP COLUMN "columns";
  DROP TYPE "public"."enum_sec_columns";
  DROP TYPE "public"."enum_bse_columns";
  DROP TYPE "public"."enum_ovw_columns";
  DROP TYPE "public"."enum_exm_columns";
  DROP TYPE "public"."enum__sec_v_columns";
  DROP TYPE "public"."enum__bse_v_columns";
  DROP TYPE "public"."enum__ovw_v_columns";
  DROP TYPE "public"."enum__exm_v_columns";`)
}
