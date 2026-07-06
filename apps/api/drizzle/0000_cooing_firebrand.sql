CREATE TYPE "public"."card_supertype" AS ENUM('Pokémon', 'Trainer', 'Energy');--> statement-breakpoint
CREATE TYPE "public"."coach_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TYPE "public"."deck_format" AS ENUM('standard', 'expanded', 'unlimited', 'glc');--> statement-breakpoint
CREATE TYPE "public"."deck_zone" AS ENUM('main', 'sideboard');--> statement-breakpoint
CREATE TYPE "public"."playstyle" AS ENUM('aggro', 'control', 'combo', 'midrange', 'mill', 'toolbox', 'stall');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "archetypes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"playstyle" "playstyle",
	"key_card_ids" text[],
	"signature_pokedex_numbers" integer[],
	"typical_types" text[],
	"notes" text,
	"is_curated" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "archetypes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "authenticators" (
	"credential_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_account_id" text NOT NULL,
	"credential_public_key" text NOT NULL,
	"counter" integer NOT NULL,
	"credential_device_type" text NOT NULL,
	"credential_backed_up" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticators_user_id_credential_id_pk" PRIMARY KEY("user_id","credential_id"),
	CONSTRAINT "authenticators_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "card_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "sync_status" DEFAULT 'running' NOT NULL,
	"cards_upserted" integer DEFAULT 0 NOT NULL,
	"sets_upserted" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"name" text NOT NULL,
	"supertype" "card_supertype" NOT NULL,
	"subtypes" text[],
	"types" text[],
	"hp" integer,
	"number" text,
	"rarity" text,
	"regulation_mark" text,
	"national_pokedex_numbers" integer[],
	"evolves_from" text,
	"evolves_to" text[],
	"abilities" jsonb,
	"attacks" jsonb,
	"weaknesses" jsonb,
	"resistances" jsonb,
	"retreat_cost" text[],
	"converted_retreat_cost" integer,
	"flavor_text" text,
	"artist" text,
	"small_image_url" text,
	"large_image_url" text,
	"legalities" jsonb,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" "coach_role" NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"deck_id" uuid,
	"title" text,
	"foundry_thread_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"condition" text,
	"notes" text,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"model" text,
	"overall_score" numeric(5, 2),
	"scores" jsonb,
	"summary" text,
	"strengths" jsonb,
	"weaknesses" jsonb,
	"recommendations" jsonb,
	"missing_cards" jsonb,
	"suggested_archetype_id" uuid,
	"foundry_run_id" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"zone" "deck_zone" DEFAULT 'main' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"format" "deck_format" DEFAULT 'standard' NOT NULL,
	"archetype_id" uuid,
	"primary_types" text[],
	"cover_card_id" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"series" text,
	"printed_total" integer,
	"total" integer,
	"ptcgo_code" text,
	"release_date" text,
	"symbol_image_url" text,
	"logo_image_url" text,
	"legalities" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_thread_id_coach_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."coach_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_threads" ADD CONSTRAINT "coach_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_threads" ADD CONSTRAINT "coach_threads_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_analyses" ADD CONSTRAINT "deck_analyses_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_analyses" ADD CONSTRAINT "deck_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_analyses" ADD CONSTRAINT "deck_analyses_suggested_archetype_id_archetypes_id_fk" FOREIGN KEY ("suggested_archetype_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_cards" ADD CONSTRAINT "deck_cards_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_cards" ADD CONSTRAINT "deck_cards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_archetype_id_archetypes_id_fk" FOREIGN KEY ("archetype_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_cover_card_id_cards_id_fk" FOREIGN KEY ("cover_card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_name_idx" ON "cards" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cards_set_idx" ON "cards" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "cards_supertype_idx" ON "cards" USING btree ("supertype");--> statement-breakpoint
CREATE INDEX "cards_types_idx" ON "cards" USING gin ("types");--> statement-breakpoint
CREATE INDEX "cards_dex_idx" ON "cards" USING gin ("national_pokedex_numbers");--> statement-breakpoint
CREATE INDEX "coach_messages_thread_idx" ON "coach_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "coach_threads_user_idx" ON "coach_threads" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_user_card_uq" ON "collection_items" USING btree ("user_id","card_id");--> statement-breakpoint
CREATE INDEX "collection_user_idx" ON "collection_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deck_analyses_deck_idx" ON "deck_analyses" USING btree ("deck_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deck_cards_deck_card_zone_uq" ON "deck_cards" USING btree ("deck_id","card_id","zone");--> statement-breakpoint
CREATE INDEX "deck_cards_deck_idx" ON "deck_cards" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "decks_user_idx" ON "decks" USING btree ("user_id");