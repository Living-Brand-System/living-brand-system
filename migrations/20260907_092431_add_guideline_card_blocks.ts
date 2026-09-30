import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * 블록 > 카드 모델(2026-09-07): 섹션이 품던 leaf(위젯·이미지)를 **카드**(디스플레이 + 캡션)로 옮긴다.
 *
 * 생성기가 낸 DDL은 카드 테이블을 만들고 img·lgc 테이블을 지우기만 한다 — 그대로 돌리면 섹션 안 leaf 128개가
 * 카드 없이 옛 `_path`에 남아 화면에서 사라진다. 그래서 순서를 바꿨다:
 *   ① 카드·블록 테이블과 sec 컬럼(layout·row_height·asset_download) 생성
 *   ② 이미지 leaf(img) → 정적 디스플레이(sdp) 복사
 *   ③ 섹션 안 leaf마다 카드 행을 만들고 leaf의 `_path`를 카드 안 display 자리로 옮김(본 테이블 + 버전 테이블)
 *   ④ img·lgc 테이블 삭제
 *
 * Payload가 카드 안 디스플레이를 저장하는 꼴(로컬 실측 2026-09-07):
 *   섹션            sec        _path = 'blocks',                      _order = i+1
 *   카드            sec_cards  _parent_id = sec.id,                   _order = j+1
 *   디스플레이      <leaf>     _path = 'blocks.{i}.cards.{j}.display', _order = 1
 *   버전 테이블은 'version.' 접두사, 카드 `_uuid`가 본 테이블 카드 id와 같다.
 *
 * 되돌릴 수 없는 것(사용자 결정 "B", 2026-09-07):
 *   - layout-grid-controls(lgc) 4행 — 컨트롤만 나르는 leaf라 카드로 옮길 그림이 없다. 테이블과 함께 사라진다.
 *   - 컨트롤러 위젯(ci-lockup·clearspace-viewer·layout-grid)은 카드 안에서 하단 Floating Controller를 잃는다.
 *   - 모든 카드 비율은 16:9로 시작한다. admin에서 조정한다.
 */

/** 섹션 안 leaf였던 디스플레이 테이블. img는 ②에서 sdp로 옮긴 뒤 sdp로 다룬다. */
const LEAF_TABLES = [
	'cil', 'cih', 'cso', 'cvw', 'ddw', 'hcp', 'icw', 'scs', 'lgw', 'lgo',
	'lcv', 'lbp', 'ldp', 'lob', 'thr', 'tlg', 'tsw', 'twt', 'tsp', 'sdp',
] as const

