ALTER TABLE "XpEvent" ADD COLUMN "key" TEXT;
CREATE UNIQUE INDEX "XpEvent_key_key" ON "XpEvent"("key");
