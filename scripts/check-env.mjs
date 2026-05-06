import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const required = [
  'MONGODB_URI',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'GEMINI_API_KEY',
  'NODEMAILER_EMAIL',
  'NODEMAILER_PASSWORD'
];

let missing = [];
for (const k of required) {
  if (!process.env[k]) missing.push(k);
}

if (missing.length) {
  console.error('ERROR: Missing env vars:', missing.join(', '));
  process.exit(1);
}

console.log('OK: All required env variables are present.');
console.log('Preview: NEXT_PUBLIC_FINNHUB_API_KEY=' + (process.env.NEXT_PUBLIC_FINNHUB_API_KEY ? 'SET' : 'NOT SET'));
process.exit(0);
