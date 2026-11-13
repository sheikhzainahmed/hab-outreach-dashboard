const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const isPostgres = process.env.VERCEL ||
  (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))) ||
  (process.env.POSTGRES_PRISMA_URL && (process.env.POSTGRES_PRISMA_URL.startsWith('postgres://') || process.env.POSTGRES_PRISMA_URL.startsWith('postgresql://')));

if (isPostgres) {
  schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  if (process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED) {
    if (!schema.includes('directUrl')) {
      const directVar = process.env.POSTGRES_URL_NON_POOLING ? 'POSTGRES_URL_NON_POOLING' : 'DATABASE_URL_UNPOOLED';
      schema = schema.replace(
        'url      = env("DATABASE_URL")',
        `url      = env("DATABASE_URL")\n  directUrl = env("${directVar}")`
      );
    }
  }
  fs.writeFileSync(schemaPath, schema);
  console.log('Switched Prisma provider to "postgresql" with directUrl for Neon/Vercel.');

  try {
    console.log('Pushing Prisma schema to Neon PostgreSQL...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: process.env });
    console.log('Seeding initial data (team & 83 influencers)...');
    execSync('node prisma/seed.js', { stdio: 'inherit', env: process.env });
  } catch (err) {
    console.error('Error during db push or seed:', err);
  }
} else {
  console.log('Using current Prisma provider.');
}
