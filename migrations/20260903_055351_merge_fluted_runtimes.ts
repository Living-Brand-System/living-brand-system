import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Fluted 런타임 넷(가로·세로·스윕·방사)을 「모양」 축을 가진 `fluted-glass` 하나로 합친다.
 *
 * 🔴 순서가 중요하다. enum을 먼저 좁히면 옛 값을 가진 행에서 캐스팅이 터진다 —
 *    데이터를 먼저 옮기고 마지막에 enum을 좁힌다.
 * 🔴 `runtime`은 unique다 — 네 행을 같은 값으로 바꿀 수 없으므로 셋을 먼저 지운다.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
	// 남길 프로파일: 스윕 > 방사 > 가로 > 세로. 스윕이 합친 런타임의 기본 모양이라 그 프로파일에
	// manager가 넣어 둔 controllerRestrictions·presentation을 이어받는 것이 어긋남이 가장 적다.
	const survivor = sql`(
		SELECT "id" FROM "graphic_profiles"
		WHERE "runtime"::text LIKE '%fluted-glass'
		ORDER BY CASE "runtime"::text
			WHEN 'sweep-fluted-glass' THEN 0
			WHEN 'radial-fluted-glass' THEN 1
			WHEN 'linear-fluted-glass' THEN 2
			ELSE 3
		END
		LIMIT 1
	)`

	// 🔴 `_graphic_profiles_v.parent_id`는 SET NULL이라 프로파일을 지워도 버전 행이 고아로 남는다.
	//    남겨 두면 옛 enum 값을 든 행이 되어 아래 캐스팅이 터지므로 먼저 지운다.
	await db.execute(sql`
		DELETE FROM "_graphic_profiles_v"
		WHERE "parent_id" IN (
			SELECT "id" FROM "graphic_profiles"
			WHERE "runtime"::text LIKE '%fluted-glass' AND "id" <> ${survivor}
		);
	`)
	await db.execute(sql`
		DELETE FROM "graphic_profiles"
		WHERE "runtime"::text LIKE '%fluted-glass' AND "id" <> ${survivor};
	`)

	// 값을 옮기려면 enum 제약을 먼저 풀어야 한다.
	await db.execute(sql`
		ALTER TABLE "graphic_profiles" ALTER COLUMN "runtime" SET DATA TYPE text;
		ALTER TABLE "_graphic_profiles_v" ALTER COLUMN "version_runtime" SET DATA TYPE text;
	`)

	// 부모를 잃은 옛 버전 행까지 함께 옮긴다 — 하나라도 남으면 캐스팅이 터진다.
	await db.execute(sql`
		UPDATE "graphic_profiles" SET "runtime" = 'fluted-glass'
		WHERE "runtime" LIKE '%fluted-glass';
		UPDATE "_graphic_profiles_v" SET "version_runtime" = 'fluted-glass'
		WHERE "version_runtime" LIKE '%fluted-glass';
	`)

	// 넷을 합쳤으므로 「Fluted Sweep」 같은 옛 이름은 화면에서 거짓이 된다.
	await db.execute(sql`
		UPDATE "graphic_profiles" SET "name" = 'Fluted Glass' WHERE "runtime" = 'fluted-glass';
		UPDATE "_graphic_profiles_v" SET "version_name" = 'Fluted Glass'
		WHERE "version_runtime" = 'fluted-glass';
	`)

	await db.execute(sql`
		DROP TYPE "public"."enum_graphic_profiles_runtime";
		CREATE TYPE "public"."enum_graphic_profiles_runtime" AS ENUM('fluted-glass', 'forward-straight', 'key-visual-pattern');
		ALTER TABLE "graphic_profiles" ALTER COLUMN "runtime" SET DATA TYPE "public"."enum_graphic_profiles_runtime" USING "runtime"::"public"."enum_graphic_profiles_runtime";
		DROP TYPE "public"."enum__graphic_profiles_v_version_runtime";
		CREATE TYPE "public"."enum__graphic_profiles_v_version_runtime" AS ENUM('fluted-glass', 'forward-straight', 'key-visual-pattern');
		ALTER TABLE "_graphic_profiles_v" ALTER COLUMN "version_runtime" SET DATA TYPE "public"."enum__graphic_profiles_v_version_runtime" USING "version_runtime"::"public"."enum__graphic_profiles_v_version_runtime";
	`)

	/**
	 * 템플릿은 런타임 id를 **문자열로** 들고 있다(`background_policy.graphicConfigIds`의 허용 목록,
	 * `overrides`의 노드별 선택). FK가 아니라 위 삭제가 닿지 않으므로 여기서 함께 옮긴다 —
	 * 안 옮기면 그 템플릿의 그래픽 배경 목록이 조용히 빈다.
	 */
	for (const column of [
		{ table: 'templates', name: 'background_policy' },
		{ table: 'templates', name: 'overrides' },
		{ table: '_templates_v', name: 'version_background_policy' },
		{ table: '_templates_v', name: 'version_overrides' },
	]) {
		await db.execute(sql`
			UPDATE ${sql.raw(`"${column.table}"`)}
			SET ${sql.raw(`"${column.name}"`)} = REPLACE(REPLACE(REPLACE(REPLACE(
				${sql.raw(`"${column.name}"`)}::text,
				'"linear-fluted-glass"', '"fluted-glass"'),
				'"vertical-fluted-glass"', '"fluted-glass"'),
				'"sweep-fluted-glass"', '"fluted-glass"'),
				'"radial-fluted-glass"', '"fluted-glass"')::jsonb
			WHERE ${sql.raw(`"${column.name}"`)}::text LIKE '%-fluted-glass"%';
		`)
	}

	// 넷이 하나가 되면서 허용 목록에 같은 값이 여러 번 남을 수 있다 — 접는다.
	for (const column of [
		{ table: 'templates', name: 'background_policy' },
		{ table: '_templates_v', name: 'version_background_policy' },
	]) {
		await db.execute(sql`
			UPDATE ${sql.raw(`"${column.table}"`)}
			SET ${sql.raw(`"${column.name}"`)} = jsonb_set(
				${sql.raw(`"${column.name}"`)},
				'{graphicConfigIds}',
				(
					SELECT COALESCE(jsonb_agg(DISTINCT value ORDER BY value), '[]'::jsonb)
					FROM jsonb_array_elements_text(
						${sql.raw(`"${column.name}"`)} -> 'graphicConfigIds'
					) AS value
				)
			)
			WHERE ${sql.raw(`"${column.name}"`)} ? 'graphicConfigIds'
				AND jsonb_typeof(${sql.raw(`"${column.name}"`)} -> 'graphicConfigIds') = 'array';
		`)
	}
}

