

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" integer NOT NULL,
    "name" character varying(50) NOT NULL,
    "icon" character varying(10),
    "description" "text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'レビューグループのカテゴリマスタ';



COMMENT ON COLUMN "public"."categories"."id" IS 'カテゴリID';



COMMENT ON COLUMN "public"."categories"."name" IS 'カテゴリ名';



COMMENT ON COLUMN "public"."categories"."icon" IS 'アイコン';



COMMENT ON COLUMN "public"."categories"."description" IS 'カテゴリ説明';



COMMENT ON COLUMN "public"."categories"."order_index" IS '表示順序';



COMMENT ON COLUMN "public"."categories"."created_at" IS '作成日時';



CREATE SEQUENCE IF NOT EXISTS "public"."categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."categories_id_seq" OWNED BY "public"."categories"."id";



CREATE TABLE IF NOT EXISTS "public"."evaluation_criteria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_group_id" "uuid" NOT NULL,
    "name" character varying(50) NOT NULL,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone
);


ALTER TABLE "public"."evaluation_criteria" OWNER TO "postgres";


COMMENT ON TABLE "public"."evaluation_criteria" IS '評価基準';



COMMENT ON COLUMN "public"."evaluation_criteria"."id" IS '評価基準ID';



COMMENT ON COLUMN "public"."evaluation_criteria"."review_group_id" IS 'グループID';



COMMENT ON COLUMN "public"."evaluation_criteria"."name" IS '評価項目名 (おいしさ, 雰囲気, コスパ, etc)';



COMMENT ON COLUMN "public"."evaluation_criteria"."order_index" IS '表示順序';



COMMENT ON COLUMN "public"."evaluation_criteria"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."evaluation_criteria"."deleted_at" IS '削除日時（論理削除）';



CREATE TABLE IF NOT EXISTS "public"."evaluation_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "criteria_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."evaluation_scores" OWNER TO "postgres";


COMMENT ON TABLE "public"."evaluation_scores" IS '各評価項目に対するスコア';



COMMENT ON COLUMN "public"."evaluation_scores"."id" IS '評価スコアID';



COMMENT ON COLUMN "public"."evaluation_scores"."review_id" IS 'レビューID';



COMMENT ON COLUMN "public"."evaluation_scores"."criteria_id" IS '評価項目ID';



COMMENT ON COLUMN "public"."evaluation_scores"."score" IS 'スコア';



COMMENT ON COLUMN "public"."evaluation_scores"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."evaluation_scores"."updated_at" IS '更新日時';



CREATE TABLE IF NOT EXISTS "public"."review_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying,
    "joined_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone
);


ALTER TABLE "public"."review_group_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."review_group_members" IS 'レビューグループメンバー';



COMMENT ON COLUMN "public"."review_group_members"."id" IS 'メンバーシップID';



COMMENT ON COLUMN "public"."review_group_members"."review_group_id" IS 'グループID';



COMMENT ON COLUMN "public"."review_group_members"."user_id" IS 'ユーザーID';



COMMENT ON COLUMN "public"."review_group_members"."role" IS 'ロール';



COMMENT ON COLUMN "public"."review_group_members"."joined_at" IS '参加日時';



COMMENT ON COLUMN "public"."review_group_members"."deleted_at" IS '退会日時（論理削除）';



CREATE TABLE IF NOT EXISTS "public"."review_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "category_id" integer NOT NULL,
    "is_private" boolean DEFAULT true,
    "metadata_fields" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone
);


ALTER TABLE "public"."review_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."review_groups" IS 'レビューグループ';



COMMENT ON COLUMN "public"."review_groups"."id" IS 'グループID';



COMMENT ON COLUMN "public"."review_groups"."name" IS 'グループ名';



COMMENT ON COLUMN "public"."review_groups"."description" IS 'グループ説明';



COMMENT ON COLUMN "public"."review_groups"."category_id" IS 'カテゴリID';



COMMENT ON COLUMN "public"."review_groups"."is_private" IS 'プライベートグループか';



COMMENT ON COLUMN "public"."review_groups"."metadata_fields" IS 'メタデータのフィールド';



COMMENT ON COLUMN "public"."review_groups"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."review_groups"."updated_at" IS '更新日時';



COMMENT ON COLUMN "public"."review_groups"."deleted_at" IS '削除日時（論理削除）';



CREATE TABLE IF NOT EXISTS "public"."review_subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_group_id" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "images" "text"[],
    "metadata" "jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone
);


ALTER TABLE "public"."review_subjects" OWNER TO "postgres";


COMMENT ON TABLE "public"."review_subjects" IS 'レビューの対象となるアイテム（映画、レストラン、カフェなど）';



