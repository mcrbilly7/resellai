-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "category" TEXT,
    "color" TEXT,
    "size" TEXT,
    "material" TEXT,
    "year" TEXT,
    "rarity" TEXT,
    "condition" TEXT,
    "conditionScore" INTEGER,
    "conditionReason" TEXT,
    "aiConfidence" INTEGER,
    "authenticityRisk" TEXT,
    "authenticityNotes" TEXT,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "purchaseDate" DATETIME,
    "purchasePrice" REAL,
    "shippingCostEstimate" REAL,
    "packagingCost" REAL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'purchased',
    "msrp" REAL,
    "currentRetail" REAL,
    "avgSoldPrice" REAL,
    "lowestActive" REAL,
    "highestSoldPrice" REAL,
    "fastPrice" REAL,
    "normalPrice" REAL,
    "maxPrice" REAL,
    "listingPrice" REAL,
    "pricingStrategy" TEXT NOT NULL DEFAULT 'normal',
    "title" TEXT,
    "description" TEXT,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "itemSpecifics" TEXT NOT NULL DEFAULT '{}',
    "marketplaces" TEXT NOT NULL DEFAULT '[]',
    "marketplaceStatus" TEXT NOT NULL DEFAULT '{}',
    "marketplaceListings" TEXT NOT NULL DEFAULT '{}',
    "salePrice" REAL,
    "platformFees" REAL,
    "soldDate" DATETIME,
    "daysListed" INTEGER,
    "profit" REAL,
    "roi" REAL,
    "profitMargin" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "itemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "feePercent" REAL NOT NULL DEFAULT 0,
    "credentialsRef" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketplaceConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuyerMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'question',
    "offerAmount" REAL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reply" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuyerMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BuyerMessage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_status_idx" ON "InventoryItem"("userId", "status");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_category_idx" ON "InventoryItem"("userId", "category");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_brand_idx" ON "InventoryItem"("userId", "brand");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_userId_sku_key" ON "InventoryItem"("userId", "sku");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceConnection_userId_name_key" ON "MarketplaceConnection"("userId", "name");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "ChatMessage"("userId");

-- CreateIndex
CREATE INDEX "BuyerMessage_userId_status_idx" ON "BuyerMessage"("userId", "status");

