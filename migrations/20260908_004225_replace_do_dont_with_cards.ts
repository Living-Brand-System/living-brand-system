import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Do/Don't 위젯을 카드로 대체한다(2026-09-08). 위젯 하나의 예시 N개가 카드 N장이 된다:
 *   - 그림: 이미지 예시 → 정적 디스플레이(sdp), 프리셋 예시 → 프리셋 패널 디스플레이(ppd, 위젯의 logo를 카드마다 복사)
 *   - 캡션: 제목 = item_label + 순번("INCORRECT USAGE 1"), 설명 = 예시 캡션(lexical 문단 하나)
 *   - 비율: 위젯의 image_ratio. 카드 비율 어휘에 없는 'original'은 16:9로
 *   - Do/OK/Don't: 카드가 아니라 **블록**의 `mark`. 한 위젯의 예시가 전부 같은 kind일 때만 채운다(실데이터는 전부 dont)
 *
 * 생성기가 낸 DDL은 ppd·mark를 만들고 ddw 테이블을 지우기만 한다 — 그대로 돌리면 예시 24개가 사라진다. 그래서
 * ① DDL(생성) → ② 데이터 이동(본·버전 테이블) → ③ ddw 테이블·enum 삭제 순서로 바꿨다.
 *
 * 카드 순서: 위젯이 앉아 있던 카드 자리에 예시 카드들이 그 순서대로 들어가고, 뒤 카드는 밀린다. 그래서 그 섹션의
 * 모든 카드 `_order`와 디스플레이 `_path`(…cards.{j}.display)를 다시 매긴다(j = 0부터의 위치).
 *
 * 되돌릴 수 없는 것: 위젯의 columns(열 수) — 블록 줄 높이가 대신한다. 순번은 제목 텍스트로 굳는다(재정렬해도 안 바뀐다).
 */

/** 카드 안 디스플레이 테이블 전부. 옮긴 카드 뒤 카드들의 `_path`를 다시 매길 때 훑는다. */
const DISPLAY_TABLES = [
	'cil', 'cih', 'cso', 'cvw', 'hcp', 'icw', 'scs', 'lgw', 'lgo', 'lcv',
	'lbp', 'ldp', 'lob', 'thr', 'tlg', 'tsw', 'twt', 'tsp', 'sdp', 'ppd',
] as const

const CARD_RATIOS = ['1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16']

/** 예시 캡션(평문) → lexical 문단 하나. GuidelineDescription이 읽는 최소 꼴이다. */
const LEXICAL = (text: string) => `jsonb_build_object('root', jsonb_build_object(
	'type', 'root', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr',
	'children', jsonb_build_array(jsonb_build_object(
		'type', 'paragraph', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr', 'textFormat', 0, 'textStyle', '',
		'children', jsonb_build_array(jsonb_build_object(
			'type', 'text', 'text', ${text}, 'format', 0, 'style', '', 'mode', 'normal', 'detail', 0, 'version', 1))))))`

/**
 * 본 테이블(suffix '')과 버전 테이블(suffix '_v')에 같은 이동을 낸다. 둘의 차이는 id 타입(varchar/serial)과
 * `_uuid`, 경로의 'version.' 접두사뿐이다. 카드 id는 예시 id(버전은 _uuid = 본 id)에서 결정론적으로 만들어
 * 본·버전이 같은 카드 id를 갖게 한다.
 */
