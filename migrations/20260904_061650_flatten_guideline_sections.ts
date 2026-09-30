import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * 블록 층을 걷는다(2026-09-04): 섹션 > 블록 > leaf 를 섹션 > leaf 로. 블록이 정하던 "몇 열"은 leaf의 `span`이,
 * 블록의 배경(면)은 어디에도 남지 않는다.
 *
 * 🔴 생성기가 낸 SQL은 blk 테이블을 지우기만 한다 — 그대로 돌리면 블록 안 leaf가 부모를 잃고 배치 정보가 사라진다.
 *    그래서 순서를 바꿨다: span 컬럼 추가 → leaf를 부모 섹션으로 올리고 span을 채움 → 루트 블록을 제목 없는
 *    섹션으로 바꿈 → blk 테이블·면 컬럼·enum 삭제.
 *
 * Payload가 중첩 블록을 저장하는 꼴(로컬 실측):
 *   루트 블록          _path = 'blocks',                       _order = i+1
 *   섹션 안 블록       _path = 'blocks.{i}.blocks',           _order = j+1
 *   블록 안 leaf       _path = 'blocks.{i}.blocks.{j}.children'
 *   루트 블록 안 leaf  _path = 'blocks.{i}.children'
 *   버전 테이블은 같은 꼴에 'version.' 접두사, _parent_id는 버전 행 id.
 *
 * 되돌릴 수 없는 것: 블록 배경 14건과 블록 간격 1건(게시 스냅샷 기준)은 값이 사라진다 — 사용자 결정(2026-09-04).
 */
const LEAF_TABLES = [
	'img', 'cil', 'cih', 'cso', 'cvw', 'ddw', 'hcp', 'icw', 'scs', 'lgw', 'lgc', 'lgo',
	'lcv', 'lbp', 'ldp', 'lob', 'thr', 'tlg', 'tsw', 'twt', 'tsp',
] as const

const SPAN_FROM_COLUMNS = `CASE WHEN b."columns" IS NULL OR b."columns" <= 1 THEN 'full' WHEN b."columns" = 2 THEN 'half' ELSE 'third' END::"enum_leaf_span"`

/** 블록 안 leaf를 부모 섹션의 children으로 올린다. 순서는 (블록 순서 × 100 + leaf 순서)로 이어 붙인다 — Payload는 다음 저장에서 다시 매긴다. */
function liftNestedLeaves(leafTable: string, blockTable: string) {
	return `
		UPDATE "${leafTable}" c SET
			"span" = ${SPAN_FROM_COLUMNS},
			"_path" = m.prefix || '.children',
			"_order" = (b."_order" - 1) * 100 + c."_order"
		FROM (
			SELECT "id",
				(regexp_match("_path", '^((?:version\\.)?blocks\\.\\d+)\\.blocks\\.(\\d+)\\.children$'))[1] AS prefix,
				((regexp_match("_path", '^((?:version\\.)?blocks\\.\\d+)\\.blocks\\.(\\d+)\\.children$'))[2])::int AS j
			FROM "${leafTable}"
		) m
		JOIN "${blockTable}" b ON b."_path" = m.prefix || '.blocks' AND b."_order" = m.j + 1
		WHERE c."id" = m."id" AND b."_parent_id" = c."_parent_id" AND m.prefix IS NOT NULL;`
}

