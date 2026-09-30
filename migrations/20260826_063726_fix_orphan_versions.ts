import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * 부모 없는 가이드라인 버전 행을 걷어낸다.
 *
 * 🔴 원인: `20260826_053723_chapter_collection`이 챕터 문서를 **원시 SQL로** 지웠다.
 *    `guideline_docs`를 가리키는 FK 30개는 전부 `ON DELETE CASCADE`인데
 *    `_guideline_docs_v.parent_id` 하나만 **`SET NULL`**이다(Payload가 문서 삭제 뒤에도 이력을
 *    남기려고 그렇게 둔다). 그래서 버전 행이 부모 없이 살아남았고, 어드민 목록이 그것을
 *    "ID가 null인 문서"로 그렸다 — 실제로 관측된 증상이다(고아 9행, 그 중 latest 4행).
 *
 * 🔴 교훈: 문서를 원시 SQL로 지우면 `_v` 행을 같이 지워야 한다. `payload.delete()`는
 *    애플리케이션 코드가 그 정리를 해 주지만 SQL은 하지 않는다.
 *
 * 부모가 없는 버전 행은 Payload 모델에서 의미가 없다 — 어느 문서의 이력도 아니다.
 * 하위 테이블(`_guideline_docs_v_locales`·`_blk_v`·`_sec_v` …)은 `_guideline_docs_v.id`를
 * CASCADE로 물고 있어 함께 정리된다.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
  DELETE FROM "_guideline_docs_v" WHERE "parent_id" IS NULL;`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
	// 되돌릴 수 없다 — 부모를 잃은 이력을 복원할 근거가 남아 있지 않다.
	// 되돌려야 하면 Supabase 시점 복구를 쓴다.
}
