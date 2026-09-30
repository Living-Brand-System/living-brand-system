import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_card_caption_placement" AS ENUM('below', 'overlay');
  ALTER TABLE "sec_cards" ADD COLUMN "caption_placement" "enum_card_caption_placement" DEFAULT 'below';
  ALTER TABLE "bse_cards" ADD COLUMN "caption_placement" "enum_card_caption_placement" DEFAULT 'below';
  ALTER TABLE "ovw_cards" ADD COLUMN "caption_placement" "enum_card_caption_placement" DEFAULT 'below';
  ALTER TABLE "exm_cards" ADD COLUMN "caption_placement" "enum_card_caption_placement" DEFAULT 'below';
  ALTER TABLE "_sec_v_cards" ADD COLUMN "caption_placement" "enum_card_caption_placement" DEFAULT 'below';
  ALTER TABLE "_bse_v_cards" ADD COLUMN "caption_placement" "enum_card_caption_placement" DEFAULT 'below';
  ALTER TABLE "_ovw_v_cards" ADD COLUMN "caption_placement" "enum_card_caption_placement" DEFAULT 'below';
  ALTER TABLE "_exm_v_cards" ADD COLUMN "caption_placement" "enum_card_caption_placement" DEFAULT 'below';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sec_cards" DROP COLUMN "caption_placement";
  ALTER TABLE "bse_cards" DROP COLUMN "caption_placement";
  ALTER TABLE "ovw_cards" DROP COLUMN "caption_placement";
  ALTER TABLE "exm_cards" DROP COLUMN "caption_placement";
  ALTER TABLE "_sec_v_cards" DROP COLUMN "caption_placement";
  ALTER TABLE "_bse_v_cards" DROP COLUMN "caption_placement";
  ALTER TABLE "_ovw_v_cards" DROP COLUMN "caption_placement";
  ALTER TABLE "_exm_v_cards" DROP COLUMN "caption_placement";
  DROP TYPE "public"."enum_card_caption_placement";`)
}
