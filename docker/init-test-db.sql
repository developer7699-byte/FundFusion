-- PRD §13.4: ledger, schema and matching tests run against a real PostgreSQL.
-- The test database is created alongside the development one so a fresh
-- `docker compose up` is all a new machine needs.
CREATE DATABASE fundfusion_test OWNER fundfusion;
