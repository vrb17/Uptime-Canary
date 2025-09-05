-- CreateTable
CREATE TABLE "StatusPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StatusPageItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statusPageId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusPageItem_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StatusPageItem_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_slug_key" ON "StatusPage"("slug");

-- CreateIndex
CREATE INDEX "StatusPage_userId_idx" ON "StatusPage"("userId");

-- CreateIndex
CREATE INDEX "StatusPage_slug_idx" ON "StatusPage"("slug");

-- CreateIndex
CREATE INDEX "StatusPageItem_statusPageId_idx" ON "StatusPageItem"("statusPageId");

-- CreateIndex
CREATE INDEX "StatusPageItem_checkId_idx" ON "StatusPageItem"("checkId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPageItem_statusPageId_checkId_key" ON "StatusPageItem"("statusPageId", "checkId");
