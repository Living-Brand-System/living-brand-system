import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ai_usage_events_feature" AS ENUM('image-generation', 'asset-check', 'agent-chat');
  CREATE TABLE "ai_usage_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"created_by_id" integer NOT NULL,
  	"feature" "enum_ai_usage_events_feature" NOT NULL,
  	"model" varchar NOT NULL,
  	"input_tokens" numeric,
  	"output_tokens" numeric,
  	"total_tokens" numeric,
  	"cache_read_input_tokens" numeric,
  	"cache_write_input_tokens" numeric,
  	"reasoning_tokens" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ai_usage_events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"generated_images_id" integer,
  	"check_sessions_id" integer,
  	"agent_chat_sessions_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ai_usage_events_id" integer;
  ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ai_usage_events_rels" ADD CONSTRAINT "ai_usage_events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ai_usage_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ai_usage_events_rels" ADD CONSTRAINT "ai_usage_events_rels_generated_images_fk" FOREIGN KEY ("generated_images_id") REFERENCES "public"."generated_images"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ai_usage_events_rels" ADD CONSTRAINT "ai_usage_events_rels_check_sessions_fk" FOREIGN KEY ("check_sessions_id") REFERENCES "public"."check_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ai_usage_events_rels" ADD CONSTRAINT "ai_usage_events_rels_agent_chat_sessions_fk" FOREIGN KEY ("agent_chat_sessions_id") REFERENCES "public"."agent_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ai_usage_events_created_by_idx" ON "ai_usage_events" USING btree ("created_by_id");
  CREATE INDEX "ai_usage_events_feature_idx" ON "ai_usage_events" USING btree ("feature");
  CREATE INDEX "ai_usage_events_model_idx" ON "ai_usage_events" USING btree ("model");
  CREATE INDEX "ai_usage_events_updated_at_idx" ON "ai_usage_events" USING btree ("updated_at");
  CREATE INDEX "ai_usage_events_created_at_idx" ON "ai_usage_events" USING btree ("created_at");
  CREATE INDEX "ai_usage_events_rels_order_idx" ON "ai_usage_events_rels" USING btree ("order");
  CREATE INDEX "ai_usage_events_rels_parent_idx" ON "ai_usage_events_rels" USING btree ("parent_id");
  CREATE INDEX "ai_usage_events_rels_path_idx" ON "ai_usage_events_rels" USING btree ("path");
  CREATE INDEX "ai_usage_events_rels_generated_images_id_idx" ON "ai_usage_events_rels" USING btree ("generated_images_id");
  CREATE INDEX "ai_usage_events_rels_check_sessions_id_idx" ON "ai_usage_events_rels" USING btree ("check_sessions_id");
  CREATE INDEX "ai_usage_events_rels_agent_chat_sessions_id_idx" ON "ai_usage_events_rels" USING btree ("agent_chat_sessions_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ai_usage_events_fk" FOREIGN KEY ("ai_usage_events_id") REFERENCES "public"."ai_usage_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ai_usage_events_id_idx" ON "payload_locked_documents_rels" USING btree ("ai_usage_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ai_usage_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_usage_events_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ai_usage_events" CASCADE;
  DROP TABLE "ai_usage_events_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ai_usage_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_ai_usage_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ai_usage_events_id";
  DROP TYPE "public"."enum_ai_usage_events_feature";`)
}
