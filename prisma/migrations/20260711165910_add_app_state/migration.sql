-- CreateTable
CREATE TABLE "app_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "last_complete_scrape_at" TIMESTAMP(3),

    CONSTRAINT "app_state_pkey" PRIMARY KEY ("id")
);