/** 옮길 leaf를 한 표에 모은다. 본 테이블은 id, 버전 테이블은 _uuid(= 본 id)로 카드 id를 결정론적으로 만든다. */
function collectMoves(suffix: '' | '_v') {
	const version = suffix === '_v'
	const prefix = version ? 'version.' : ''
	const pattern = `^${version ? 'version\\.' : ''}blocks\\.(\\d+)\\.children$`
	const union = LEAF_TABLES.map(
		(t) => `SELECT '${t}'::text AS tbl, "id"::text AS leaf_id, "_parent_id" AS doc_id, "_order" AS ord,
			((regexp_match("_path", '${pattern}'))[1])::int AS i,
			${version ? '"_uuid"' : '"id"::text'} AS leaf_uuid
		FROM "${version ? '_' : ''}${t}${suffix}" WHERE "_path" ~ '${pattern}'`,
	).join('\n\t\t\tUNION ALL\n\t\t\t')
	const moves = `_card_moves${suffix}`
	const sec = version ? '_sec_v' : 'sec'
	const cards = version ? '_sec_v_cards' : 'sec_cards'
	return {
		moves,
		create: `
		CREATE TABLE "${moves}" AS
		SELECT u.*, substr(md5(coalesce(u.leaf_uuid, u.leaf_id) || ':card'), 1, 24) AS card_id,
			NULL::${version ? 'integer' : 'varchar'} AS sec_id, NULL::int AS j
		FROM (
			${union}
		) u;
		UPDATE "${moves}" m SET sec_id = s."id" FROM "${sec}" s
			WHERE s."_parent_id" = m.doc_id AND s."_path" = '${prefix}blocks' AND s."_order" = m.i + 1;
		UPDATE "${moves}" m SET j = r.rn - 1 FROM (
			SELECT tbl, leaf_id, row_number() OVER (PARTITION BY sec_id ORDER BY ord, tbl, leaf_id) AS rn
			FROM "${moves}" WHERE sec_id IS NOT NULL
		) r WHERE r.tbl = m.tbl AND r.leaf_id = m.leaf_id;
		INSERT INTO "${cards}" ("_order", "_parent_id", ${version ? '"_uuid"' : '"id"'}, "ratio")
			SELECT j + 1, sec_id, card_id, '16:9'::"enum_card_ratio" FROM "${moves}" WHERE sec_id IS NOT NULL;`,
		relink: (t: string) => `
		UPDATE "${version ? '_' : ''}${t}${suffix}" c
			SET "_path" = '${prefix}blocks.' || m.i || '.cards.' || m.j || '.display', "_order" = 1
			FROM "${moves}" m WHERE m.tbl = '${t}' AND m.leaf_id = c."id"::text AND m.sec_id IS NOT NULL;`,
		drop: `DROP TABLE "${moves}";`,
	}
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
	// ① 생성기 DDL(카드·블록 테이블, sec 컬럼). img·lgc DROP만 ④로 옮겼다.
  await db.execute(sql`
   CREATE TYPE "public"."enum_card_ratio" AS ENUM('1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16');
  CREATE TYPE "public"."enum_block_layout" AS ENUM('grid', 'carousel');
  CREATE TYPE "public"."enum_block_row_height" AS ENUM('low', 'medium', 'high');
  CREATE TABLE "sdp" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "sec_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ratio" "enum_card_ratio" DEFAULT '16:9'
  );
  
  CREATE TABLE "sec_cards_locales" (
  	"caption_title" varchar,
  	"caption_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "bse_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ratio" "enum_card_ratio" DEFAULT '16:9'
  );
  
  CREATE TABLE "bse_cards_locales" (
  	"caption_title" varchar,
  	"caption_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "bse" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"layout" "enum_block_layout" DEFAULT 'grid',
  	"row_height" "enum_block_row_height" DEFAULT 'medium',
  	"asset_download" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "bse_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "ovw_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ratio" "enum_card_ratio" DEFAULT '16:9'
  );
  
  CREATE TABLE "ovw_cards_locales" (
  	"caption_title" varchar,
  	"caption_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "ovw" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"layout" "enum_block_layout" DEFAULT 'carousel',
  	"row_height" "enum_block_row_height" DEFAULT 'medium',
  	"asset_download" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "ovw_locales" (
  	"title" varchar DEFAULT '한 눈에 보기',
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "exm_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ratio" "enum_card_ratio" DEFAULT '16:9'
  );
  
  CREATE TABLE "exm_cards_locales" (
  	"caption_title" varchar,
  	"caption_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "exm" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"layout" "enum_block_layout" DEFAULT 'carousel',
  	"row_height" "enum_block_row_height" DEFAULT 'medium',
  	"asset_download" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "exm_locales" (
  	"title" varchar DEFAULT '예제',
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_sdp_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_sec_v_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ratio" "enum_card_ratio" DEFAULT '16:9',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_sec_v_cards_locales" (
  	"caption_title" varchar,
  	"caption_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_bse_v_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ratio" "enum_card_ratio" DEFAULT '16:9',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_bse_v_cards_locales" (
  	"caption_title" varchar,
  	"caption_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_bse_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"layout" "enum_block_layout" DEFAULT 'grid',
  	"row_height" "enum_block_row_height" DEFAULT 'medium',
  	"asset_download" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_bse_v_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_ovw_v_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ratio" "enum_card_ratio" DEFAULT '16:9',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_ovw_v_cards_locales" (
  	"caption_title" varchar,
  	"caption_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_ovw_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"layout" "enum_block_layout" DEFAULT 'carousel',
  	"row_height" "enum_block_row_height" DEFAULT 'medium',
  	"asset_download" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_ovw_v_locales" (
  	"title" varchar DEFAULT '한 눈에 보기',
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_exm_v_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ratio" "enum_card_ratio" DEFAULT '16:9',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_exm_v_cards_locales" (
  	"caption_title" varchar,
  	"caption_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_exm_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"layout" "enum_block_layout" DEFAULT 'carousel',
  	"row_height" "enum_block_row_height" DEFAULT 'medium',
  	"asset_download" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_exm_v_locales" (
  	"title" varchar DEFAULT '예제',
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "sec" ADD COLUMN "layout" "enum_block_layout" DEFAULT 'grid';
  ALTER TABLE "sec" ADD COLUMN "row_height" "enum_block_row_height" DEFAULT 'medium';
  ALTER TABLE "sec" ADD COLUMN "asset_download" boolean DEFAULT false;
  ALTER TABLE "_sec_v" ADD COLUMN "layout" "enum_block_layout" DEFAULT 'grid';
  ALTER TABLE "_sec_v" ADD COLUMN "row_height" "enum_block_row_height" DEFAULT 'medium';
  ALTER TABLE "_sec_v" ADD COLUMN "asset_download" boolean DEFAULT false;
  ALTER TABLE "sdp" ADD CONSTRAINT "sdp_image_id_application_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sdp" ADD CONSTRAINT "sdp_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sec_cards" ADD CONSTRAINT "sec_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sec_cards_locales" ADD CONSTRAINT "sec_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sec_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bse_cards" ADD CONSTRAINT "bse_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bse"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bse_cards_locales" ADD CONSTRAINT "bse_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bse_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bse" ADD CONSTRAINT "bse_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bse_locales" ADD CONSTRAINT "bse_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bse"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ovw_cards" ADD CONSTRAINT "ovw_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ovw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ovw_cards_locales" ADD CONSTRAINT "ovw_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ovw_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ovw" ADD CONSTRAINT "ovw_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ovw_locales" ADD CONSTRAINT "ovw_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ovw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exm_cards" ADD CONSTRAINT "exm_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exm"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exm_cards_locales" ADD CONSTRAINT "exm_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exm_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exm" ADD CONSTRAINT "exm_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exm_locales" ADD CONSTRAINT "exm_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exm"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sdp_v" ADD CONSTRAINT "_sdp_v_image_id_application_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sdp_v" ADD CONSTRAINT "_sdp_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sec_v_cards" ADD CONSTRAINT "_sec_v_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_sec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sec_v_cards_locales" ADD CONSTRAINT "_sec_v_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_sec_v_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bse_v_cards" ADD CONSTRAINT "_bse_v_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_bse_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bse_v_cards_locales" ADD CONSTRAINT "_bse_v_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_bse_v_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bse_v" ADD CONSTRAINT "_bse_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bse_v_locales" ADD CONSTRAINT "_bse_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_bse_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ovw_v_cards" ADD CONSTRAINT "_ovw_v_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ovw_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ovw_v_cards_locales" ADD CONSTRAINT "_ovw_v_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ovw_v_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ovw_v" ADD CONSTRAINT "_ovw_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ovw_v_locales" ADD CONSTRAINT "_ovw_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ovw_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exm_v_cards" ADD CONSTRAINT "_exm_v_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_exm_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exm_v_cards_locales" ADD CONSTRAINT "_exm_v_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_exm_v_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exm_v" ADD CONSTRAINT "_exm_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exm_v_locales" ADD CONSTRAINT "_exm_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_exm_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "sdp_order_idx" ON "sdp" USING btree ("_order");
  CREATE INDEX "sdp_parent_id_idx" ON "sdp" USING btree ("_parent_id");
  CREATE INDEX "sdp_path_idx" ON "sdp" USING btree ("_path");
  CREATE INDEX "sdp_image_idx" ON "sdp" USING btree ("image_id");
  CREATE INDEX "sec_cards_order_idx" ON "sec_cards" USING btree ("_order");
  CREATE INDEX "sec_cards_parent_id_idx" ON "sec_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "sec_cards_locales_locale_parent_id_unique" ON "sec_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "bse_cards_order_idx" ON "bse_cards" USING btree ("_order");
  CREATE INDEX "bse_cards_parent_id_idx" ON "bse_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "bse_cards_locales_locale_parent_id_unique" ON "bse_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "bse_order_idx" ON "bse" USING btree ("_order");
  CREATE INDEX "bse_parent_id_idx" ON "bse" USING btree ("_parent_id");
  CREATE INDEX "bse_path_idx" ON "bse" USING btree ("_path");
  CREATE UNIQUE INDEX "bse_locales_locale_parent_id_unique" ON "bse_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "ovw_cards_order_idx" ON "ovw_cards" USING btree ("_order");
  CREATE INDEX "ovw_cards_parent_id_idx" ON "ovw_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "ovw_cards_locales_locale_parent_id_unique" ON "ovw_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "ovw_order_idx" ON "ovw" USING btree ("_order");
  CREATE INDEX "ovw_parent_id_idx" ON "ovw" USING btree ("_parent_id");
  CREATE INDEX "ovw_path_idx" ON "ovw" USING btree ("_path");
  CREATE UNIQUE INDEX "ovw_locales_locale_parent_id_unique" ON "ovw_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "exm_cards_order_idx" ON "exm_cards" USING btree ("_order");
  CREATE INDEX "exm_cards_parent_id_idx" ON "exm_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "exm_cards_locales_locale_parent_id_unique" ON "exm_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "exm_order_idx" ON "exm" USING btree ("_order");
  CREATE INDEX "exm_parent_id_idx" ON "exm" USING btree ("_parent_id");
  CREATE INDEX "exm_path_idx" ON "exm" USING btree ("_path");
  CREATE UNIQUE INDEX "exm_locales_locale_parent_id_unique" ON "exm_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_sdp_v_order_idx" ON "_sdp_v" USING btree ("_order");
  CREATE INDEX "_sdp_v_parent_id_idx" ON "_sdp_v" USING btree ("_parent_id");
  CREATE INDEX "_sdp_v_path_idx" ON "_sdp_v" USING btree ("_path");
  CREATE INDEX "_sdp_v_image_idx" ON "_sdp_v" USING btree ("image_id");
  CREATE INDEX "_sec_v_cards_order_idx" ON "_sec_v_cards" USING btree ("_order");
  CREATE INDEX "_sec_v_cards_parent_id_idx" ON "_sec_v_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_sec_v_cards_locales_locale_parent_id_unique" ON "_sec_v_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_bse_v_cards_order_idx" ON "_bse_v_cards" USING btree ("_order");
  CREATE INDEX "_bse_v_cards_parent_id_idx" ON "_bse_v_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_bse_v_cards_locales_locale_parent_id_unique" ON "_bse_v_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_bse_v_order_idx" ON "_bse_v" USING btree ("_order");
  CREATE INDEX "_bse_v_parent_id_idx" ON "_bse_v" USING btree ("_parent_id");
  CREATE INDEX "_bse_v_path_idx" ON "_bse_v" USING btree ("_path");
  CREATE UNIQUE INDEX "_bse_v_locales_locale_parent_id_unique" ON "_bse_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_ovw_v_cards_order_idx" ON "_ovw_v_cards" USING btree ("_order");
  CREATE INDEX "_ovw_v_cards_parent_id_idx" ON "_ovw_v_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_ovw_v_cards_locales_locale_parent_id_unique" ON "_ovw_v_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_ovw_v_order_idx" ON "_ovw_v" USING btree ("_order");
  CREATE INDEX "_ovw_v_parent_id_idx" ON "_ovw_v" USING btree ("_parent_id");
  CREATE INDEX "_ovw_v_path_idx" ON "_ovw_v" USING btree ("_path");
  CREATE UNIQUE INDEX "_ovw_v_locales_locale_parent_id_unique" ON "_ovw_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_exm_v_cards_order_idx" ON "_exm_v_cards" USING btree ("_order");
  CREATE INDEX "_exm_v_cards_parent_id_idx" ON "_exm_v_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_exm_v_cards_locales_locale_parent_id_unique" ON "_exm_v_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_exm_v_order_idx" ON "_exm_v" USING btree ("_order");
  CREATE INDEX "_exm_v_parent_id_idx" ON "_exm_v" USING btree ("_parent_id");
  CREATE INDEX "_exm_v_path_idx" ON "_exm_v" USING btree ("_path");
  CREATE UNIQUE INDEX "_exm_v_locales_locale_parent_id_unique" ON "_exm_v_locales" USING btree ("_locale","_parent_id");`)

	// ② 이미지 leaf → 정적 디스플레이. 테이블만 바뀌고 자리(_path)는 그대로라 ③이 다른 leaf와 같이 다룬다.
	await db.execute(sql`
  INSERT INTO "sdp" ("_order", "_parent_id", "_path", "id", "image_id", "block_name")
    SELECT "_order", "_parent_id", "_path", "id", "image_id", "block_name" FROM "img";
  INSERT INTO "_sdp_v" ("_order", "_parent_id", "_path", "image_id", "_uuid", "block_name")
    SELECT "_order", "_parent_id", "_path", "image_id", "_uuid", "block_name" FROM "_img_v";`)

	// ③ leaf → 카드. 본 테이블과 버전 테이블 각각.
	for (const suffix of ['', '_v'] as const) {
		const step = collectMoves(suffix)
		await db.execute(sql.raw(step.create))
		for (const t of LEAF_TABLES) await db.execute(sql.raw(step.relink(t)))
		await db.execute(sql.raw(step.drop))
	}

	// ④ 이제 비어 있거나(img) 옮길 그림이 없는(lgc) 테이블을 지운다.
	await db.execute(sql`
  DROP TABLE "img" CASCADE;
  DROP TABLE "lgc" CASCADE;
  DROP TABLE "_img_v" CASCADE;
  DROP TABLE "_lgc_v" CASCADE;`)
}

