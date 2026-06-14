import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
// Load .env.platform for Cloudflare credentials
const envPath = path.join(process.cwd(), '.env.platform');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of envContent.split('\n')) {
    const match = line.match(/([^=\s]+)\s*=\s*(.*)/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

console.log('Using CF Account:', process.env.CLOUDFLARE_ACCOUNT_ID ? `Loaded (${process.env.CLOUDFLARE_ACCOUNT_ID})` : 'Missing');

const runCmd = (cmd: string, cwd: string = process.cwd()): string => {
  console.log(`\n> ${cmd}`);
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'inherit' });
  } catch (error: any) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
};

const publish = async () => {
  const version = process.argv[2];
  if (!version) {
    console.error("Usage: npx tsx scripts/publish.ts <version> [release_notes]");
    process.exit(1);
  }
  
  const releaseNotes = process.argv[3] || `Release ${version}`;

  console.log(`\n📦 Building WebbiOS Core v${version}...`);
  // Build dashboard and its dependencies via turbo
  process.env.VITE_APP_VERSION = version;
  runCmd('npx.cmd turbo run build --filter=@webbios/dashboard', process.cwd());
  
  // Create temp release dir
  const releaseDir = path.join(process.cwd(), `webbios-release`);
  if (fs.existsSync(releaseDir)) fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir);
  
  // We will just zip the entire repo except node_modules and .git for simplicity in this PoC
  // using tar.exe which is available on Windows 10+
  console.log(`\n🗜️ Zipping release files...`);
  const zipFile = path.join(releaseDir, `webbios-core-${version}.zip`);
  if (fs.existsSync(zipFile)) fs.rmSync(zipFile);
  
  // Run tar excluding node_modules, .git, caches, built assets, and old zips
  const excludePaths = [
    '--exclude', 'node_modules', 
    '--exclude', '.git', 
    '--exclude', '.wrangler', 
    '--exclude', '.gemini', 
    '--exclude', 'webbios-release',
    '--exclude', '.turbo',
    '--exclude', 'dist',
    '--exclude', '*.zip'
  ];
  runCmd(`tar.exe -a -c -f "${zipFile}" ${excludePaths.join(' ')} .`);
  
  console.log(`\n☁️ Uploading to R2 Bucket (webbios-platform)...`);
  // We use wrangler to upload the file to R2
  // Make sure CLOUDFLARE_API_TOKEN is set in environment
  runCmd(`npx.cmd wrangler r2 object put webbios-platform/webbios-core/webbios-core-${version}.zip --file="${zipFile}" --remote`);

  console.log(`\n📡 Registering version on Platform Gateway...`);
  const platformApi = 'https://platform.webbios.dev';
  
  const response = await fetch(`${platformApi}/api/v1/versions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version,
      releaseNotes,
      isCritical: false,
      isLatest: true
    })
  });
  
  const data = await response.json();
  if (response.ok && data.success) {
    console.log(`✅ Successfully published version ${version}!`);
  } else {
    console.error(`❌ Failed to register version:`, data);
  }
  
  // Cleanup
  fs.rmSync(zipFile);
};

publish();
