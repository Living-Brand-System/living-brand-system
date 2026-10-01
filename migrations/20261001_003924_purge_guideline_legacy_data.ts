import { type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** 레거시 전용 DB 자료만 파기한다. 업로드 레코드와 스토리지 파일은 보존한다. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
	 LOCK TABLE "guideline_docs", "_guideline_docs_v" IN SHARE ROW EXCLUSIVE MODE;
	 DO $$ BEGIN
	  IF EXISTS (SELECT 1 FROM "guideline_docs" WHERE "content_model" IS DISTINCT FROM 'sections')
	   OR EXISTS (SELECT 1 FROM "_guideline_docs_v" WHERE "latest" = true AND "version_content_model" IS DISTINCT FROM 'sections')
	   OR EXISTS (SELECT 1 FROM "_guideline_docs_v" WHERE "version_content_model" IS NULL) THEN
	   RAISE EXCEPTION 'Legacy or unidentified current/draft guideline content remains. Purge aborted.';
	  END IF;
	 END $$;

	 DELETE FROM "guideline_docs_rels" WHERE "path" = 'blocks' OR "path" LIKE 'blocks.%';
	 DELETE FROM "_guideline_docs_v_rels" WHERE "path" = 'version.blocks' OR "path" LIKE 'version.blocks.%';
	 DELETE FROM "_guideline_docs_v" WHERE "version_content_model" = 'legacy';

	 -- CASCADE는 쓰지 않는다. 목록 밖에서 참조하면 삭제 대신 실패한다.
	 DROP TABLE "public"."sdp",
	  "public"."cih",
	  "public"."cso",
	  "public"."lbp",
	  "public"."ldp",
	  "public"."twt",
	  "public"."tsp",
	  "public"."lgo",
	  "public"."cil_hidden_controls",
	  "public"."cil",
	  "public"."cvw",
	  "public"."lgw",
	  "public"."lgw_locales",
	  "public"."ppd",
	  "public"."hcp",
	  "public"."icw",
	  "public"."scs",
	  "public"."lob",
	  "public"."thr",
	  "public"."tlg",
	  "public"."tsw",
	  "public"."lcv",
	  "public"."sec_cards",
	  "public"."sec_cards_locales",
	  "public"."sec",
	  "public"."sec_locales",
	  "public"."bse_cards",
	  "public"."bse_cards_locales",
	  "public"."bse",
	  "public"."bse_locales",
	  "public"."ovw_cards",
	  "public"."ovw_cards_locales",
	  "public"."ovw",
	  "public"."ovw_locales",
	  "public"."exm_cards",
	  "public"."exm_cards_locales",
	  "public"."exm",
	  "public"."exm_locales",
	  "public"."_sdp_v",
	  "public"."_cih_v",
	  "public"."_cso_v",
	  "public"."_lbp_v",
	  "public"."_ldp_v",
	  "public"."_twt_v",
	  "public"."_tsp_v",
	  "public"."_lgo_v",
	  "public"."_cil_v_hidden_controls",
	  "public"."_cil_v",
	  "public"."_cvw_v",
	  "public"."_lgw_v",
	  "public"."_lgw_v_locales",
	  "public"."_ppd_v",
	  "public"."_hcp_v",
	  "public"."_icw_v",
	  "public"."_scs_v",
	  "public"."_lob_v",
	  "public"."_thr_v",
	  "public"."_tlg_v",
	  "public"."_tsw_v",
	  "public"."_lcv_v",
	  "public"."_sec_v_cards",
	  "public"."_sec_v_cards_locales",
	  "public"."_sec_v",
	  "public"."_sec_v_locales",
	  "public"."_bse_v_cards",
	  "public"."_bse_v_cards_locales",
	  "public"."_bse_v",
	  "public"."_bse_v_locales",
	  "public"."_ovw_v_cards",
	  "public"."_ovw_v_cards_locales",
	  "public"."_ovw_v",
	  "public"."_ovw_v_locales",
	  "public"."_exm_v_cards",
	  "public"."_exm_v_cards_locales",
	  "public"."_exm_v",
	  "public"."_exm_v_locales";
	 ALTER TABLE "guideline_docs_rels" DROP COLUMN "brand_color_groups_id";
	 ALTER TABLE "_guideline_docs_v_rels" DROP COLUMN "brand_color_groups_id";
	 DROP TYPE "public"."enum_cih_source",
	  "public"."enum_twt_layout",
	  "public"."enum_twt_language",
	  "public"."enum_twt_weight",
	  "public"."enum_cil_hidden_controls",
	  "public"."enum_cil_subsidiary",
	  "public"."enum_cil_branch",
	  "public"."enum_cil_form",
	  "public"."enum_cil_language",
	  "public"."enum_cil_color_type",
	  "public"."enum_cil_mono",
	  "public"."enum_cil_clear_space",
	  "public"."enum_lgw_sample",
	  "public"."enum_lgw_guides",
	  "public"."enum_ppd_preset",
	  "public"."enum_hcp_layout",
	  "public"."enum_lob_column",
	  "public"."enum_thr_language",
	  "public"."enum_tlg_language",
	  "public"."enum_tlg_layout",
	  "public"."enum_tsw_weight",
	  "public"."enum_card_ratio",
	  "public"."enum_card_mark",
	  "public"."enum_card_caption_placement",
	  "public"."enum_block_layout",
	  "public"."enum_sec_columns",
	  "public"."enum_block_row_height",
	  "public"."enum_bse_columns",
	  "public"."enum_ovw_columns",
	  "public"."enum_exm_columns",
	  "public"."enum__cih_v_source",
	  "public"."enum__cil_v_hidden_controls",
	  "public"."enum__cil_v_subsidiary",
	  "public"."enum__cil_v_branch",
	  "public"."enum__cil_v_form",
	  "public"."enum__cil_v_language",
	  "public"."enum__cil_v_color_type",
	  "public"."enum__cil_v_mono",
	  "public"."enum__cil_v_clear_space",
	  "public"."enum__sec_v_columns",
	  "public"."enum__bse_v_columns",
	  "public"."enum__ovw_v_columns",
	  "public"."enum__exm_v_columns";
	`)
}

export async function down(): Promise<void> {
	throw new Error(
		'Purged guideline content cannot be reconstructed. Restore a database backup to roll back.',
	)
}
