/**
 * Generate PWA icon placeholders
 * In production, replace with actual branded icons
 */

const fs = require('fs');
const path = require('path');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create SVG icons as placeholders
const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1a1a2e"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size / 4}" fill="#16f2b3" text-anchor="middle" dominant-baseline="middle">TN</text>
</svg>`;
};

// Generate 192x192 icon
fs.writeFileSync(
  path.join(publicDir, 'icon-192.svg'),
  createSVGIcon(192)
);

// Generate 512x512 icon
fs.writeFileSync(
  path.join(publicDir, 'icon-512.svg'),
  createSVGIcon(512)
);

// Create a simple favicon
fs.writeFileSync(
  path.join(publicDir, 'favicon.ico'),
  createSVGIcon(32)
);

console.log('✓ PWA icons generated in public/ directory');
console.log('Note: Replace with actual branded icons for production');
