-- AlterTable
-- cap_id and team_members exist in schema.prisma but were not in earlier migration SQL.
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "cap_id" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "team_members" TEXT[] NOT NULL DEFAULT '{}';

-- Unique constraint for cap_id (nullable; multiple NULLs allowed in PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_cap_id_key" ON "tasks"("cap_id");
