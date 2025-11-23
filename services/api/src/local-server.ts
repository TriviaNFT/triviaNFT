/**
 * DEPRECATED: This file is no longer used.
 * Use dev-server-with-db.ts instead (pnpm dev)
 * 
 * This file still uses S3 for NFT counting which has been replaced
 * with IPFS hashes stored in the database.
 */

import http from 'http';
import crypto from 'crypto';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const PORT = 3001;

// Simple in-memory storage for dev
const players = new Map<string, any>();

// S3 Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'trivianft-assets-ad';

// S3 client will use AWS CLI credentials automatically
// followRegionRedirects handles 301 redirects if region is incorrect
const s3Client = new S3Client({ 
  region: AWS_REGION,
  followRegionRedirects: true,
});

// Cache for NFT counts (5 minute TTL)
let nftCountsCache: { data: Map<string, number> | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to read request body
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Get NFT counts from S3 bucket
async function getCategoryNFTCounts(): Promise<Map<string, number>> {
  // Check cache first
  const now = Date.now();
  if (nftCountsCache.data && (now - nftCountsCache.timestamp) < CACHE_TTL) {
    console.log('[S3] Using cached NFT counts');
    return nftCountsCache.data;
  }

  console.log('[S3] Fetching NFT counts from S3...');
  const counts = new Map<string, number>();

  try {
    const command = new ListObjectsV2Command({
      Bucket: AWS_S3_BUCKET,
      Prefix: 'nft-images/',
    });

    const response = await s3Client.send(command);
    
    if (response.Contents) {
      // Parse S3 keys to count NFTs per category
      // Actual format: nft-images/nft-art/{category}/{filename}.svg
      for (const obj of response.Contents) {
        if (!obj.Key) continue;
        
        const parts = obj.Key.split('/');
        // Check for pattern: nft-images/nft-art/{category}/{filename}
        if (parts.length >= 4 && parts[0] === 'nft-images' && parts[1] === 'nft-art') {
          const category = parts[2];
          const currentCount = counts.get(category) || 0;
          counts.set(category, currentCount + 1);
        }
      }
      
      console.log('[S3] NFT counts by category:', Object.fromEntries(counts));
    }

    // Update cache
    nftCountsCache = {
      data: counts,
      timestamp: now,
    };

    return counts;
  } catch (error) {
    console.error('[S3] Error fetching NFT counts:', error);
    // Return empty map on error - categories will show 0 NFTs
    return new Map();
  }
}

// Generate a simple JWT (for dev only - not secure!)
function generateDevToken(stakeKey: string): string {
  const payload = { stakeKey, iat: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  console.log(`[${method}] ${path}`);

  // Health check endpoint
  if ((path === '/health' || path === '/api/health') && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'TriviaNFT API is running (local dev mode)'
    }));
    return;
  }

  // Auth: Connect Wallet
  if (path === '/api/auth/connect' && method === 'POST') {
    try {
      const body = await readBody(req);
      const { stakeKey } = JSON.parse(body);

      if (!stakeKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'stakeKey is required' }));
        return;
      }

      console.log(`[AUTH] Wallet connecting: ${stakeKey.substring(0, 20)}...`);

      // Check if player exists
      let player = players.get(stakeKey);
      const isNewUser = !player;

      if (!player) {
        // Create new player
        player = {
          id: crypto.randomUUID(),
          stakeKey,
          username: null,
          email: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        players.set(stakeKey, player);
        console.log(`[AUTH] New player created: ${player.id}`);
      } else {
        console.log(`[AUTH] Existing player: ${player.id}`);
      }

      const token = generateDevToken(stakeKey);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        token,
        expiresIn: 86400, // 24 hours
        player,
        isNewUser,
      }));
    } catch (error) {
      console.error('[AUTH] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Auth: Get Me
  if (path === '/api/auth/me' && method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      const player = players.get(payload.stakeKey);

      if (!player) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ player }));
    } catch (error) {
      console.error('[AUTH] Error:', error);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid token' }));
    }
    return;
  }

  // Sessions: Get session limits
  if (path === '/api/sessions/limits' && method === 'GET') {
    console.log('[SESSIONS] Fetching session limits');
    
    // Mock session limits - resetAt is tomorrow at midnight
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const limits = {
      dailyLimit: 10,
      sessionsUsed: 0,
      remainingSessions: 10,
      resetAt: tomorrow.toISOString(),
      cooldownEndsAt: null,
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(limits));
    return;
  }

  // Sessions: Start a new session
  if (path === '/api/sessions/start' && method === 'POST') {
    console.log('[SESSIONS] Starting new session');
    
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const body = await readBody(req);
      const { categoryId } = JSON.parse(body);

      if (!categoryId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'categoryId is required' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      const player = players.get(payload.stakeKey);

      if (!player) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      console.log(`[SESSIONS] Player ${player.id} starting session for category ${categoryId}`);

      // Mock session response
      const sessionId = crypto.randomUUID();
      const session = {
        id: sessionId,
        categoryId,
        status: 'active',
        currentQuestionIndex: 0,
        questions: [
          {
            questionId: crypto.randomUUID(),
            text: 'Sample question 1 for ' + categoryId,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            servedAt: new Date().toISOString(),
          },
          {
            questionId: crypto.randomUUID(),
            text: 'Sample question 2 for ' + categoryId,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            servedAt: new Date().toISOString(),
          },
          {
            questionId: crypto.randomUUID(),
            text: 'Sample question 3 for ' + categoryId,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            servedAt: new Date().toISOString(),
          },
        ],
        score: 0,
        startedAt: new Date().toISOString(),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session));
    } catch (error) {
      console.error('[SESSIONS] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Categories: Get all categories
  if (path === '/api/categories' && method === 'GET') {
    console.log('[CATEGORIES] Fetching categories');
    
    try {
      // Get real NFT counts from S3
      const nftCounts = await getCategoryNFTCounts();
      
      // Get player's owned NFT counts (if authenticated)
      let ownedCounts = new Map<string, number>();
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = JSON.parse(Buffer.from(token, 'base64').toString());
          const player = players.get(payload.stakeKey);
          
          if (player) {
            // In production, this would query the player_nfts table
            // For now, mock as 0 owned NFTs for all categories
            // TODO: Query database: SELECT category_id, COUNT(*) FROM player_nfts WHERE stake_key = ? GROUP BY category_id
            console.log(`[CATEGORIES] Player ${player.id} authenticated, returning owned counts`);
          }
        } catch (err) {
          console.log('[CATEGORIES] Invalid token, returning 0 owned counts');
        }
      }
      
      // Category definitions with metadata
      const categoryDefinitions = [
        { id: 'science', name: 'Science', description: 'Test your scientific knowledge' },
        { id: 'history', name: 'History', description: 'Journey through time' },
        { id: 'geography', name: 'Geography', description: 'Explore the world' },
        { id: 'arts', name: 'Arts & Literature', description: 'Culture and creativity' },
        { id: 'sports', name: 'Sports', description: 'Athletic achievements' },
        { id: 'entertainment', name: 'Entertainment', description: 'Movies, music, and more' },
        { id: 'technology', name: 'Technology', description: 'Digital innovation' },
        { id: 'nature', name: 'Nature', description: 'The natural world' },
        { id: 'mythology', name: 'Mythology', description: 'Ancient legends' },
      ];
      
      // Build categories with real NFT counts from S3 and owned counts from DB
      const categories = categoryDefinitions.map(cat => ({
        ...cat,
        nftCount: nftCounts.get(cat.id) || 0, // Number of designs in S3
        ownedCount: ownedCounts.get(cat.id) || 0, // Number owned by player
        isActive: true,
      }));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ categories }));
    } catch (error) {
      console.error('[CATEGORIES] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch categories' }));
    }
    return;
  }

  // Dev: List all players (for testing)
  if (path === '/api/dev/list-players' && method === 'GET') {
    const playerList = Array.from(players.values());
    console.log(`[DEV] Listing ${playerList.length} players`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      count: playerList.length,
      players: playerList,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Dev: Clear all players (for testing)
  if (path === '/api/dev/clear-players' && method === 'POST') {
    const count = players.size;
    players.clear();
    console.log(`[DEV] Cleared ${count} players from memory`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: `Cleared ${count} players`,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Auth: Create Profile
  if (path === '/api/auth/profile' && method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      const player = players.get(payload.stakeKey);

      if (!player) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const body = await readBody(req);
      const { username, email } = JSON.parse(body);

      player.username = username;
      player.email = email || null;
      player.updatedAt = new Date().toISOString();

      console.log(`[AUTH] Profile created for ${player.id}: ${username}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ player }));
    } catch (error) {
      console.error('[AUTH] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Default 404 for unimplemented routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Not Found', 
    path, 
    method,
    message: 'This endpoint is not implemented yet.'
  }));
});

server.listen(PORT, () => {
  console.log(`🚀 API server running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`☁️  S3 Bucket: ${AWS_S3_BUCKET} (${AWS_REGION})`);
  console.log(`⚠️  Note: This is a minimal dev server. Docker services (postgres/redis) should be running.`);
});
