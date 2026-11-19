#!/usr/bin/env node
/**
 * يُولّد كل أيقونات التطبيق (أندرويد + iOS) وشاشات البداية من الشعار الأصلي.
 * يتطلب ImageMagick (`convert`) — متاح افتراضياً في GitHub Actions.
 *
 * الاستخدام: npm run icons
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const src = join(root, 'public', 'plus-logo.jpeg');
const icons = join(root, 'public', 'icons');

if (!existsSync(src)) {
  console.error('✖ لم يتم العثور على الشعار: public/plus-logo.jpeg');
  process.exit(1);
}
mkdirSync(icons, { recursive: true });

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

console.log('› توليد الأيقونات العامة...');
run(`convert "${src}" -resize 1024x1024 -background black -gravity center -extent 1024x1024 "${join(icons, 'icon-1024.png')}"`);
for (const size of [512, 384, 288, 192, 144, 96, 72, 48]) {
  run(`convert "${join(icons, 'icon-1024.png')}" -resize ${size}x${size} "${join(icons, `icon-${size}.png`)}"`);
}
run(`convert -size 432x432 xc:'#050507' "${join(icons, 'icon-background-432.png')}"`);
run(`convert "${src}" -resize 2732x2732 -background '#050507' -gravity center -extent 2732x2732 "${join(icons, 'splash-2732.png')}"`);

const androidRes = join(root, 'android', 'app', 'src', 'main', 'res');
if (existsSync(androidRes)) {
  console.log('› توليد أيقونات أندرويد...');
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    const dir = join(androidRes, `mipmap-${density}`);
    mkdirSync(dir, { recursive: true });
    run(`convert "${join(icons, 'icon-1024.png')}" -resize ${size}x${size} "${join(dir, 'ic_launcher.png')}"`);
    run(`convert "${join(icons, 'icon-1024.png')}" -resize ${size}x${size} "${join(dir, 'ic_launcher_round.png')}"`);
    const adaptive = Math.round((size * 108) / 48);
    const fg = Math.round(adaptive * 0.62);
    run(
      `convert "${join(icons, 'icon-1024.png')}" -resize ${fg}x${fg} -background none -gravity center -extent ${adaptive}x${adaptive} "${join(dir, 'ic_launcher_foreground.png')}"`
    );
    run(`convert -size ${adaptive}x${adaptive} xc:'#050507' "${join(dir, 'ic_launcher_background.png')}"`);
  }

  console.log('› توليد شاشات البداية...');
  const splashes = {
    'drawable-port-mdpi': [320, 480],
    'drawable-port-hdpi': [480, 800],
    'drawable-port-xhdpi': [720, 1280],
    'drawable-port-xxhdpi': [960, 1600],
    'drawable-port-xxxhdpi': [1280, 1920],
    'drawable-land-mdpi': [480, 320],
    'drawable-land-hdpi': [800, 480],
    'drawable-land-xhdpi': [1280, 720],
    'drawable-land-xxhdpi': [1600, 960],
    'drawable-land-xxxhdpi': [1920, 1280],
  };
  for (const [dirName, [w, h]] of Object.entries(splashes)) {
    const dir = join(androidRes, dirName);
    mkdirSync(dir, { recursive: true });
    const logo = Math.round(Math.min(w, h) * 0.42);
    run(
      `convert "${join(icons, 'icon-1024.png')}" -resize ${logo}x${logo} -background '#050507' -gravity center -extent ${w}x${h} "${join(dir, 'splash.png')}"`
    );
  }
}

const iosAssets = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
if (existsSync(iosAssets)) {
  console.log('› توليد أيقونات iOS...');
  run(`convert "${join(icons, 'icon-1024.png')}" -resize 1024x1024 "${join(iosAssets, 'AppIcon-512@2x.png')}"`);
}

console.log('✔ تم توليد جميع الأيقونات بنجاح');
void dirname;
