ALTER TYPE "public"."card_supertype" ADD VALUE 'Other';--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "legality_standard" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "legality_expanded" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "source_hash" text;--> statement-breakpoint
CREATE INDEX "cards_legality_standard_idx" ON "cards" USING btree ("legality_standard");--> statement-breakpoint
-- Backfill promoted legality columns from the existing legalities JSONB.
UPDATE "cards" SET
  "legality_standard" = "legalities"->>'standard',
  "legality_expanded" = "legalities"->>'expanded'
WHERE "legalities" IS NOT NULL;