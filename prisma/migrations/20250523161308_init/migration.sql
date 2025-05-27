-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quickbooksId" TEXT NOT NULL,
    "docNumber" TEXT NOT NULL,
    "txnDate" DATETIME NOT NULL,
    "currencyName" TEXT NOT NULL,
    "currencyValue" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerValue" TEXT NOT NULL,
    "customerMemo" TEXT,
    "billAddressLine1" TEXT,
    "billAddressCity" TEXT,
    "billAddressState" TEXT,
    "billAddressZip" TEXT,
    "shipAddressLine1" TEXT,
    "shipAddressCity" TEXT,
    "shipAddressState" TEXT,
    "shipAddressZip" TEXT,
    "salesTermName" TEXT,
    "salesTermValue" TEXT,
    "dueDate" DATETIME NOT NULL,
    "totalAmount" REAL NOT NULL,
    "balance" REAL NOT NULL,
    "printStatus" TEXT NOT NULL,
    "emailStatus" TEXT NOT NULL,
    "billEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "quickbooksId" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "detailType" TEXT NOT NULL,
    "itemName" TEXT,
    "unitPrice" REAL,
    "quantity" REAL,
    "itemAccountName" TEXT,
    "taxCodeRef" TEXT,
    CONSTRAINT "LineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_quickbooksId_key" ON "Invoice"("quickbooksId");
