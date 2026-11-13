const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// If DATABASE_URL or POSTGRES_PRISMA_URL is postgres or if deploying to Vercel, switch provider to postgresql
const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (process.env.VERCEL || (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')))) {
  schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
  console.log('Switched Prisma provider to "postgresql" for Vercel/Production deployment.');
} else {
  console.log('Using current Prisma provider.');
}