/** 되돌리면 빈 img·lgc 테이블만 되살아난다 — 카드로 옮긴 leaf는 카드 안에 남고 lgc 행은 복구되지 않는다. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "img" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"span" "enum_leaf_span" DEFAULT 'full',
  	"block_name" varchar
  );
  
  CREATE TABLE "lgc" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"margin_pct" numeric DEFAULT 4.5,
  	"margin_adjustable" boolean DEFAULT true,
  	"gutter_x" numeric DEFAULT 75,
  	"gutter_x_adjustable" boolean DEFAULT true,
  	"gutter_y" numeric DEFAULT 75,
  	"gutter_y_adjustable" boolean DEFAULT true,
  	"guides_on" boolean DEFAULT true,
  	"guides_adjustable" boolean DEFAULT true,
  	"span" "enum_leaf_span" DEFAULT 'full',
  	"block_name" varchar
  );
  
  CREATE TABLE "_img_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"span" "enum_leaf_span" DEFAULT 'full',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_lgc_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"margin_pct" numeric DEFAULT 4.5,
  	"margin_adjustable" boolean DEFAULT true,
  	"gutter_x" numeric DEFAULT 75,
  	"gutter_x_adjustable" boolean DEFAULT true,
  	"gutter_y" numeric DEFAULT 75,
  	"gutter_y_adjustable" boolean DEFAULT true,
  	"guides_on" boolean DEFAULT true,
  	"guides_adjustable" boolean DEFAULT true,
  	"span" "enum_leaf_span" DEFAULT 'full',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  DROP TABLE "sdp" CASCADE;
  DROP TABLE "sec_cards" CASCADE;
  DROP TABLE "sec_cards_locales" CASCADE;
  DROP TABLE "bse_cards" CASCADE;
  DROP TABLE "bse_cards_locales" CASCADE;
  DROP TABLE "bse" CASCADE;
  DROP TABLE "bse_locales" CASCADE;
  DROP TABLE "ovw_cards" CASCADE;
  DROP TABLE "ovw_cards_locales" CASCADE;
  DROP TABLE "ovw" CASCADE;
  DROP TABLE "ovw_locales" CASCADE;
  DROP TABLE "exm_cards" CASCADE;
  DROP TABLE "exm_cards_locales" CASCADE;
  DROP TABLE "exm" CASCADE;
  DROP TABLE "exm_locales" CASCADE;
  DROP TABLE "_sdp_v" CASCADE;
  DROP TABLE "_sec_v_cards" CASCADE;
  DROP TABLE "_sec_v_cards_locales" CASCADE;
  DROP TABLE "_bse_v_cards" CASCADE;
  DROP TABLE "_bse_v_cards_locales" CASCADE;
  DROP TABLE "_bse_v" CASCADE;
  DROP TABLE "_bse_v_locales" CASCADE;
  DROP TABLE "_ovw_v_cards" CASCADE;
  DROP TABLE "_ovw_v_cards_locales" CASCADE;
  DROP TABLE "_ovw_v" CASCADE;
  DROP TABLE "_ovw_v_locales" CASCADE;
  DROP TABLE "_exm_v_cards" CASCADE;
  DROP TABLE "_exm_v_cards_locales" CASCADE;
  DROP TABLE "_exm_v" CASCADE;
  DROP TABLE "_exm_v_locales" CASCADE;
  ALTER TABLE "img" ADD CONSTRAINT "img_image_id_application_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "img" ADD CONSTRAINT "img_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lgc" ADD CONSTRAINT "lgc_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_img_v" ADD CONSTRAINT "_img_v_image_id_application_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_img_v" ADD CONSTRAINT "_img_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lgc_v" ADD CONSTRAINT "_lgc_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "img_order_idx" ON "img" USING btree ("_order");
  CREATE INDEX "img_parent_id_idx" ON "img" USING btree ("_parent_id");
  CREATE INDEX "img_path_idx" ON "img" USING btree ("_path");
  CREATE INDEX "img_image_idx" ON "img" USING btree ("image_id");
  CREATE INDEX "lgc_order_idx" ON "lgc" USING btree ("_order");
  CREATE INDEX "lgc_parent_id_idx" ON "lgc" USING btree ("_parent_id");
  CREATE INDEX "lgc_path_idx" ON "lgc" USING btree ("_path");
  CREATE INDEX "_img_v_order_idx" ON "_img_v" USING btree ("_order");
  CREATE INDEX "_img_v_parent_id_idx" ON "_img_v" USING btree ("_parent_id");
  CREATE INDEX "_img_v_path_idx" ON "_img_v" USING btree ("_path");
  CREATE INDEX "_img_v_image_idx" ON "_img_v" USING btree ("image_id");
  CREATE INDEX "_lgc_v_order_idx" ON "_lgc_v" USING btree ("_order");
  CREATE INDEX "_lgc_v_parent_id_idx" ON "_lgc_v" USING btree ("_parent_id");
  CREATE INDEX "_lgc_v_path_idx" ON "_lgc_v" USING btree ("_path");
  ALTER TABLE "sec" DROP COLUMN "layout";
  ALTER TABLE "sec" DROP COLUMN "row_height";
  ALTER TABLE "sec" DROP COLUMN "asset_download";
  ALTER TABLE "_sec_v" DROP COLUMN "layout";
  ALTER TABLE "_sec_v" DROP COLUMN "row_height";
  ALTER TABLE "_sec_v" DROP COLUMN "asset_download";
  DROP TYPE "public"."enum_card_ratio";
  DROP TYPE "public"."enum_block_layout";
  DROP TYPE "public"."enum_block_row_height";`)
}
