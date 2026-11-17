-- A NOT NULL column added to a table that may already hold rows needs a
-- default, or the ALTER fails. The application always writes a real
-- fingerprint; the default exists only so this migration is safe to apply.
ALTER TABLE "ledger_transaction" ADD COLUMN "fingerprint" text DEFAULT '' NOT NULL;