/** 루트 블록 안 leaf는 자리(_path)를 그대로 두고 span만 채운다 — 그 블록이 곧 제목 없는 섹션이 된다. */
function spanRootLeaves(leafTable: string, blockTable: string) {
	return `
		UPDATE "${leafTable}" c SET "span" = ${SPAN_FROM_COLUMNS}
		FROM (
			SELECT "id",
				(regexp_match("_path", '^((?:version\\.)?blocks)\\.(\\d+)\\.children$'))[1] AS prefix,
				((regexp_match("_path", '^((?:version\\.)?blocks)\\.(\\d+)\\.children$'))[2])::int AS i
			FROM "${leafTable}"
		) m
		JOIN "${blockTable}" b ON b."_path" = m.prefix AND b."_order" = m.i + 1
		WHERE c."id" = m."id" AND b."_parent_id" = c."_parent_id" AND m.prefix IS NOT NULL;`
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
	// 1. span 컬럼
	await db.execute(sql`
  CREATE TYPE "public"."enum_leaf_span" AS ENUM('full', 'half', 'third');
  ALTER TABLE "img" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "cil" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "cih" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "cso" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "cvw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "ddw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "hcp" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "icw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "scs" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lgw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lgc" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lgo" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lcv" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lbp" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "ldp" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "lob" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "thr" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "tlg" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "tsw" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "twt" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "tsp" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_img_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_cil_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_cih_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_cso_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_cvw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_ddw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_hcp_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_icw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_scs_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lgw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lgc_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lgo_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lcv_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lbp_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_ldp_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_lob_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_thr_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_tlg_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_tsw_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_twt_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';
  ALTER TABLE "_tsp_v" ADD COLUMN "span" "enum_leaf_span" DEFAULT 'full';`)

	// 2. leaf를 섹션으로 올리고 폭을 채운다(본 테이블 + 버전 테이블)
	for (const leaf of LEAF_TABLES) {
		await db.execute(sql.raw(liftNestedLeaves(leaf, 'blk')))
		await db.execute(sql.raw(spanRootLeaves(leaf, 'blk')))
		await db.execute(sql.raw(liftNestedLeaves(`_${leaf}_v`, '_blk_v')))
		await db.execute(sql.raw(spanRootLeaves(`_${leaf}_v`, '_blk_v')))
	}

	// 3. 루트 블록은 제목 없는 섹션이 된다 — id를 그대로 이어받아 leaf의 '_path'가 유효하게 남는다.
	await db.execute(sql`
  INSERT INTO "sec" ("_order", "_parent_id", "_path", "id", "block_name")
    SELECT "_order", "_parent_id", "_path", "id", "block_name" FROM "blk" WHERE "_path" = 'blocks';
  INSERT INTO "_sec_v" ("_order", "_parent_id", "_path", "_uuid", "block_name")
    SELECT "_order", "_parent_id", "_path", "_uuid", "block_name" FROM "_blk_v" WHERE "_path" = 'version.blocks';`)

	// 4. 블록 테이블·면 컬럼·enum 삭제
	await db.execute(sql`
  ALTER TABLE "blk" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blk_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_blk_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_blk_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "blk" CASCADE;
  DROP TABLE "blk_locales" CASCADE;
  DROP TABLE "_blk_v" CASCADE;
  DROP TABLE "_blk_v_locales" CASCADE;
  ALTER TABLE "sec" DROP CONSTRAINT "sec_background_id_brand_colors_id_fk";
  ALTER TABLE "_sec_v" DROP CONSTRAINT "_sec_v_background_id_brand_colors_id_fk";
  DROP INDEX "sec_background_idx";
  DROP INDEX "_sec_v_background_idx";
  ALTER TABLE "sec" DROP COLUMN "background_id";
  ALTER TABLE "sec" DROP COLUMN "background_tone";
  ALTER TABLE "_sec_v" DROP COLUMN "background_id";
  ALTER TABLE "_sec_v" DROP COLUMN "background_tone";
  DROP TYPE "public"."enum_background_tone";
  DROP TYPE "public"."enum_block_arrangement";
  DROP TYPE "public"."enum_block_gap";
  DROP TYPE "public"."enum_block_aspect_ratio";`)
}