function doDontMoves(suffix: '' | '_v'): string[] {
	const v = suffix === '_v'
	const T = (name: string) => `"${v ? '_' : ''}${name}${suffix}"`
	const prefix = v ? 'version.' : ''
	const pattern = `^${v ? 'version\\.' : ''}blocks\\.(\\d+)\\.cards\\.(\\d+)\\.display$`
	const moves = `"_ddw_moves${suffix}"`
	const order = `"_card_order${suffix}"`
	const cardsT = v ? '"_sec_v_cards"' : '"sec_cards"'
	const cardsL = v ? '"_sec_v_cards_locales"' : '"sec_cards_locales"'
	const secT = v ? '"_sec_v"' : '"sec"'
	const examplesT = v ? '"_ddw_v_examples"' : '"ddw_examples"'
	const examplesL = v ? '"_ddw_v_examples_locales"' : '"ddw_examples_locales"'
	// 카드 pk: 본은 우리가 정한 id, 버전은 serial이라 _uuid로 찾는다.
	const cardKey = v ? '"_uuid"' : '"id"'
	const path = (j: string) => `'${prefix}blocks.' || m.i || '.cards.' || ${j} || '.display'`

	return [
		// 1. 이동 대상: 위젯(카드 자리 i·j) × 예시
		`CREATE TABLE ${moves} AS
		SELECT w."id" AS widget_id, w."_parent_id" AS doc_id,
			((regexp_match(w."_path", '${pattern}'))[1])::int AS i,
			((regexp_match(w."_path", '${pattern}'))[2])::int AS j,
			w."image_ratio"::text AS ratio, w."item_label" AS item_label, w."logo_id" AS logo_id,
			e."id" AS example_id, e."_order" AS k, e."image_id" AS image_id, e."preset"::text AS preset, e."kind"::text AS kind,
			substr(md5(coalesce(${v ? 'e."_uuid"' : 'NULL'}, e."id"::text) || ':card'), 1, 24) AS card_id,
			NULL::${v ? 'integer' : 'varchar'} AS sec_id, NULL::${v ? 'integer' : 'varchar'} AS old_card_id
		FROM ${T('ddw')} w JOIN ${examplesT} e ON e."_parent_id" = w."id"
		WHERE w."_path" ~ '${pattern}';`,
		`UPDATE ${moves} m SET sec_id = s."id" FROM ${secT} s
			WHERE s."_parent_id" = m.doc_id AND s."_path" = '${prefix}blocks' AND s."_order" = m.i + 1;`,
		`UPDATE ${moves} m SET old_card_id = c."id" FROM ${cardsT} c
			WHERE c."_parent_id" = m.sec_id AND c."_order" = m.j + 1;`,
		// 2. 해당 섹션의 카드 순서를 다시 매긴다: 기존 카드는 자리 유지, 위젯 카드 자리에 예시 카드들이 순서대로
		`CREATE TABLE ${order} AS
		SELECT x.sec_id, x.card_key, x.old_j, row_number() OVER (PARTITION BY x.sec_id ORDER BY x.sort_key, x.card_key) - 1 AS new_j
		FROM (
			SELECT c."_parent_id" AS sec_id, c.${cardKey}::text AS card_key, c."_order" - 1 AS old_j, c."_order" * 1000 AS sort_key
			FROM ${cardsT} c
			WHERE c."_parent_id" IN (SELECT sec_id FROM ${moves} WHERE sec_id IS NOT NULL)
				AND c."id" NOT IN (SELECT old_card_id FROM ${moves} WHERE old_card_id IS NOT NULL)
			UNION ALL
			SELECT m.sec_id, m.card_id, NULL, (m.j + 1) * 1000 + m.k FROM ${moves} m WHERE m.sec_id IS NOT NULL
		) x;`,
		// 3. 새 카드 삽입, 기존 카드 순서 갱신, 위젯 카드 삭제
		`INSERT INTO ${cardsT} ("_order", "_parent_id", ${cardKey}, "ratio")
		SELECT o.new_j + 1, m.sec_id, m.card_id,
			(CASE WHEN m.ratio IN (${CARD_RATIOS.map((r) => `'${r}'`).join(', ')}) THEN m.ratio ELSE '16:9' END)::"enum_card_ratio"
		FROM ${moves} m JOIN ${order} o ON o.sec_id = m.sec_id AND o.card_key = m.card_id;`,
		`UPDATE ${cardsT} c SET "_order" = o.new_j + 1 FROM ${order} o
			WHERE o.old_j IS NOT NULL AND c."_parent_id" = o.sec_id AND c.${cardKey}::text = o.card_key;`,
		`DELETE FROM ${cardsL} WHERE "_parent_id" IN (SELECT old_card_id FROM ${moves} WHERE old_card_id IS NOT NULL);`,
		`DELETE FROM ${cardsT} WHERE "id" IN (SELECT old_card_id FROM ${moves} WHERE old_card_id IS NOT NULL);`,
		// 4. 자리가 바뀐 기존 카드의 디스플레이 _path 갱신 (테이블마다 set-based 한 번)
		...DISPLAY_TABLES.map(
			(t) => `UPDATE ${T(t)} d SET "_path" = ${path('o.new_j')}
			FROM ${order} o JOIN (SELECT DISTINCT sec_id, doc_id, i FROM ${moves}) m ON m.sec_id = o.sec_id
			WHERE o.old_j IS NOT NULL AND o.old_j <> o.new_j AND d."_parent_id" = m.doc_id
				AND d."_path" = ${path('o.old_j')};`,
		),
		// 5. 새 카드의 디스플레이: 이미지 → sdp, 프리셋 → ppd (위젯의 로고를 카드마다 복사)
		`INSERT INTO ${T('sdp')} ("_order", "_parent_id", "_path", ${v ? '"_uuid"' : '"id"'}, "image_id")
		SELECT 1, m.doc_id, ${path('o.new_j')}, ${v ? 'coalesce(m.example_id::text, m.card_id)' : 'm.example_id'}, m.image_id
		FROM ${moves} m JOIN ${order} o ON o.sec_id = m.sec_id AND o.card_key = m.card_id
		WHERE m.image_id IS NOT NULL;`,
		`INSERT INTO ${T('ppd')} ("_order", "_parent_id", "_path", ${v ? '"_uuid"' : '"id"'}, "preset", "logo_id")
		SELECT 1, m.doc_id, ${path('o.new_j')}, ${v ? 'coalesce(m.example_id::text, m.card_id)' : 'm.example_id'}, m.preset::"enum_ppd_preset", m.logo_id
		FROM ${moves} m JOIN ${order} o ON o.sec_id = m.sec_id AND o.card_key = m.card_id
		WHERE m.image_id IS NULL AND m.preset IS NOT NULL;`,
		// 6. 캡션: 제목 = item_label + 순번, 설명 = 예시 캡션
		`INSERT INTO ${cardsL} ("caption_title", "caption_description", "_locale", "_parent_id")
		SELECT
			CASE WHEN nullif(trim(m.item_label), '') IS NOT NULL THEN trim(m.item_label) || ' ' || m.k END,
			CASE WHEN nullif(trim(l."caption"), '') IS NOT NULL THEN ${LEXICAL('l."caption"')} END,
			coalesce(l."_locale", 'ko'::"_locales"),
			c."id"
		FROM ${moves} m
		JOIN ${cardsT} c ON c."_parent_id" = m.sec_id AND c.${cardKey}::text = m.card_id
		LEFT JOIN ${examplesL} l ON l."_parent_id" = m.example_id
		WHERE nullif(trim(m.item_label), '') IS NOT NULL OR nullif(trim(l."caption"), '') IS NOT NULL;`,
		// 7. 블록 표식: 위젯의 예시가 전부 같은 kind일 때만
		`UPDATE ${secT} s SET "mark" = k.kind::"enum_block_mark"
		FROM (SELECT sec_id, min(kind) AS kind FROM ${moves} WHERE sec_id IS NOT NULL GROUP BY sec_id HAVING count(DISTINCT kind) = 1) k
		WHERE s."id" = k.sec_id;`,
		`DROP TABLE ${order};`,
		`DROP TABLE ${moves};`,
	]
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
	// ① 생성기 DDL(ppd 테이블, mark 컬럼). ddw DROP만 ③으로 옮겼다.
  await db.execute(sql`
   CREATE TYPE "public"."enum_ppd_preset" AS ENUM('off-palette', 'gradient', 'low-contrast', 'unpaired-combo', 'overlay-stack', 'brightness-opacity', 'tight-tracking', 'loose-tracking', 'wrong-typeface', 'mixed-size', 'distorted', 'slanted');
  CREATE TYPE "public"."enum_block_mark" AS ENUM('none', 'do', 'ok', 'dont');
  CREATE TABLE "ppd" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"preset" "enum_ppd_preset",
  	"logo_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "_ppd_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"preset" "enum_ppd_preset",
  	"logo_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "sec" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "bse" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "ovw" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "exm" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "_sec_v" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "_bse_v" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "_ovw_v" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "_exm_v" ADD COLUMN "mark" "enum_block_mark" DEFAULT 'none';
  ALTER TABLE "ppd" ADD CONSTRAINT "ppd_logo_id_brand_logos_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."brand_logos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ppd" ADD CONSTRAINT "ppd_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ppd_v" ADD CONSTRAINT "_ppd_v_logo_id_brand_logos_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."brand_logos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ppd_v" ADD CONSTRAINT "_ppd_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ppd_order_idx" ON "ppd" USING btree ("_order");
  CREATE INDEX "ppd_parent_id_idx" ON "ppd" USING btree ("_parent_id");
  CREATE INDEX "ppd_path_idx" ON "ppd" USING btree ("_path");
  CREATE INDEX "ppd_logo_idx" ON "ppd" USING btree ("logo_id");
  CREATE INDEX "_ppd_v_order_idx" ON "_ppd_v" USING btree ("_order");
  CREATE INDEX "_ppd_v_parent_id_idx" ON "_ppd_v" USING btree ("_parent_id");
  CREATE INDEX "_ppd_v_path_idx" ON "_ppd_v" USING btree ("_path");
  CREATE INDEX "_ppd_v_logo_idx" ON "_ppd_v" USING btree ("logo_id");
`)

	// ② 예시 → 카드. 본 테이블과 버전 테이블 각각.
	for (const suffix of ['', '_v'] as const) {
		for (const statement of doDontMoves(suffix)) await db.execute(sql.raw(statement))
	}

	// ③ 이제 비어도 되는 Do/Don't 테이블과 enum을 지운다.
	await db.execute(sql`
  DROP TABLE "ddw_examples" CASCADE;
  DROP TABLE "ddw_examples_locales" CASCADE;
  DROP TABLE "ddw" CASCADE;
  DROP TABLE "_ddw_v_examples" CASCADE;
  DROP TABLE "_ddw_v_examples_locales" CASCADE;
  DROP TABLE "_ddw_v" CASCADE;
  DROP TYPE "public"."enum_ddw_examples_kind";
  DROP TYPE "public"."enum_ddw_examples_preset";
  DROP TYPE "public"."enum_ddw_image_ratio";
  DROP TYPE "public"."enum_ddw_example_columns";`)
}