/**
 * enum만 되돌린다.
 *
 * 🔴 지운 프로파일 셋과 그 버전 이력은 되살릴 수 없다 — 어느 행이 어느 모양이었는지가 남지 않는다.
 *    되돌려야 하면 환경 단위 복구(PITR)를 쓴다.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
		ALTER TABLE "graphic_profiles" ALTER COLUMN "runtime" SET DATA TYPE text;
		DROP TYPE "public"."enum_graphic_profiles_runtime";
		CREATE TYPE "public"."enum_graphic_profiles_runtime" AS ENUM('forward-straight', 'key-visual-pattern', 'linear-fluted-glass', 'radial-fluted-glass', 'sweep-fluted-glass', 'vertical-fluted-glass');
		UPDATE "graphic_profiles" SET "runtime" = 'sweep-fluted-glass' WHERE "runtime" = 'fluted-glass';
		ALTER TABLE "graphic_profiles" ALTER COLUMN "runtime" SET DATA TYPE "public"."enum_graphic_profiles_runtime" USING "runtime"::"public"."enum_graphic_profiles_runtime";
		ALTER TABLE "_graphic_profiles_v" ALTER COLUMN "version_runtime" SET DATA TYPE text;
		DROP TYPE "public"."enum__graphic_profiles_v_version_runtime";
		CREATE TYPE "public"."enum__graphic_profiles_v_version_runtime" AS ENUM('forward-straight', 'key-visual-pattern', 'linear-fluted-glass', 'radial-fluted-glass', 'sweep-fluted-glass', 'vertical-fluted-glass');
		UPDATE "_graphic_profiles_v" SET "version_runtime" = 'sweep-fluted-glass' WHERE "version_runtime" = 'fluted-glass';
		ALTER TABLE "_graphic_profiles_v" ALTER COLUMN "version_runtime" SET DATA TYPE "public"."enum__graphic_profiles_v_version_runtime" USING "version_runtime"::"public"."enum__graphic_profiles_v_version_runtime";
	`)
}
