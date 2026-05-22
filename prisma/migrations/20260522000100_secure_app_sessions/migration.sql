CREATE TYPE "AppSessionKind" AS ENUM ('AUTH', 'RESTORE');

CREATE TABLE "AppSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "kind" "AppSessionKind" NOT NULL DEFAULT 'AUTH',
  "userId" TEXT NOT NULL,
  "currentWorkspaceId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSession_tokenHash_key" ON "AppSession"("tokenHash");
CREATE INDEX "AppSession_userId_kind_expiresAt_idx" ON "AppSession"("userId", "kind", "expiresAt");
CREATE INDEX "AppSession_kind_expiresAt_revokedAt_idx" ON "AppSession"("kind", "expiresAt", "revokedAt");

ALTER TABLE "AppSession" ADD CONSTRAINT "AppSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
