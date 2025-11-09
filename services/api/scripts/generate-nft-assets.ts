#!/usr/bin/env node

/**
 * NFT Asset Generation Script
 * 
 * This script generates placeholder NFT artwork and metadata JSON files.
 * In production, these would be replaced with actual artwork.
 * 
 * Requirements: 13, 50
 * 
 * Usage:
 *   pnpm tsx scripts/generate-nft-assets.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const CATEGORIES = [
  'science', 'history', 'geography', 'sports', 'arts',
  'entertainment', 'technology', 'literature', 'general'
];

const OUTPUT_DIR = join(process.cwd(), 'seed-data', 'nft-assets');

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  mediaType: string;
  files: Array<{
    name: string;
    mediaType: string;
    src: string;
  }>;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

function generateSVGArt(category: string, index: number): string {
  const colors: Record<string, string> = {
    science: '#4C7DFF',
    history: '#8B4513',
    geography: '#228B22',
    sports: '#FF6B35',
    arts: '#9B59B6',
    entertainment: '#E74C3C',
    technology: '#00CED1',
    literature: '#DAA520',
    general: '#7F8C8D',
  };

  const color = colors[category] || '#4C7DFF';
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color}88;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="500" height="500" fill="url(#grad${index})"/>
  
  <!-- Border -->
  <rect x="10" y="10" width="480" height="480" fill="none" stroke="white" stroke-width="4" rx="20"/>
  
  <!-- Category Badge -->
  <circle cx="250" cy="200" r="80" fill="white" opacity="0.2"/>
  <text x="250" y="210" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
        fill="white" text-anchor="middle">${categoryName.charAt(0)}</text>
  
  <!-- NFT Number -->
  <text x="250" y="300" font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
        fill="white" text-anchor="middle">${categoryName}</text>
  <text x="250" y="340" font-family="Arial, sans-serif" font-size="24" 
        fill="white" text-anchor="middle" opacity="0.8">NFT #${index + 1}</text>
  
  <!-- TriviaNFT Branding -->
  <text x="250" y="450" font-family="Arial, sans-serif" font-size="18" 
        fill="white" text-anchor="middle" opacity="0.6">TriviaNFT</text>
</svg>`;
}

function generateMetadata(
  category: string,
  index: number,
  name: string,
  description: string,
  attributes: Array<{ trait_type: string; value: string }>
): NFTMetadata {
  const imageFileName = `${category}-${index + 1}.svg`;
  const ipfsPlaceholder = `ipfs://QmPlaceholder${category}${index + 1}`;

  return {
    name,
    description,
    image: ipfsPlaceholder,
    mediaType: 'image/svg+xml',
    files: [
      {
        name: imageFileName,
        mediaType: 'image/svg+xml',
        src: ipfsPlaceholder,
      },
    ],
    attributes,
  };
}

const NFT_DATA: Record<string, Array<{ name: string; description: string; attributes: Array<{ trait_type: string; value: string }> }>> = {
  science: [
    { name: 'Quantum Explorer', description: 'Master of quantum mechanics', attributes: [{ trait_type: 'Background', value: 'Laboratory' }, { trait_type: 'Rarity', value: 'Common' }, { trait_type: 'Element', value: 'Hydrogen' }] },
    { name: 'DNA Helix', description: 'Genetics expert', attributes: [{ trait_type: 'Background', value: 'Space' }, { trait_type: 'Rarity', value: 'Uncommon' }, { trait_type: 'Element', value: 'Helium' }] },
    { name: 'Periodic Master', description: 'Chemistry champion', attributes: [{ trait_type: 'Background', value: 'Lab' }, { trait_type: 'Rarity', value: 'Rare' }, { trait_type: 'Element', value: 'Carbon' }] },
    { name: 'Gravity Wave', description: 'Physics prodigy', attributes: [{ trait_type: 'Background', value: 'Observatory' }, { trait_type: 'Rarity', value: 'Common' }, { trait_type: 'Element', value: 'Oxygen' }] },
    { name: 'Atomic Fusion', description: 'Nuclear knowledge', attributes: [{ trait_type: 'Background', value: 'Research' }, { trait_type: 'Rarity', value: 'Uncommon' }, { trait_type: 'Element', value: 'Nitrogen' }] },
    { name: 'Cosmic Ray', description: 'Astronomy ace', attributes: [{ trait_type: 'Background', value: 'Experiment' }, { trait_type: 'Rarity', value: 'Rare' }, { trait_type: 'Element', value: 'Gold' }] },
    { name: 'Neural Network', description: 'Neuroscience ninja', attributes: [{ trait_type: 'Background', value: 'Discovery' }, { trait_type: 'Rarity', value: 'Epic' }, { trait_type: 'Element', value: 'Silver' }] },
    { name: 'Photon Beam', description: 'Light specialist', attributes: [{ trait_type: 'Background', value: 'Innovation' }, { trait_type: 'Rarity', value: 'Common' }, { trait_type: 'Element', value: 'Iron' }] },
    { name: 'Electron Cloud', description: 'Particle physicist', attributes: [{ trait_type: 'Background', value: 'Theory' }, { trait_type: 'Rarity', value: 'Uncommon' }, { trait_type: 'Element', value: 'Copper' }] },
    { name: 'Molecular Bond', description: 'Molecular master', attributes: [{ trait_type: 'Background', value: 'Quantum' }, { trait_type: 'Rarity', value: 'Legendary' }, { trait_type: 'Element', value: 'Platinum' }] },
  ],
  // Add similar data for other categories (abbreviated for brevity)
  history: Array(10).fill(null).map((_, i) => ({
    name: `History NFT #${i + 1}`,
    description: `Historical knowledge NFT #${i + 1}`,
    attributes: [
      { trait_type: 'Era', value: ['Ancient', 'Medieval', 'Renaissance', 'Industrial', 'Modern', 'Contemporary', 'Colonial', 'Victorian', 'Enlightenment', 'Revolution'][i] },
      { trait_type: 'Rarity', value: ['Common', 'Uncommon', 'Rare', 'Common', 'Uncommon', 'Rare', 'Epic', 'Common', 'Uncommon', 'Legendary'][i] },
      { trait_type: 'Civilization', value: ['Egyptian', 'Roman', 'Greek', 'Chinese', 'Mayan', 'Persian', 'Aztec', 'Inca', 'Viking', 'Mongol'][i] },
    ],
  })),
  geography: Array(10).fill(null).map((_, i) => ({
    name: `Geography NFT #${i + 1}`,
    description: `Geographic knowledge NFT #${i + 1}`,
    attributes: [
      { trait_type: 'Terrain', value: ['Mountain', 'Ocean', 'Desert', 'Forest', 'Arctic', 'Island', 'River', 'Canyon', 'Volcano', 'Tundra'][i] },
      { trait_type: 'Rarity', value: ['Common', 'Uncommon', 'Rare', 'Common', 'Uncommon', 'Rare', 'Epic', 'Common', 'Uncommon', 'Legendary'][i] },
      { trait_type: 'Climate', value: ['Alpine', 'Tropical', 'Arid', 'Temperate', 'Polar', 'Maritime', 'Continental', 'Mediterranean', 'Volcanic', 'Subarctic'][i] },
    ],
  })),
  sports: Array(10).fill(null).map((_, i) => ({
    name: `Sports NFT #${i + 1}`,
    description: `Sports knowledge NFT #${i + 1}`,
    attributes: [
      { trait_type: 'Sport', value: ['Football', 'Basketball', 'Baseball', 'Soccer', 'Tennis', 'Golf', 'Swimming', 'Track', 'Boxing', 'Olympics'][i] },
      { trait_type: 'Rarity', value: ['Common', 'Uncommon', 'Rare', 'Common', 'Uncommon', 'Rare', 'Epic', 'Common', 'Uncommon', 'Legendary'][i] },
      { trait_type: 'Achievement', value: ['Championship', 'MVP', 'Record', 'Goal', 'Grand Slam', 'Hole in One', 'Gold Medal', 'World Record', 'Knockout', 'Triple Gold'][i] },
    ],
  })),
  arts: Array(10).fill(null).map((_, i) => ({
    name: `Arts NFT #${i + 1}`,
    description: `Arts knowledge NFT #${i + 1}`,
    attributes: [
      { trait_type: 'Style', value: ['Impressionism', 'Cubism', 'Surrealism', 'Abstract', 'Realism', 'Expressionism', 'Pop Art', 'Minimalism', 'Renaissance', 'Baroque'][i] },
      { trait_type: 'Rarity', value: ['Common', 'Uncommon', 'Rare', 'Common', 'Uncommon', 'Rare', 'Epic', 'Common', 'Uncommon', 'Legendary'][i] },
      { trait_type: 'Medium', value: ['Oil', 'Acrylic', 'Watercolor', 'Digital', 'Sculpture', 'Mixed Media', 'Photography', 'Charcoal', 'Fresco', 'Marble'][i] },
    ],
  })),
  entertainment: Array(10).fill(null).map((_, i) => ({
    name: `Entertainment NFT #${i + 1}`,
    description: `Entertainment knowledge NFT #${i + 1}`,
    attributes: [
      { trait_type: 'Genre', value: ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance', 'Thriller', 'Fantasy', 'Musical', 'Classic'][i] },
      { trait_type: 'Rarity', value: ['Common', 'Uncommon', 'Rare', 'Common', 'Uncommon', 'Rare', 'Epic', 'Common', 'Uncommon', 'Legendary'][i] },
      { trait_type: 'Era', value: ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s', 'Golden Age', 'Silent Era'][i] },
    ],
  })),
  technology: Array(10).fill(null).map((_, i) => ({
    name: `Technology NFT #${i + 1}`,
    description: `Technology knowledge NFT #${i + 1}`,
    attributes: [
      { trait_type: 'Field', value: ['AI', 'Blockchain', 'Cloud', 'Mobile', 'Web', 'IoT', 'Quantum', 'Robotics', 'Cybersecurity', 'VR/AR'][i] },
      { trait_type: 'Rarity', value: ['Common', 'Uncommon', 'Rare', 'Common', 'Uncommon', 'Rare', 'Epic', 'Common', 'Uncommon', 'Legendary'][i] },
      { trait_type: 'Innovation', value: ['Machine Learning', 'Smart Contracts', 'Serverless', 'Apps', 'Web3', 'Smart Devices', 'Computing', 'Automation', 'Encryption', 'Metaverse'][i] },
    ],
  })),
  literature: Array(10).fill(null).map((_, i) => ({
    name: `Literature NFT #${i + 1}`,
    description: `Literature knowledge NFT #${i + 1}`,
    attributes: [
      { trait_type: 'Genre', value: ['Fiction', 'Non-Fiction', 'Poetry', 'Mystery', 'Fantasy', 'Sci-Fi', 'Biography', 'Drama', 'Thriller', 'Classic'][i] },
      { trait_type: 'Rarity', value: ['Common', 'Uncommon', 'Rare', 'Common', 'Uncommon', 'Rare', 'Epic', 'Common', 'Uncommon', 'Legendary'][i] },
      { trait_type: 'Period', value: ['Contemporary', 'Modern', 'Romantic', 'Victorian', 'Medieval', 'Futuristic', 'Historical', 'Classical', 'Noir', 'Ancient'][i] },
    ],
  })),
  general: Array(10).fill(null).map((_, i) => ({
    name: `General NFT #${i + 1}`,
    description: `General knowledge NFT #${i + 1}`,
    attributes: [
      { trait_type: 'Type', value: ['Knowledge', 'Wisdom', 'Facts', 'Trivia', 'Quiz', 'Brain', 'Smart', 'Info', 'Learn', 'Genius'][i] },
      { trait_type: 'Rarity', value: ['Common', 'Uncommon', 'Rare', 'Common', 'Uncommon', 'Rare', 'Epic', 'Common', 'Uncommon', 'Legendary'][i] },
      { trait_type: 'Level', value: ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master', 'Genius', 'Prodigy', 'Scholar', 'Professor', 'Omniscient'][i] },
    ],
  })),
};

async function generateAssets() {
  console.log('🎨 Generating NFT assets...\n');

  let totalGenerated = 0;

  for (const category of CATEGORIES) {
    console.log(`📝 Generating ${category} assets...`);

    // Create directories
    const artDir = join(OUTPUT_DIR, 'nft-art', category);
    const metaDir = join(OUTPUT_DIR, 'nft-metadata', category);

    if (!existsSync(artDir)) {
      mkdirSync(artDir, { recursive: true });
    }
    if (!existsSync(metaDir)) {
      mkdirSync(metaDir, { recursive: true });
    }

    const nftData = NFT_DATA[category] || [];

    // Generate 10 NFTs per category
    for (let i = 0; i < 10; i++) {
      const data = nftData[i] || {
        name: `${category} NFT #${i + 1}`,
        description: `A ${category} trivia NFT`,
        attributes: [
          { trait_type: 'Category', value: category },
          { trait_type: 'Rarity', value: 'Common' },
        ],
      };

      // Generate SVG artwork
      const svg = generateSVGArt(category, i);
      const artPath = join(artDir, `${category}-${i + 1}.svg`);
      writeFileSync(artPath, svg);

      // Generate metadata JSON
      const metadata = generateMetadata(
        category,
        i,
        data.name,
        data.description,
        data.attributes
      );
      const metaPath = join(metaDir, `${category}-${i + 1}.json`);
      writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

      totalGenerated++;
    }

    console.log(`   ✓ Generated 10 NFTs\n`);
  }

  console.log(`✅ Asset generation complete!`);
  console.log(`   Total NFTs generated: ${totalGenerated}`);
  console.log(`   Output directory: ${OUTPUT_DIR}\n`);
  console.log(`📦 Next steps:`);
  console.log(`   1. Review generated assets in ${OUTPUT_DIR}`);
  console.log(`   2. Upload to S3 bucket (or use local for development)`);
  console.log(`   3. Run seed-nft-catalog.ts to populate database\n`);
}

// Run the generation script
generateAssets();
