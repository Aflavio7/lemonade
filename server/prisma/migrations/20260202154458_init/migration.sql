-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailFrom" TEXT NOT NULL,
    "emailSubject" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL DEFAULT '',
    "detectedIntent" TEXT NOT NULL,
    "intentDetails" TEXT NOT NULL DEFAULT '',
    "messageSent" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");
