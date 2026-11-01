import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const script = html.match(/<script\s+type="module"\s+crossorigin\s+src="([^"]+)"\s*><\/script>/);
const style = html.match(/<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)"\s*>/);
if (!script || !style) throw new Error('Could not locate Vite script or stylesheet in dist/index.html.');
const loadAsset = (path) => readFileSync(join(dist, path.replace(/^\.\//, '')), 'utf8');
const js = loadAsset(script[1]).replace(/<\/script/gi, '<\\/script');
const css = loadAsset(style[1]).replace(/<\/style/gi, '<\\/style');
if (!js.includes('data:image/jpeg;base64,')) throw new Error('Fitness imagery was not embedded into the JS bundle.');
const iconSvg = readFileSync(join(root, 'public/icon.svg')).toString('base64');
const appleIcon = readFileSync(join(root, 'public/icon-192.png')).toString('base64');
const magicUiLicense = readFileSync(join(root, 'public/licenses/Magic-UI-MIT.txt'), 'utf8');
html = html.replace(script[0], '').replace(style[0], '')
  .replace(/\s*<link rel="manifest" href="\.\/manifest\.webmanifest"\s*\/>/, '')
  .replace('href="./icon.svg"', `href="data:image/svg+xml;base64,${iconSvg}"`)
  .replace('href="./icon-192.png"', `href="data:image/png;base64,${appleIcon}"`)
  .replace('</head>', () => `<!-- Magic UI animated theme transition attribution:\n${magicUiLicense}\n-->\n<style>\n${css}\n</style>\n</head>`)
  .replace('</body>', () => `<script>\n${js}\n</script>\n</body>`);
const output = resolve(root, '../FitLife-App.html');
writeFileSync(output, html);
console.log(`Standalone FitLife app: ${output} (${Buffer.byteLength(html)} bytes)`);
