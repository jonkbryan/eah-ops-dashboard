-- CreateTable
CREATE TABLE "QuickBooksImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadedById" TEXT NOT NULL,
    "purchasesJson" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuickBooksImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
