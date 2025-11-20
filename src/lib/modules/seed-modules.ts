import { moduleSeeder } from '../src/lib/modules/module-seeder';
import { ModuleCategory } from '@prisma/client';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'essential';

  console.log('🚀 Build.now Module Seeder\n');

  try {
    switch (command) {
      case 'essential':
        await moduleSeeder.seedEssentialModules();
        break;

      case 'category':
        const category = args[1] as ModuleCategory;
        const count = parseInt(args[2] || '10', 10);
        
        if (!category) {
          console.error('❌ Please provide a category');
          process.exit(1);
        }

        await moduleSeeder.seedByCategory(category, count);
        break;

      default:
        console.log('Usage:');
        console.log('  npm run seed:modules essential           # Seed essential modules');
        console.log('  npm run seed:modules category AUTH 10    # Seed 10 AUTH modules');
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();