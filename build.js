const esbuild = require('esbuild');
const { execSync } = require('child_process');

// Get target platform from command line arguments
const args = process.argv.slice(2);
const targetArg = args.find(arg => arg.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'mac';

async function build() {
  try {
    // Step 1: Build TypeScript to JavaScript
    console.log('Building TypeScript...');
    execSync('tsc', { stdio: 'inherit' });

    // Step 2: Bundle with esbuild
    console.log('Bundling with esbuild...');
    await esbuild.build({
      entryPoints: ['dist/index.js'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: 'dist/bundle.cjs',
      format: 'cjs',
      external: [
        // Only exclude native Node.js modules
        'fs',
        'path',
        'url',
        'child_process',
        'crypto',
        'http',
        'https',
        'net',
        'tls',
        'zlib',
        'stream',
        'util',
        'events',
        'os',
      ],
      define: {
        __dirname: JSON.stringify(__dirname),
      },
    });

    // Step 3: Package with pkg for the target platform
    const pkgTarget = target === 'win' ? 'node18-win-x64' : 'node18-macos-arm64';
    console.log(`Packaging with pkg for ${target === 'win' ? 'Windows x64' : 'M1 Mac'}...`);
    execSync(`pkg -t ${pkgTarget} --options max_old_space_size=4096 dist/bundle.cjs`, {
      stdio: 'inherit',
    });

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
