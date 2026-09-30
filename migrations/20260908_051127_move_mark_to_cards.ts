import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** 본문과 버전 이력 모두 같은 부모-카드 관계를 쓴다. 식별자는 이 고정 목록에서만 온다. */
const BLOCK_TABLES = ['sec', 'bse', 'ovw', 'exm', '_sec_v', '_bse_v', '_ovw_v', '_exm_v'] as const

// 새 필드 생성 → 값 이관 → 옛 필드 제거. 생성기의 DROP 앞에서 데이터를 옮겨 표식 소실을 막는다.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_card_mark" AS ENUM('none', 'do', 'ok', 'dont');
  ALTER TABLE "sec_cards" ADD COLUMN "mark" "enum_card_mark" DEFAULT 'none';
  ALTER TABLE "bse_cards" ADD COLUMN "mark" "enum_card_mark" DEFAULT 'none';
  ALTER TABLE "ovw_cards" ADD COLUMN "mark" "enum_card_mark" DEFAULT 'none';
  ALTER TABLE "exm_cards" ADD COLUMN "mark" "enum_card_mark" DEFAULT 'none';
  ALTER TABLE "_sec_v_cards" ADD COLUMN "mark" "enum_card_mark" DEFAULT 'none';
  ALTER TABLE "_bse_v_cards" ADD COLUMN "mark" "enum_card_mark" DEFAULT 'none';
  ALTER TABLE "_ovw_v_cards" ADD COLUMN "mark" "enum_card_mark" DEFAULT 'none';
  ALTER TABLE "_exm_v_cards" ADD COLUMN "mark" "enum_card_mark" DEFAULT 'none';
  `)
  for (const table of BLOCK_TABLES) {
    await db.execute(sql.raw(`UPDATE "${table}_cards" AS card
      SET "mark" = COALESCE(block."mark"::text, 'none')::"enum_card_mark"
      FROM "${table}" AS block WHERE card."_parent_id" = block."id";`))
  }
  await db.execute(sql`
  ALTER TABLE "sec" DROP COLUMN "mark";
  ALTER TABLE "bse" DROP COLUMN "mark";
  ALTER TABLE "ovw" DROP COLUMN "mark";
  ALTER TABLE "exm" DROP COLUMN "mark";
  ALTER TABLE "_sec_v" DROP COLUMN "mark";
  ALTER TABLE "_bse_v" DROP COLUMN "mark";
  ALTER TABLE "_ovw_v" DROP COLUMN "mark";
  ALTER TABLE "_exm_v" DROP COLUMN "mark";
  DROP TYPE "public"."enum_block_mark";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // 혼합 카드 표식은 블록의 한 값으로 표현할 수 없다. 스키마를 건드리기 전에 손실성 롤백을 막는다.
  for (const table of BLOCK_TABLES) {
    await db.execute(sql.raw(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "${table}_cards" GROUP BY "_parent_id"
        HAVING COUNT(DISTINCT COALESCE("mark"::text, 'none')) > 1) THEN
        RAISE EXCEPTION 'Cannot roll back card marks: mixed values in ${table}_cards';
      END IF;
    END $$;`))
  }
  await db.execute(sql`
   CREATE TYPE "public"."enum_block_mark" AS ENUM('none', 'do', 'ok', 'dont');
  ALTER TABLE "sec" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "bse" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "ovw" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "exm" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "_sec_v" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "_bse_v" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "_ovw_v" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "_exm_v" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  `)
  for (const table of BLOCK_TABLES) {
    await db.execute(sql.raw(`UPDATE "${table}" AS block
      SET "mark" = cards.mark::"enum_block_mark"
      FROM (SELECT "_parent_id", MIN(COALESCE("mark"::text, 'none')) AS mark
        FROM "${table}_cards" GROUP BY "_parent_id") AS cards
      WHERE block."id" = cards."_parent_id";`))
  }
  await db.execute(sql`
  ALTER TABLE "sec_cards" DROP COLUMN "mark";
  ALTER TABLE "bse_cards" DROP COLUMN "mark";
  ALTER TABLE "ovw_cards" DROP COLUMN "mark";
  ALTER TABLE "exm_cards" DROP COLUMN "mark";
  ALTER TABLE "_sec_v_cards" DROP COLUMN "mark";
  ALTER TABLE "_bse_v_cards" DROP COLUMN "mark";
  ALTER TABLE "_ovw_v_cards" DROP COLUMN "mark";
  ALTER TABLE "_exm_v_cards" DROP COLUMN "mark";
  DROP TYPE "public"."enum_card_mark";`)
}
