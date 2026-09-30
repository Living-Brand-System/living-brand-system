import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "guideline_chapters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_order" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "guideline_chapters_locales" (
  	"title" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "guideline_docs_breadcrumbs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_guideline_docs_v_version_breadcrumbs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "guideline_docs_breadcrumbs" CASCADE;
  DROP TABLE "_guideline_docs_v_version_breadcrumbs" CASCADE;
  ALTER TABLE "guideline_docs" DROP CONSTRAINT "guideline_docs_parent_id_guideline_docs_id_fk";
  
  ALTER TABLE "_guideline_docs_v" DROP CONSTRAINT "_guideline_docs_v_version_parent_id_guideline_docs_id_fk";
  
  DROP INDEX "guideline_docs_parent_idx";
  DROP INDEX "_guideline_docs_v_version_version_parent_idx";
  ALTER TABLE "guideline_docs" ADD COLUMN "chapter_id" integer;
  ALTER TABLE "_guideline_docs_v" ADD COLUMN "version_chapter_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "guideline_chapters_id" integer;
  ALTER TABLE "guideline_chapters_locales" ADD CONSTRAINT "guideline_chapters_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_chapters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "guideline_chapters_updated_at_idx" ON "guideline_chapters" USING btree ("updated_at");
  CREATE INDEX "guideline_chapters_created_at_idx" ON "guideline_chapters" USING btree ("created_at");
  CREATE UNIQUE INDEX "guideline_chapters_slug_idx" ON "guideline_chapters_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "guideline_chapters_locales_locale_parent_id_unique" ON "guideline_chapters_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "guideline_docs" ADD CONSTRAINT "guideline_docs_chapter_id_guideline_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."guideline_chapters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v" ADD CONSTRAINT "_guideline_docs_v_version_chapter_id_guideline_chapters_id_fk" FOREIGN KEY ("version_chapter_id") REFERENCES "public"."guideline_chapters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_guideline_chapters_fk" FOREIGN KEY ("guideline_chapters_id") REFERENCES "public"."guideline_chapters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "guideline_docs_chapter_idx" ON "guideline_docs" USING btree ("chapter_id");
  CREATE INDEX "_guideline_docs_v_version_version_chapter_idx" ON "_guideline_docs_v" USING btree ("version_chapter_id");
  CREATE INDEX "payload_locked_documents_rels_guideline_chapters_id_idx" ON "payload_locked_documents_rels" USING btree ("guideline_chapters_id");

  -- 🔴 계층을 관계로 옮긴다. parent_id를 지우기 **전에** 해야 하고, 같은 트랜잭션이라
  --    스키마와 데이터가 어긋난 중간 상태가 생기지 않는다. 사람이 돌리는 스크립트로 나누면
  --    그 사이에 챕터가 사라진 화면이 뜬다.
  ALTER TABLE "guideline_chapters" ADD COLUMN "legacy_doc_id" integer;

  INSERT INTO "guideline_chapters" ("display_order", "updated_at", "created_at", "legacy_doc_id")
    SELECT "display_order", "updated_at", "created_at", "id"
    FROM "guideline_docs" WHERE "parent_id" IS NULL;

  -- 🔴 제목·slug가 비어도 세우거나 버리지 않는다. 초안은 required 검증을 건너뛰므로 실제로
  --    비어 있는 챕터 문서가 있고(2026-08-26 실측 1건, 토픽 0개), 마이그레이션이 남의 데이터를
  --    조용히 지우면 안 된다. 눈에 띄는 이름을 붙여 admin에서 지우든 채우든 하게 둔다.
  INSERT INTO "guideline_chapters_locales" ("title", "slug", "_locale", "_parent_id")
    SELECT COALESCE(l."title", '(제목 없는 챕터 ' || c."id" || ')'),
           COALESCE(l."slug", 'chapter-' || c."id"),
           l."_locale", c."id"
    FROM "guideline_docs_locales" l
    JOIN "guideline_chapters" c ON c."legacy_doc_id" = l."_parent_id";

  UPDATE "guideline_docs" d SET "chapter_id" = c."id"
    FROM "guideline_chapters" c WHERE c."legacy_doc_id" = d."parent_id";

  UPDATE "_guideline_docs_v" v SET "version_chapter_id" = c."id"
    FROM "guideline_chapters" c WHERE c."legacy_doc_id" = v."version_parent_id";

  -- 🔴 검색 색인은 Payload 훅이 지우는데 여기선 훅을 타지 않는다. 손으로 걷어내지 않으면
  --    사라진 챕터 문서를 가리키는 고아 행이 남아 검색 결과가 404로 이어진다.
  DELETE FROM "search" WHERE "id" IN (
    SELECT "parent_id" FROM "search_rels"
    WHERE "guideline_docs_id" IN (SELECT "legacy_doc_id" FROM "guideline_chapters")
  );

  DELETE FROM "guideline_docs" WHERE "id" IN (SELECT "legacy_doc_id" FROM "guideline_chapters");

  -- 🔴 조용히 틀리는 것을 막는다. 조인이 어긋나 chapter_id가 비면 parent_id를 지우는 순간
  --    토픽이 갈 곳을 잃는다. 여기서 세우면 트랜잭션째 되돌아간다.
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM "guideline_docs" WHERE "chapter_id" IS NULL) THEN
      RAISE EXCEPTION '챕터가 연결되지 않은 토픽이 있습니다 - 이관을 중단합니다.';
    END IF;
  END $$;

  ALTER TABLE "guideline_chapters" DROP COLUMN "legacy_doc_id";

  ALTER TABLE "guideline_docs" DROP COLUMN "parent_id";
  ALTER TABLE "_guideline_docs_v" DROP COLUMN "version_parent_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "guideline_docs_breadcrumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"doc_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "_guideline_docs_v_version_breadcrumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"doc_id" integer,
  	"url" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "guideline_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "guideline_chapters_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "guideline_chapters" CASCADE;
  DROP TABLE "guideline_chapters_locales" CASCADE;
  ALTER TABLE "guideline_docs" DROP CONSTRAINT "guideline_docs_chapter_id_guideline_chapters_id_fk";
  
  ALTER TABLE "_guideline_docs_v" DROP CONSTRAINT "_guideline_docs_v_version_chapter_id_guideline_chapters_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_guideline_chapters_fk";
  
  DROP INDEX "guideline_docs_chapter_idx";
  DROP INDEX "_guideline_docs_v_version_version_chapter_idx";
  DROP INDEX "payload_locked_documents_rels_guideline_chapters_id_idx";
  ALTER TABLE "guideline_docs" ADD COLUMN "parent_id" integer;
  ALTER TABLE "_guideline_docs_v" ADD COLUMN "version_parent_id" integer;
  ALTER TABLE "guideline_docs_breadcrumbs" ADD CONSTRAINT "guideline_docs_breadcrumbs_doc_id_guideline_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."guideline_docs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guideline_docs_breadcrumbs" ADD CONSTRAINT "guideline_docs_breadcrumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_version_breadcrumbs" ADD CONSTRAINT "_guideline_docs_v_version_breadcrumbs_doc_id_guideline_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."guideline_docs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v_version_breadcrumbs" ADD CONSTRAINT "_guideline_docs_v_version_breadcrumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guideline_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "guideline_docs_breadcrumbs_order_idx" ON "guideline_docs_breadcrumbs" USING btree ("_order");
  CREATE INDEX "guideline_docs_breadcrumbs_parent_id_idx" ON "guideline_docs_breadcrumbs" USING btree ("_parent_id");
  CREATE INDEX "guideline_docs_breadcrumbs_locale_idx" ON "guideline_docs_breadcrumbs" USING btree ("_locale");
  CREATE INDEX "guideline_docs_breadcrumbs_doc_idx" ON "guideline_docs_breadcrumbs" USING btree ("doc_id");
  CREATE INDEX "_guideline_docs_v_version_breadcrumbs_order_idx" ON "_guideline_docs_v_version_breadcrumbs" USING btree ("_order");
  CREATE INDEX "_guideline_docs_v_version_breadcrumbs_parent_id_idx" ON "_guideline_docs_v_version_breadcrumbs" USING btree ("_parent_id");
  CREATE INDEX "_guideline_docs_v_version_breadcrumbs_locale_idx" ON "_guideline_docs_v_version_breadcrumbs" USING btree ("_locale");
  CREATE INDEX "_guideline_docs_v_version_breadcrumbs_doc_idx" ON "_guideline_docs_v_version_breadcrumbs" USING btree ("doc_id");
  ALTER TABLE "guideline_docs" ADD CONSTRAINT "guideline_docs_parent_id_guideline_docs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guideline_docs_v" ADD CONSTRAINT "_guideline_docs_v_version_parent_id_guideline_docs_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."guideline_docs"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "guideline_docs_parent_idx" ON "guideline_docs" USING btree ("parent_id");
  CREATE INDEX "_guideline_docs_v_version_version_parent_idx" ON "_guideline_docs_v" USING btree ("version_parent_id");
  ALTER TABLE "guideline_docs" DROP COLUMN "chapter_id";
  ALTER TABLE "_guideline_docs_v" DROP COLUMN "version_chapter_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "guideline_chapters_id";`)
}
