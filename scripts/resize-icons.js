const sharp = require('sharp');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const src = path.join(__dirname, '..', 'public', 'icons', 'icon-base.png');

async function run() {
  for (const s of sizes) {
    // Create regular icons
    const out = path.join(__dirname, '..', 'public', 'icon-' + s + 'x' + s + '.png');
    await sharp(src).resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(out);
    console.log('Created: icon-' + s + 'x' + s + '.png');
    
    // Create maskable icons
    const maskableOut = path.join(__dirname, '..', 'public', 'icon-' + s + 'x' + s + '-maskable.png');
    await sharp(src).resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(maskableOut);
    console.log('Created: icon-' + s + 'x' + s + '-maskable.png');
  }
  // Also copy to icons/ folder
  const iconsSizes = [192, 512];
  for (const s of iconsSizes) {
    const out = path.join(__dirname, '..', 'public', 'icons', 'icon-' + s + 'x' + s + '.png');
    await sharp(src).resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(out);
    console.log('Created: icons/icon-' + s + 'x' + s + '.png');
    
    const maskableOut = path.join(__dirname, '..', 'public', 'icons', 'icon-' + s + 'x' + s + '-maskable.png');
    await sharp(src).resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(maskableOut);
    console.log('Created: icons/icon-' + s + 'x' + s + '-maskable.png');
  }
  console.log('Done!');
}

run().catch(console.error);
