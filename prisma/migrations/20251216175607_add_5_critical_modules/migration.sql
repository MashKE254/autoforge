-- AlterEnum: Add 5 new critical module categories for 85%+ coverage
ALTER TYPE "ModuleCategory" ADD VALUE 'BOT';
ALTER TYPE "ModuleCategory" ADD VALUE 'SCRAPING';
ALTER TYPE "ModuleCategory" ADD VALUE 'ECOMMERCE';
ALTER TYPE "ModuleCategory" ADD VALUE 'MESSAGING';
ALTER TYPE "ModuleCategory" ADD VALUE 'CMS';
