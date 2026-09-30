import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * 위젯 폴더를 `cards/displays/dynamics/`로 이관하며 leaf 레지스트리를 지웠다(2026-09-08). 그 레지스트리가 위젯마다
 * 붙이던 `span`(전폭·절반·삼분)은 카드 안에서 뜻이 없었으므로 컬럼과 enum을 함께 걷는다. 카드 폭은 비율이 정한다.
 * 데이터 손실: span 값 자체. 카드 모델에서는 쓰이지 않는 값이다.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cih" DROP COLUMN "span";
  ALTER TABLE "cso" DROP COLUMN "span";
  ALTER TABLE "lbp" DROP COLUMN "span";
  ALTER TABLE "ldp" DROP COLUMN "span";
  ALTER TABLE "tsw" DROP COLUMN "span";
  ALTER TABLE "twt" DROP COLUMN "span";
  ALTER TABLE "tsp" DROP COLUMN "span";
  ALTER TABLE "lgo" DROP COLUMN "span";
  ALTER TABLE "cil" DROP COLUMN "span";
  ALTER TABLE "cvw" DROP COLUMN "span";
  ALTER TABLE "lgw" DROP COLUMN "span";
  ALTER TABLE "ddw" DROP COLUMN "span";
  ALTER TABLE "hcp" DROP COLUMN "span";
  ALTER TABLE "icw" DROP COLUMN "span";
  ALTER TABLE "scs" DROP COLUMN "span";
  ALTER TABLE "lcv" DROP COLUMN "span";
  ALTER TABLE "lob" DROP COLUMN "span";
  ALTER TABLE "thr" DROP COLUMN "span";
  ALTER TABLE "tlg" DROP COLUMN "span";
  ALTER TABLE "_cih_v" DROP COLUMN "span";
  ALTER TABLE "_cso_v" DROP COLUMN "span";
  ALTER TABLE "_lbp_v" DROP COLUMN "span";
  ALTER TABLE "_ldp_v" DROP COLUMN "span";
  ALTER TABLE "_tsw_v" DROP COLUMN "span";
  ALTER TABLE "_twt_v" DROP COLUMN "span";
  ALTER TABLE "_tsp_v" DROP COLUMN "span";
  ALTER TABLE "_lgo_v" DROP COLUMN "span";
  ALTER TABLE "_cil_v" DROP COLUMN "span";
  ALTER TABLE "_cvw_v" DROP COLUMN "span";
  ALTER TABLE "_lgw_v" DROP COLUMN "span";
  ALTER TABLE "_ddw_v" DROP COLUMN "span";
  ALTER TABLE "_hcp_v" DROP COLUMN "span";
  ALTER TABLE "_icw_v" DROP COLUMN "span";
  ALTER TABLE "_scs_v" DROP COLUMN "span";
  ALTER TABLE "_lcv_v" DROP COLUMN "span";
  ALTER TABLE "_lob_v" DROP COLUMN "span";
  ALTER TABLE "_thr_v" DROP COLUMN "span";
  ALTER TABLE "_tlg_v" DROP COLUMN "span";
  DROP TYPE "public"."enum_leaf_span";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_leaf_span" AS ENUM('full', 'half', 'third');
  ALTER TABLE "cih" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "cso" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lbp" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "ldp" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "tsw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "twt" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "tsp" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lgo" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "cil" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "cvw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lgw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "ddw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "hcp" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "icw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "scs" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lcv" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lob" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "thr" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "tlg" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_cih_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_cso_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lbp_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_ldp_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_tsw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_twt_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_tsp_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lgo_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_cil_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_cvw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lgw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_ddw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_hcp_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_icw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_scs_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lcv_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lob_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_thr_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_tlg_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';`)
}
