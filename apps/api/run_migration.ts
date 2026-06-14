import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.platform
const envPath = path.join('e:', 'WebbiOS', '.env.platform');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of envContent.split('\n')) {
    const match = line.match(/([^=\s]+)\s*=\s*(.*)/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

try {
  execSync('npx.cmd wrangler d1 execute webbios_core_db --file=../../packages/db/update_menus.sql --remote', { 
    cwd: path.join('e:', 'WebbiOS', 'apps', 'api'), 
    stdio: 'inherit' 
  });
  console.log('Successfully ran D1 migration');
} catch (e) {
  console.error('Migration failed', e);
}