/** 되돌리면 빈 ddw 테이블·enum만 되살아난다 — 카드가 된 예시는 카드로 남고 mark는 지워진다. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ddw_examples_kind" AS ENUM('do', 'ok', 'dont');
  CREATE TYPE "public"."enum_ddw_examples_preset" AS ENUM('off-palette', 'gradient', 'low-contrast', 'unpaired-combo', 'overlay-stack', 'brightness-opacity', 'tight-tracking', 'loose-tracking', 'wrong-typeface', 'mixed-size', 'distorted', 'slanted');
  CREATE TYPE "public"."enum_ddw_image_ratio" AS ENUM('original', '1:1', '5:4', '4:3', '3:2', '16:9', '2:1', '7:3', '4:5', '3:4', '2:3', '9:16');
  CREATE TYPE "public"."enum_ddw_example_columns" AS ENUM('2', '3', '4');
  CREATE TABLE "ddw_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"kind" "enum_ddw_examples_kind" DEFAULT 'dont',
  	"preset" "enum_ddw_examples_preset"
  );
  
  CREATE TABLE "ddw_examples_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "ddw" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_ratio" "enum_ddw_image_ratio" DEFAULT '16:9',
  	"columns" "enum_ddw_example_columns" DEFAULT '3',
  	"item_label" varchar DEFAULT 'INCORRECT USAGE',
  	"logo_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "_ddw_v_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"kind" "enum_ddw_examples_kind" DEFAULT 'dont',
  	"preset" "enum_ddw_examples_preset",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_ddw_v_examples_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_ddw_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_ratio" "enum_ddw_image_ratio" DEFAULT '16:9',
  	"columns" "enum_ddw_example_columns" DEFAULT '3',
  	"item_label" varchar DEFAULT 'INCORRECT USAGE',
  	"logo_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  DROP TABLE "ppd" CASCADE;
  DROP TABLE "_ppd_v" CASCADE;
  ALTER TABLE "ddw_examples" ADD CONSTRAINT "ddw_examples_image_id_application_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ddw_examples" ADD CONSTRAINT "ddw_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ddw"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ddw_examples_locales" ADD CONSTRAINT "ddw_examples_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ddw_examples"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ddw" ADD CONSTRAINT "ddw_logo_id_brand_logos_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."brand_logos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ddw" ADD CONSTRAINT "ddw_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ddw_v_examples" ADD CONSTRAINT "_ddw_v_examples_image_id_application_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."application_images"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ddw_v_examples" ADD CONSTRAINT "_ddw_v_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ddw_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ddw_v_examples_locales" ADD CONSTRAINT "_ddw_v_examples_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ddw_v_examples"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ddw_v" ADD CONSTRAINT "_ddw_v_logo_id_brand_logos_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."brand_logos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ddw_v" ADD CONSTRAINT "_ddw_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ddw_examples_order_idx" ON "ddw_examples" USING btree ("_order");
  CREATE INDEX "ddw_examples_parent_id_idx" ON "ddw_examples" USING btree ("_parent_id");
  CREATE INDEX "ddw_examples_image_idx" ON "ddw_examples" USING btree ("image_id");
  CREATE UNIQUE INDEX "ddw_examples_locales_locale_parent_id_unique" ON "ddw_examples_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "ddw_order_idx" ON "ddw" USING btree ("_order");
  CREATE INDEX "ddw_parent_id_idx" ON "ddw" USING btree ("_parent_id");
  CREATE INDEX "ddw_path_idx" ON "ddw" USING btree ("_path");
  CREATE INDEX "ddw_logo_idx" ON "ddw" USING btree ("logo_id");
  CREATE INDEX "_ddw_v_examples_order_idx" ON "_ddw_v_examples" USING btree ("_order");
  CREATE INDEX "_ddw_v_examples_parent_id_idx" ON "_ddw_v_examples" USING btree ("_parent_id");
  CREATE INDEX "_ddw_v_examples_image_idx" ON "_ddw_v_examples" USING btree ("image_id");
  CREATE UNIQUE INDEX "_ddw_v_examples_locales_locale_parent_id_unique" ON "_ddw_v_examples_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_ddw_v_order_idx" ON "_ddw_v" USING btree ("_order");
  CREATE INDEX "_ddw_v_parent_id_idx" ON "_ddw_v" USING btree ("_parent_id");
  CREATE INDEX "_ddw_v_path_idx" ON "_ddw_v" USING btree ("_path");
  CREATE INDEX "_ddw_v_logo_idx" ON "_ddw_v" USING btree ("logo_id");
  ALTER TABLE "sec" DROP COLUMN "mark";
  ALTER TABLE "bse" DROP COLUMN "mark";
  ALTER TABLE "ovw" DROP COLUMN "mark";
  ALTER TABLE "exm" DROP COLUMN "mark";
  ALTER TABLE "_sec_v" DROP COLUMN "mark";
  ALTER TABLE "_bse_v" DROP COLUMN "mark";
  ALTER TABLE "_ovw_v" DROP COLUMN "mark";
  ALTER TABLE "_exm_v" DROP COLUMN "mark";
  DROP TYPE "public"."enum_ppd_preset";
  DROP TYPE "public"."enum_block_mark";`)
}
