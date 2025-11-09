#!/usr/bin/env node

/**
 * NFT Catalog Seed Script
 * 
 * This script generates seed data for the NFT catalog table.
 * It creates 10 NFTs per category with placeholder artwork and metadata.
 * 
 * Requirements: 13, 50
 * 
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm tsx scripts/seed-nft-catalog.ts
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const CATEGORIES = [
  { name: 'Science', slug: 'science' },
  { name: 'History', slug: 'history' },
  { name: 'Geography', slug: 'geography' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Arts', slug: 'arts' },
  { name: 'Entertainment', slug: 'entertainment' },
  { name: 'Technology', slug: 'technology' },
  { name: 'Literature', slug: 'literature' },
  { name: 'General', slug: 'general' },
];

const NFT_NAMES_BY_CATEGORY: Record<string, string[]> = {
  science: [
    'Quantum Explorer', 'DNA Helix', 'Periodic Master', 'Gravity Wave',
    'Atomic Fusion', 'Cosmic Ray', 'Neural Network', 'Photon Beam',
    'Electron Cloud', 'Molecular Bond'
  ],
  history: [
    'Ancient Scroll', 'Medieval Knight', 'Renaissance Mind', 'Industrial Revolution',
    'Colonial Era', 'World War Hero', 'Ancient Civilization', 'Historical Monument',
    'Time Traveler', 'Legacy Keeper'
  ],
  geography: [
    'Mountain Peak', 'Ocean Deep', 'Desert Wanderer', 'Rainforest Guardian',
    'Arctic Explorer', 'Island Paradise', 'River Delta', 'Canyon Carver',
    'Volcano Watcher', 'Tundra Survivor'
  ],
  sports: [
    'Champion Trophy', 'Gold Medalist', 'Record Breaker', 'Team Captain',
    'MVP Award', 'Hall of Famer', 'Olympic Spirit', 'Victory Lap',
    'Perfect Game', 'Grand Slam'
  ],
  arts: [
    'Masterpiece Canvas', 'Sculpture Divine', 'Abstract Vision', 'Renaissance Art',
    'Modern Expression', 'Classical Beauty', 'Artistic Soul', 'Creative Genius',
    'Gallery Piece', 'Museum Treasure'
  ],
  entertainment: [
    'Blockbuster Star', 'Silver Screen', 'Box Office Hit', 'Award Winner',
    'Pop Culture Icon', 'Stage Performer', 'Chart Topper', 'Fan Favorite',
    'Showstopper', 'Entertainment Legend'
  ],
  technology: [
    'Digital Pioneer', 'Code Master', 'Innovation Hub', 'Tech Visionary',
    'Silicon Valley', 'Cyber Guardian', 'Algorithm Ace', 'Data Wizard',
    'Cloud Commander', 'AI Architect'
  ],
  literature: [
    'Epic Novel', 'Poetry Master', 'Literary Classic', 'Bestseller',
    'Pulitzer Prize', 'Nobel Laureate', 'Wordsmith', 'Story Weaver',
    'Book Collector', 'Library Treasure'
  ],
  general: [
    'Knowledge Seeker', 'Trivia Master', 'Quiz Champion', 'Brain Power',
    'Wisdom Keeper', 'Fact Finder', 'Info Guru', 'Smart Cookie',
    'Know-It-All', 'Genius Mind'
  ],
};

const TRAITS_BY_CATEGORY: Record<string, string[][]> = {
  science: [
    ['Background', 'Laboratory'], ['Rarity', 'Common'], ['Element', 'Hydrogen'],
    ['Background', 'Space'], ['Rarity', 'Uncommon'], ['Element', 'Helium'],
    ['Background', 'Lab'], ['Rarity', 'Rare'], ['Element', 'Carbon'],
    ['Background', 'Observatory'], ['Rarity', 'Common'], ['Element', 'Oxygen'],
    ['Background', 'Research'], ['Rarity', 'Uncommon'], ['Element', 'Nitrogen'],
    ['Background', 'Experiment'], ['Rarity', 'Rare'], ['Element', 'Gold'],
    ['Background', 'Discovery'], ['Rarity', 'Epic'], ['Element', 'Silver'],
    ['Background', 'Innovation'], ['Rarity', 'Common'], ['Element', 'Iron'],
    ['Background', 'Theory'], ['Rarity', 'Uncommon'], ['Element', 'Copper'],
    ['Background', 'Quantum'], ['Rarity', 'Legendary'], ['Element', 'Platinum'],
  ],
  history: [
    ['Era', 'Ancient'], ['Rarity', 'Common'], ['Civilization', 'Egyptian'],
    ['Era', 'Medieval'], ['Rarity', 'Uncommon'], ['Civilization', 'Roman'],
    ['Era', 'Renaissance'], ['Rarity', 'Rare'], ['Civilization', 'Greek'],
    ['Era', 'Industrial'], ['Rarity', 'Common'], ['Civilization', 'Chinese'],
    ['Era', 'Modern'], ['Rarity', 'Uncommon'], ['Civilization', 'Mayan'],
    ['Era', 'Contemporary'], ['Rarity', 'Rare'], ['Civilization', 'Persian'],
    ['Era', 'Colonial'], ['Rarity', 'Epic'], ['Civilization', 'Aztec'],
    ['Era', 'Victorian'], ['Rarity', 'Common'], ['Civilization', 'Inca'],
    ['Era', 'Enlightenment'], ['Rarity', 'Uncommon'], ['Civilization', 'Viking'],
    ['Era', 'Revolution'], ['Rarity', 'Legendary'], ['Civilization', 'Mongol'],
  ],
  geography: [
    ['Terrain', 'Mountain'], ['Rarity', 'Common'], ['Climate', 'Alpine'],
    ['Terrain', 'Ocean'], ['Rarity', 'Uncommon'], ['Climate', 'Tropical'],
    ['Terrain', 'Desert'], ['Rarity', 'Rare'], ['Climate', 'Arid'],
    ['Terrain', 'Forest'], ['Rarity', 'Common'], ['Climate', 'Temperate'],
    ['Terrain', 'Arctic'], ['Rarity', 'Uncommon'], ['Climate', 'Polar'],
    ['Terrain', 'Island'], ['Rarity', 'Rare'], ['Climate', 'Maritime'],
    ['Terrain', 'River'], ['Rarity', 'Epic'], ['Climate', 'Continental'],
    ['Terrain', 'Canyon'], ['Rarity', 'Common'], ['Climate', 'Mediterranean'],
    ['Terrain', 'Volcano'], ['Rarity', 'Uncommon'], ['Climate', 'Volcanic'],
    ['Terrain', 'Tundra'], ['Rarity', 'Legendary'], ['Climate', 'Subarctic'],
  ],
  sports: [
    ['Sport', 'Football'], ['Rarity', 'Common'], ['Achievement', 'Championship'],
    ['Sport', 'Basketball'], ['Rarity', 'Uncommon'], ['Achievement', 'MVP'],
    ['Sport', 'Baseball'], ['Rarity', 'Rare'], ['Achievement', 'Record'],
    ['Sport', 'Soccer'], ['Rarity', 'Common'], ['Achievement', 'Goal'],
    ['Sport', 'Tennis'], ['Rarity', 'Uncommon'], ['Achievement', 'Grand Slam'],
    ['Sport', 'Golf'], ['Rarity', 'Rare'], ['Achievement', 'Hole in One'],
    ['Sport', 'Swimming'], ['Rarity', 'Epic'], ['Achievement', 'Gold Medal'],
    ['Sport', 'Track'], ['Rarity', 'Common'], ['Achievement', 'World Record'],
    ['Sport', 'Boxing'], ['Rarity', 'Uncommon'], ['Achievement', 'Knockout'],
    ['Sport', 'Olympics'], ['Rarity', 'Legendary'], ['Achievement', 'Triple Gold'],
  ],
  arts: [
    ['Style', 'Impressionism'], ['Rarity', 'Common'], ['Medium', 'Oil'],
    ['Style', 'Cubism'], ['Rarity', 'Uncommon'], ['Medium', 'Acrylic'],
    ['Style', 'Surrealism'], ['Rarity', 'Rare'], ['Medium', 'Watercolor'],
    ['Style', 'Abstract'], ['Rarity', 'Common'], ['Medium', 'Digital'],
    ['Style', 'Realism'], ['Rarity', 'Uncommon'], ['Medium', 'Sculpture'],
    ['Style', 'Expressionism'], ['Rarity', 'Rare'], ['Medium', 'Mixed Media'],
    ['Style', 'Pop Art'], ['Rarity', 'Epic'], ['Medium', 'Photography'],
    ['Style', 'Minimalism'], ['Rarity', 'Common'], ['Medium', 'Charcoal'],
    ['Style', 'Renaissance'], ['Rarity', 'Uncommon'], ['Medium', 'Fresco'],
    ['Style', 'Baroque'], ['Rarity', 'Legendary'], ['Medium', 'Marble'],
  ],
  entertainment: [
    ['Genre', 'Action'], ['Rarity', 'Common'], ['Era', '2020s'],
    ['Genre', 'Comedy'], ['Rarity', 'Uncommon'], ['Era', '2010s'],
    ['Genre', 'Drama'], ['Rarity', 'Rare'], ['Era', '2000s'],
    ['Genre', 'Sci-Fi'], ['Rarity', 'Common'], ['Era', '1990s'],
    ['Genre', 'Horror'], ['Rarity', 'Uncommon'], ['Era', '1980s'],
    ['Genre', 'Romance'], ['Rarity', 'Rare'], ['Era', '1970s'],
    ['Genre', 'Thriller'], ['Rarity', 'Epic'], ['Era', '1960s'],
    ['Genre', 'Fantasy'], ['Rarity', 'Common'], ['Era', '1950s'],
    ['Genre', 'Musical'], ['Rarity', 'Uncommon'], ['Era', 'Golden Age'],
    ['Genre', 'Classic'], ['Rarity', 'Legendary'], ['Era', 'Silent Era'],
  ],
  technology: [
    ['Field', 'AI'], ['Rarity', 'Common'], ['Innovation', 'Machine Learning'],
    ['Field', 'Blockchain'], ['Rarity', 'Uncommon'], ['Innovation', 'Smart Contracts'],
    ['Field', 'Cloud'], ['Rarity', 'Rare'], ['Innovation', 'Serverless'],
    ['Field', 'Mobile'], ['Rarity', 'Common'], ['Innovation', 'Apps'],
    ['Field', 'Web'], ['Rarity', 'Uncommon'], ['Innovation', 'Web3'],
    ['Field', 'IoT'], ['Rarity', 'Rare'], ['Innovation', 'Smart Devices'],
    ['Field', 'Quantum'], ['Rarity', 'Epic'], ['Innovation', 'Computing'],
    ['Field', 'Robotics'], ['Rarity', 'Common'], ['Innovation', 'Automation'],
    ['Field', 'Cybersecurity'], ['Rarity', 'Uncommon'], ['Innovation', 'Encryption'],
    ['Field', 'VR/AR'], ['Rarity', 'Legendary'], ['Innovation', 'Metaverse'],
  ],
  literature: [
    ['Genre', 'Fiction'], ['Rarity', 'Common'], ['Period', 'Contemporary'],
    ['Genre', 'Non-Fiction'], ['Rarity', 'Uncommon'], ['Period', 'Modern'],
    ['Genre', 'Poetry'], ['Rarity', 'Rare'], ['Period', 'Romantic'],
    ['Genre', 'Mystery'], ['Rarity', 'Common'], ['Period', 'Victorian'],
    ['Genre', 'Fantasy'], ['Rarity', 'Uncommon'], ['Period', 'Medieval'],
    ['Genre', 'Sci-Fi'], ['Rarity', 'Rare'], ['Period', 'Futuristic'],
    ['Genre', 'Biography'], ['Rarity', 'Epic'], ['Period', 'Historical'],
    ['Genre', 'Drama'], ['Rarity', 'Common'], ['Period', 'Classical'],
    ['Genre', 'Thriller'], ['Rarity', 'Uncommon'], ['Period', 'Noir'],
    ['Genre', 'Classic'], ['Rarity', 'Legendary'], ['Period', 'Ancient'],
  ],
  general: [
    ['Type', 'Knowledge'], ['Rarity', 'Common'], ['Level', 'Beginner'],
    ['Type', 'Wisdom'], ['Rarity', 'Uncommon'], ['Level', 'Intermediate'],
    ['Type', 'Facts'], ['Rarity', 'Rare'], ['Level', 'Advanced'],
    ['Type', 'Trivia'], ['Rarity', 'Common'], ['Level', 'Expert'],
    ['Type', 'Quiz'], ['Rarity', 'Uncommon'], ['Level', 'Master'],
    ['Type', 'Brain'], ['Rarity', 'Rare'], ['Level', 'Genius'],
    ['Type', 'Smart'], ['Rarity', 'Epic'], ['Level', 'Prodigy'],
    ['Type', 'Info'], ['Rarity', 'Common'], ['Level', 'Scholar'],
    ['Type', 'Learn'], ['Rarity', 'Uncommon'], ['Level', 'Professor'],
    ['Type', 'Genius'], ['Rarity', 'Legendary'], ['Level', 'Omniscient'],
  ],
};

async function seedNFTCatalog() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('🚀 Starting NFT catalog seed...\n');

    // Get category IDs
    const categoriesResult = await pool.query(
      'SELECT id, slug FROM categories ORDER BY display_order'
    );
    const categories = categoriesResult.rows;

    console.log(`📦 Found ${categories.length} categories\n`);

    let totalInserted = 0;

    for (const category of categories) {
      const { id: categoryId, slug } = category;
      const nftNames = NFT_NAMES_BY_CATEGORY[slug] || [];
      const traits = TRAITS_BY_CATEGORY[slug] || [];

      console.log(`📝 Seeding ${slug} category...`);

      // Check if NFTs already exist for this category
      const existingResult = await pool.query(
        'SELECT COUNT(*) as count FROM nft_catalog WHERE category_id = $1',
        [categoryId]
      );
      const existingCount = parseInt(existingResult.rows[0].count);

      if (existingCount >= 10) {
        console.log(`   ✓ Already has ${existingCount} NFTs, skipping\n`);
        continue;
      }

      // Insert 10 NFTs per category
      for (let i = 0; i < 10; i++) {
        const nftName = nftNames[i] || `${slug.charAt(0).toUpperCase() + slug.slice(1)} NFT #${i + 1}`;
        const nftTraits = traits[i] || [['Rarity', 'Common'], ['Type', 'Standard']];

        const attributes = [
          { trait_type: nftTraits[0][0], value: nftTraits[0][1] },
          { trait_type: nftTraits[1][0], value: nftTraits[1][1] },
          { trait_type: nftTraits[2]?.[0] || 'Category', value: nftTraits[2]?.[1] || slug },
        ];

        const description = `A ${slug} trivia NFT earned by achieving a perfect score. ${nftName} represents mastery in ${slug} knowledge.`;

        await pool.query(
          `INSERT INTO nft_catalog (
            category_id, name, description, s3_art_key, s3_meta_key, 
            tier, attributes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            categoryId,
            nftName,
            description,
            `nft-art/${slug}/${slug}-${i + 1}.png`,
            `nft-metadata/${slug}/${slug}-${i + 1}.json`,
            'category',
            JSON.stringify(attributes)
          ]
        );

        totalInserted++;
      }

      console.log(`   ✓ Inserted 10 NFTs\n`);
    }

    console.log(`✅ NFT catalog seed complete!`);
    console.log(`   Total NFTs inserted: ${totalInserted}`);
    console.log(`   Total NFTs in catalog: ${totalInserted + categories.reduce((sum, cat) => {
      return sum;
    }, 0)}\n`);

  } catch (error) {
    console.error('❌ Error seeding NFT catalog:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seed script
seedNFTCatalog();
