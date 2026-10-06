import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_cards_ratio" ADD VALUE '5:3' BEFORE '16:9';
  ALTER TYPE "public"."enum__cards_v_ratio" ADD VALUE '5:3' BEFORE '16:9';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cards" ALTER COLUMN "ratio" SET DATA TYPE text;
  ALTER TABLE "cards" ALTER COLUMN "ratio" SET DEFAULT '4:3'::text;
  DROP TYPE "public"."enum_cards_ratio";
  CREATE TYPE "public"."enum_cards_ratio" AS ENUM('1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16');
  ALTER TABLE "cards" ALTER COLUMN "ratio" SET DEFAULT '4:3'::"public"."enum_cards_ratio";
  ALTER TABLE "cards" ALTER COLUMN "ratio" SET DATA TYPE "public"."enum_cards_ratio" USING "ratio"::"public"."enum_cards_ratio";
  ALTER TABLE "_cards_v" ALTER COLUMN "ratio" SET DATA TYPE text;
  ALTER TABLE "_cards_v" ALTER COLUMN "ratio" SET DEFAULT '4:3'::text;
  DROP TYPE "public"."enum__cards_v_ratio";
  CREATE TYPE "public"."enum__cards_v_ratio" AS ENUM('1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16');
  ALTER TABLE "_cards_v" ALTER COLUMN "ratio" SET DEFAULT '4:3'::"public"."enum__cards_v_ratio";
  ALTER TABLE "_cards_v" ALTER COLUMN "ratio" SET DATA TYPE "public"."enum__cards_v_ratio" USING "ratio"::"public"."enum__cards_v_ratio";`)
}
