import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_graphic_profiles_runtime" ADD VALUE 'key-visual-pattern' BEFORE 'linear-fluted-glass';
  ALTER TYPE "public"."enum__graphic_profiles_v_version_runtime" ADD VALUE 'key-visual-pattern' BEFORE 'linear-fluted-glass';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "graphic_profiles" ALTER COLUMN "runtime" SET DATA TYPE text;
  DROP TYPE "public"."enum_graphic_profiles_runtime";
  CREATE TYPE "public"."enum_graphic_profiles_runtime" AS ENUM('forward-straight', 'linear-fluted-glass', 'radial-fluted-glass', 'sweep-fluted-glass', 'vertical-fluted-glass');
  ALTER TABLE "graphic_profiles" ALTER COLUMN "runtime" SET DATA TYPE "public"."enum_graphic_profiles_runtime" USING "runtime"::"public"."enum_graphic_profiles_runtime";
  ALTER TABLE "_graphic_profiles_v" ALTER COLUMN "version_runtime" SET DATA TYPE text;
  DROP TYPE "public"."enum__graphic_profiles_v_version_runtime";
  CREATE TYPE "public"."enum__graphic_profiles_v_version_runtime" AS ENUM('forward-straight', 'linear-fluted-glass', 'radial-fluted-glass', 'sweep-fluted-glass', 'vertical-fluted-glass');
  ALTER TABLE "_graphic_profiles_v" ALTER COLUMN "version_runtime" SET DATA TYPE "public"."enum__graphic_profiles_v_version_runtime" USING "version_runtime"::"public"."enum__graphic_profiles_v_version_runtime";`)
}