/** 되돌리면 빈 blk 테이블과 면 컬럼만 되살아난다 — 올린 leaf는 섹션에 남고 배경 값은 복구되지 않는다. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_background_tone" AS ENUM('solid', 'tint');
  CREATE TYPE "public"."enum_block_arrangement" AS ENUM('grid', 'carousel', 'featured', 'featuredSide', 'masonry');
  CREATE TYPE "public"."enum_block_gap" AS ENUM('default', 'none');
  CREATE TYPE "public"."enum_block_aspect_ratio" AS ENUM('original', '1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16');
  CREATE TABLE "blk" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background_id" integer,
  	"background_tone" "enum_background_tone" DEFAULT 'solid',
  	"inner_background_id" integer,
  	"arrangement" "enum_block_arrangement" DEFAULT 'grid',
  	"columns" numeric DEFAULT 2,
  	"gap" "enum_block_gap" DEFAULT 'default',
  	"aspect_ratio" "enum_block_aspect_ratio" DEFAULT '1:1',
  	"block_name" varchar
  );
  
  CREATE TABLE "blk_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_blk_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background_id" integer,
  	"background_tone" "enum_background_tone" DEFAULT 'solid',
  	"inner_background_id" integer,
  	"arrangement" "enum_block_arrangement" DEFAULT 'grid',
  	"columns" numeric DEFAULT 2,
  	"gap" "enum_block_gap" DEFAULT 'default',
  	"aspect_ratio" "enum_block_aspect_ratio" DEFAULT '1:1',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_blk_v_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "sec" ADD COLUMN "background_id" integer;
  ALTER TABLE "sec" ADD COLUMN "background_tone" "enum_background_tone" DEFAULT 'solid';
  ALTER TABLE "_sec_v" ADD COLUMN "background_id" integer;
  ALTER TABLE "_sec_v" ADD COLUMN "background_tone" "enum_background_tone" DEFAULT 'solid';
  ALTER TABLE "blk" ADD CONSTRAINT "blk_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blk" ADD CONSTRAINT "blk_inner_background_id_brand_colors_id_fk" FOREIGN KEY ("inner_background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blk" ADD CONSTRAINT "blk_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blk_locales" ADD CONSTRAINT "blk_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blk_v" ADD CONSTRAINT "_blk_v_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blk_v" ADD CONSTRAINT "_blk_v_inner_background_id_brand_colors_id_fk" FOREIGN KEY ("inner_background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blk_v" ADD CONSTRAINT "_blk_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blk_v_locales" ADD CONSTRAINT "_blk_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blk_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "blk_order_idx" ON "blk" USING btree ("_order");
  CREATE INDEX "blk_parent_id_idx" ON "blk" USING btree ("_parent_id");
  CREATE INDEX "blk_path_idx" ON "blk" USING btree ("_path");
  CREATE INDEX "blk_background_idx" ON "blk" USING btree ("background_id");
  CREATE INDEX "blk_inner_background_idx" ON "blk" USING btree ("inner_background_id");
  CREATE UNIQUE INDEX "blk_locales_locale_parent_id_unique" ON "blk_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_blk_v_order_idx" ON "_blk_v" USING btree ("_order");
  CREATE INDEX "_blk_v_parent_id_idx" ON "_blk_v" USING btree ("_parent_id");
  CREATE INDEX "_blk_v_path_idx" ON "_blk_v" USING btree ("_path");
  CREATE INDEX "_blk_v_background_idx" ON "_blk_v" USING btree ("background_id");
  CREATE INDEX "_blk_v_inner_background_idx" ON "_blk_v" USING btree ("inner_background_id");
  CREATE UNIQUE INDEX "_blk_v_locales_locale_parent_id_unique" ON "_blk_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "sec" ADD CONSTRAINT "sec_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sec_v" ADD CONSTRAINT "_sec_v_background_id_brand_colors_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."brand_colors"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "sec_background_idx" ON "sec" USING btree ("background_id");
  CREATE INDEX "_sec_v_background_idx" ON "_sec_v" USING btree ("background_id");
  ALTER TABLE "img" DROP COLUMN "span";
  ALTER TABLE "cil" DROP COLUMN "span";
  ALTER TABLE "cih" DROP COLUMN "span";
  ALTER TABLE "cso" DROP COLUMN "span";
  ALTER TABLE "cvw" DROP COLUMN "span";
  ALTER TABLE "ddw" DROP COLUMN "span";
  ALTER TABLE "hcp" DROP COLUMN "span";
  ALTER TABLE "icw" DROP COLUMN "span";
  ALTER TABLE "scs" DROP COLUMN "span";
  ALTER TABLE "lgw" DROP COLUMN "span";
  ALTER TABLE "lgc" DROP COLUMN "span";
  ALTER TABLE "lgo" DROP COLUMN "span";
  ALTER TABLE "lcv" DROP COLUMN "span";
  ALTER TABLE "lbp" DROP COLUMN "span";
  ALTER TABLE "ldp" DROP COLUMN "span";
  ALTER TABLE "lob" DROP COLUMN "span";
  ALTER TABLE "thr" DROP COLUMN "span";
  ALTER TABLE "tlg" DROP COLUMN "span";
  ALTER TABLE "tsw" DROP COLUMN "span";
  ALTER TABLE "twt" DROP COLUMN "span";
  ALTER TABLE "tsp" DROP COLUMN "span";
  ALTER TABLE "_img_v" DROP COLUMN "span";
  ALTER TABLE "_cil_v" DROP COLUMN "span";
  ALTER TABLE "_cih_v" DROP COLUMN "span";
  ALTER TABLE "_cso_v" DROP COLUMN "span";
  ALTER TABLE "_cvw_v" DROP COLUMN "span";
  ALTER TABLE "_ddw_v" DROP COLUMN "span";
  ALTER TABLE "_hcp_v" DROP COLUMN "span";
  ALTER TABLE "_icw_v" DROP COLUMN "span";
  ALTER TABLE "_scs_v" DROP COLUMN "span";
  ALTER TABLE "_lgw_v" DROP COLUMN "span";
  ALTER TABLE "_lgc_v" DROP COLUMN "span";
  ALTER TABLE "_lgo_v" DROP COLUMN "span";
  ALTER TABLE "_lcv_v" DROP COLUMN "span";
  ALTER TABLE "_lbp_v" DROP COLUMN "span";
  ALTER TABLE "_ldp_v" DROP COLUMN "span";
  ALTER TABLE "_lob_v" DROP COLUMN "span";
  ALTER TABLE "_thr_v" DROP COLUMN "span";
  ALTER TABLE "_tlg_v" DROP COLUMN "span";
  ALTER TABLE "_tsw_v" DROP COLUMN "span";
  ALTER TABLE "_twt_v" DROP COLUMN "span";
  ALTER TABLE "_tsp_v" DROP COLUMN "span";
  DROP TYPE "public"."enum_leaf_span";`)
}