COMMENT ON COLUMN "public"."review_subjects"."id" IS 'レビュー対象ID';



COMMENT ON COLUMN "public"."review_subjects"."review_group_id" IS 'グループID';



COMMENT ON COLUMN "public"."review_subjects"."name" IS 'レビュー対象名';



COMMENT ON COLUMN "public"."review_subjects"."images" IS '画像URL配列';



COMMENT ON COLUMN "public"."review_subjects"."metadata" IS '住所、ジャンル、その他メタデータ';



COMMENT ON COLUMN "public"."review_subjects"."created_by" IS '作成者';



COMMENT ON COLUMN "public"."review_subjects"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."review_subjects"."deleted_at" IS '削除日時（論理削除）';



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_subject_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text",
    "total_score" numeric(3,2),
    "images" "text"[],
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."reviews" IS 'ユーザーのレビュー情報';



COMMENT ON COLUMN "public"."reviews"."id" IS 'レビューID';



COMMENT ON COLUMN "public"."reviews"."review_subject_id" IS 'レビュー対象ID';



COMMENT ON COLUMN "public"."reviews"."user_id" IS 'レビュー投稿者';



COMMENT ON COLUMN "public"."reviews"."comment" IS 'レビューコメント';



COMMENT ON COLUMN "public"."reviews"."total_score" IS '総合評価点（平均値）';



COMMENT ON COLUMN "public"."reviews"."images" IS '画像URL配列';



COMMENT ON COLUMN "public"."reviews"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."reviews"."updated_at" IS '更新日時';



COMMENT ON COLUMN "public"."reviews"."deleted_at" IS '削除日時（論理削除）';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "display_id" character varying(10) NOT NULL,
    "email" character varying(255) NOT NULL,
    "username" character varying(50) NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'ユーザー';



COMMENT ON COLUMN "public"."users"."id" IS 'ユーザーID';



COMMENT ON COLUMN "public"."users"."display_id" IS '表示用ID（ランダム数字）';



COMMENT ON COLUMN "public"."users"."email" IS 'メールアドレス';



COMMENT ON COLUMN "public"."users"."username" IS 'ユーザー名';



COMMENT ON COLUMN "public"."users"."avatar_url" IS 'アバター画像URL';



COMMENT ON COLUMN "public"."users"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."users"."updated_at" IS '更新日時';



ALTER TABLE ONLY "public"."categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_criteria"
    ADD CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_group_members"
    ADD CONSTRAINT "review_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_groups"
    ADD CONSTRAINT "review_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_subjects"
    ADD CONSTRAINT "review_subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_display_id_key" UNIQUE ("display_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "evaluation_scores_review_id_criteria_id_idx" ON "public"."evaluation_scores" USING "btree" ("review_id", "criteria_id");



CREATE UNIQUE INDEX "review_group_members_review_group_id_user_id_idx" ON "public"."review_group_members" USING "btree" ("review_group_id", "user_id");



CREATE UNIQUE INDEX "reviews_review_subject_id_user_id_idx" ON "public"."reviews" USING "btree" ("review_subject_id", "user_id");



ALTER TABLE ONLY "public"."evaluation_criteria"
    ADD CONSTRAINT "evaluation_criteria_review_group_id_fkey" FOREIGN KEY ("review_group_id") REFERENCES "public"."review_groups"("id");



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "public"."evaluation_criteria"("id");



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id");



ALTER TABLE ONLY "public"."review_group_members"
    ADD CONSTRAINT "review_group_members_review_group_id_fkey" FOREIGN KEY ("review_group_id") REFERENCES "public"."review_groups"("id");



ALTER TABLE ONLY "public"."review_group_members"
    ADD CONSTRAINT "review_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."review_groups"
    ADD CONSTRAINT "review_groups_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."review_subjects"
    ADD CONSTRAINT "review_subjects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."review_subjects"
    ADD CONSTRAINT "review_subjects_review_group_id_fkey" FOREIGN KEY ("review_group_id") REFERENCES "public"."review_groups"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_review_subject_id_fkey" FOREIGN KEY ("review_subject_id") REFERENCES "public"."review_subjects"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_criteria" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_criteria" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_criteria" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_scores" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_scores" TO "service_role";



GRANT ALL ON TABLE "public"."review_group_members" TO "anon";
GRANT ALL ON TABLE "public"."review_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."review_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."review_groups" TO "anon";
GRANT ALL ON TABLE "public"."review_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."review_groups" TO "service_role";



GRANT ALL ON TABLE "public"."review_subjects" TO "anon";
GRANT ALL ON TABLE "public"."review_subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."review_subjects" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
