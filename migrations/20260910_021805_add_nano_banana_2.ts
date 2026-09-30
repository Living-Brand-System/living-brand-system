import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_image_profiles_image_model_preset" ADD VALUE 'google-nano-banana-2';
  ALTER TYPE "public"."enum__image_profiles_v_version_image_model_preset" ADD VALUE 'google-nano-banana-2';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "image_profiles" ALTER COLUMN "image_model_preset" SET DATA TYPE text;
  ALTER TABLE "image_profiles" ALTER COLUMN "image_model_preset" SET DEFAULT 'openai-gpt-image-2'::text;
  DROP TYPE "public"."enum_image_profiles_image_model_preset";
  CREATE TYPE "public"."enum_image_profiles_image_model_preset" AS ENUM('openai-gpt-image-2', 'google-nano-banana-2-lite');
  ALTER TABLE "image_profiles" ALTER COLUMN "image_model_preset" SET DEFAULT 'openai-gpt-image-2'::"public"."enum_image_profiles_image_model_preset";
  ALTER TABLE "image_profiles" ALTER COLUMN "image_model_preset" SET DATA TYPE "public"."enum_image_profiles_image_model_preset" USING "image_model_preset"::"public"."enum_image_profiles_image_model_preset";
  ALTER TABLE "_image_profiles_v" ALTER COLUMN "version_image_model_preset" SET DATA TYPE text;
  ALTER TABLE "_image_profiles_v" ALTER COLUMN "version_image_model_preset" SET DEFAULT 'openai-gpt-image-2'::text;
  DROP TYPE "public"."enum__image_profiles_v_version_image_model_preset";
  CREATE TYPE "public"."enum__image_profiles_v_version_image_model_preset" AS ENUM('openai-gpt-image-2', 'google-nano-banana-2-lite');
  ALTER TABLE "_image_profiles_v" ALTER COLUMN "version_image_model_preset" SET DEFAULT 'openai-gpt-image-2'::"public"."enum__image_profiles_v_version_image_model_preset";
  ALTER TABLE "_image_profiles_v" ALTER COLUMN "version_image_model_preset" SET DATA TYPE "public"."enum__image_profiles_v_version_image_model_preset" USING "version_image_model_preset"::"public"."enum__image_profiles_v_version_image_model_preset";`)
}
