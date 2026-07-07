const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const watchMode = process.argv.includes('--watch');

function getEntryPoints(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = fs.readdirSync(dir, { recursive: true });
  return files
    .filter(file => {
      const fullPath = path.join(dir, file);
      return fs.statSync(fullPath).isFile() && file.endsWith('.js');
    })
    .map(file => path.join(dir, file));
}

async function run() {
  const codesDir = path.join(__dirname, 'codes');
  const entryPoints = getEntryPoints(codesDir);

  if (entryPoints.length === 0) {
    console.warn('Warning: No JavaScript files found in codes/ directory.');
  } else {
    console.log(`Found ${entryPoints.length} file(s) to compile:`);
    entryPoints.forEach(fp => console.log(`  - ${path.relative(__dirname, fp)}`));
  }

  const buildOptions = {
    entryPoints,
    outdir: path.join(__dirname, 'dist'),
    outbase: codesDir,
    bundle: true,
    minify: true,
    sourcemap: true,
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'info',
  };

  if (watchMode) {
    console.log('Starting watch mode...');
    try {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('Watching for changes in codes/ directory...');
    } catch (err) {
      console.error('Watch initialization failed:', err);
      process.exit(1);
    }
  } else {
    console.log('Starting production build...');
    try {
      await esbuild.build(buildOptions);
      console.log('Production build completed successfully.');
    } catch (err) {
      console.error('Build failed:', err);
      process.exit(1);
    }
  }
}

run();
