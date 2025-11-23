import http from 'http';
import crypto from 'crypto';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { cardanoService } from './services/cardano-service.js';
import { getAppConfigService } from './services/appconfig-service.js';
import { buildAssetName, generateHexId, getCategoryCode } from '@trivia-nft/shared';

// Load environment variables from .env.local
const envLocalPath = join(process.cwd(), '.env.local');
console.log('🔍 Looking for .env.local at:', envLocalPath);
console.log('🔍 Current working directory:', process.cwd());
if (existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
  console.log('✅ Loaded environment from .env.local');
  console.log('🔍 BLOCKFROST_PROJECT_ID:', process.env.BLOCKFROST_PROJECT_ID?.substring(0, 15) + '...');
  console.log('🔍 CARDANO_NETWORK:', process.env.CARDANO_NETWORK);
  console.log('🔍 WALLET_SEED_PHRASE exists:', !!process.env.WALLET_SEED_PHRASE);
} else {
  console.log('⚠️  .env.local not found at:', envLocalPath);
}

const PORT = 3001;
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required');
  console.error('   Please set it in services/api/.env.local');
  process.exit(1);
}

// Database connection
const pool = new Pool({ connectionString: DATABASE_URL });

// In-memory storage for active sessions only (players are in DB)
const activeSessions = new Map<string, any>();

// Initialize Sync System (scalable wallet sync)
import { SyncService, SyncPriority } from './services/sync-service.js';
import { SyncOrchestrator } from './services/sync-orchestrator.js';

const syncService = new SyncService(pool);
const syncOrchestrator = new SyncOrchestrator(pool);

// Start sync orchestrator (runs every 5 minutes)
function startSyncOrchestrator() {
  console.log('🔄 Starting sync orchestrator...');
  
  // Run immediately on startup
  syncOrchestrator.orchestrate().catch(err => {
    console.error('[SYNC] Orchestrator error:', err);
  });
  
  // Then run every 5 minutes
  setInterval(() => {
    syncOrchestrator.orchestrate().catch(err => {
      console.error('[SYNC] Orchestrator error:', err);
    });
  }, 5 * 60 * 1000); // 5 minutes
  
  console.log('✅ Sync orchestrator started (runs every 5 minutes)');
}

// Start the orchestrator
startSyncOrchestrator();

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function generateDevToken(stakeKey: string): string {
  const payload = { stakeKey, iat: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

async function submitSignedTransaction(signedTxCBOR: string, unsignedTxCBOR: string): Promise<string> {
  const network = process.env.CARDANO_NETWORK || 'preprod';
  const blockfrostUrl = `https://cardano-${network}.blockfrost.io/api/v0`;
  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  
  console.log('[SUBMIT] Combining witness sets and submitting transaction...');
  console.log('[SUBMIT] Network:', network);
  console.log('[SUBMIT] User signed TX CBOR length:', signedTxCBOR.length);
  console.log('[SUBMIT] Original unsigned TX CBOR length:', unsignedTxCBOR.length);
  
  // Import Lucid for transaction manipulation
  const { Lucid, Blockfrost } = await import('lucid-cardano');
  
  // Initialize Lucid with backend wallet
  const lucid = await Lucid.new(
    new Blockfrost(blockfrostUrl, projectId!),
    network === 'mainnet' ? 'Mainnet' : 'Preprod'
  );
  
  const seedPhrase = process.env.WALLET_SEED_PHRASE;
  if (!seedPhrase) {
    throw new Error('WALLET_SEED_PHRASE not configured');
  }
  lucid.selectWalletFromSeed(seedPhrase);
  
  console.log('[SUBMIT] Backend wallet loaded');
  
  // SOLUTION: Use Lucid's proper multi-signature API
  // Step 1: Backend signs the unsigned transaction with partialSign()
  console.log('[SUBMIT] Backend signing with partialSign()...');
  const lucidTx = lucid.fromTx(unsignedTxCBOR);
  const backendWitness = await lucidTx.partialSign();
  
  console.log('[SUBMIT] Backend witness created');
  console.log('[SUBMIT] Backend witness length:', backendWitness.length);
  
  // Step 2: Use assemble() to combine user's signature with backend's signature
  console.log('[SUBMIT] Assembling witnesses with Lucid.assemble()...');
  const assembledTx = await lucid
    .fromTx(unsignedTxCBOR)
    .assemble([signedTxCBOR, backendWitness])
    .complete();
  
  console.log('[SUBMIT] Witnesses assembled successfully');
  
  // Step 3: Submit the fully signed transaction
  console.log('[SUBMIT] Submitting to blockchain...');
  const txHash = await assembledTx.submit();
  
  console.log('[SUBMIT] Transaction submitted successfully! TX Hash:', txHash);
  return txHash;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log('[OPTIONS] CORS preflight request received');
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  console.log(`[${method}] ${path}`, url.search ? `Query: ${url.search}` : '');
  
  // Debug: Log if this is a leaderboard request
  if (path.includes('leaderboard')) {
    console.log('[DEBUG] Leaderboard request detected! Path:', path);
  }

  // Health check
  if ((path === '/health' || path === '/api/health') && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Debug: Clear all active sessions
  if (path === '/api/debug/clear-sessions' && method === 'POST') {
    activeSessions.clear();
    console.log('[DEBUG] All active sessions cleared');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'All active sessions cleared', count: 0 }));
    return;
  }

  // Auth: Connect Wallet
  if (path === '/api/auth/connect' && method === 'POST') {
    try {
      const body = await readBody(req);
      const { stakeKey, paymentAddress } = JSON.parse(body);

      if (!stakeKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'stakeKey is required' }));
        return;
      }

      if (!paymentAddress) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'paymentAddress is required' }));
        return;
      }

      console.log(`[AUTH] Wallet connecting: ${stakeKey.substring(0, 20)}...`);
      console.log(`[AUTH] Payment address (hex): ${paymentAddress}`);

      // Convert hex address to bech32
      let bech32Address = paymentAddress;
      try {
        const CSL = await import('@emurgo/cardano-serialization-lib-nodejs');
        const addressBytes = Buffer.from(paymentAddress, 'hex');
        const address = CSL.Address.from_bytes(addressBytes);
        bech32Address = address.to_bech32();
        console.log(`[AUTH] Converted to bech32: ${bech32Address}`);
      } catch (error) {
        console.error('[AUTH] Failed to convert address to bech32:', error);
        // Continue with hex address if conversion fails
      }

      // Check if player exists in database
      const existingPlayer = await pool.query(
        'SELECT id, stake_key as "stakeKey", payment_address as "paymentAddress", username, email, created_at as "createdAt", last_seen_at as "lastSeenAt" FROM players WHERE stake_key = $1',
        [stakeKey]
      );

      let player;
      let isNewUser = false;

      if (existingPlayer.rows.length > 0) {
        player = existingPlayer.rows[0];
        // Update last seen and payment address (in case it changed)
        await pool.query(
          'UPDATE players SET last_seen_at = NOW(), payment_address = $1 WHERE id = $2',
          [bech32Address, player.id]
        );
        player.paymentAddress = bech32Address; // Update in memory
        console.log(`[AUTH] Existing player: ${player.id}`);
      } else {
        // Create new player in database with payment address
        const newPlayer = await pool.query(
          `INSERT INTO players (stake_key, payment_address, created_at, last_seen_at)
           VALUES ($1, $2, NOW(), NOW())
           RETURNING id, stake_key as "stakeKey", payment_address as "paymentAddress", username, email, created_at as "createdAt", last_seen_at as "lastSeenAt"`,
          [stakeKey, bech32Address]
        );
        player = newPlayer.rows[0];
        isNewUser = true;
        console.log(`[AUTH] New player created: ${player.id}`);
      }

      const token = generateDevToken(stakeKey);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, expiresIn: 86400, player, isNewUser }));
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
      
      // Get player from database
      const result = await pool.query(
        'SELECT id, stake_key as "stakeKey", payment_address as "paymentAddress", username, email, created_at as "createdAt", last_seen_at as "lastSeenAt" FROM players WHERE stake_key = $1',
        [payload.stakeKey]
      );

      if (result.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ player: result.rows[0] }));
    } catch (error) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid token' }));
    }
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

      const body = await readBody(req);
      const { username, email } = JSON.parse(body);

      // Update player in database
      const result = await pool.query(
        `UPDATE players 
         SET username = $1, email = $2, last_seen_at = NOW()
         WHERE stake_key = $3
         RETURNING id, stake_key as "stakeKey", username, email, created_at as "createdAt", last_seen_at as "lastSeenAt"`,
        [username, email || null, payload.stakeKey]
      );

      if (result.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const player = result.rows[0];
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

  // Categories: Get all
  if (path === '/api/categories' && method === 'GET') {
    try {
      // Check if user is authenticated to get owned counts
      const authHeader = req.headers.authorization;
      let playerStakeKey = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = JSON.parse(Buffer.from(token, 'base64').toString());
          playerStakeKey = payload.stakeKey;
        } catch (e) {
          // Invalid token, continue without owned counts
        }
      }

      // Get categories with NFT preview from catalog
      const result = await pool.query(`
        SELECT 
          c.id, 
          c.name, 
          c.slug, 
          c.description, 
          c.is_active as "isActive",
          c.icon_url as "iconUrl",
          COUNT(nc.id) FILTER (WHERE nc.is_minted = false) as "nftCount",
          (
            SELECT jsonb_build_object(
              'image', 'ipfs://' || nc2.ipfs_cid,
              'video', CASE 
                WHEN nc2.attributes->>'video_ipfs' IS NOT NULL 
                THEN 'ipfs://' || (nc2.attributes->>'video_ipfs')
                ELSE NULL 
              END,
              'description', nc2.description
            )
            FROM nft_catalog nc2
            WHERE nc2.category_id = c.id 
              AND nc2.ipfs_cid IS NOT NULL
            LIMIT 1
          ) as "nftPreview"
        FROM categories c
        LEFT JOIN nft_catalog nc ON c.id = nc.category_id AND nc.tier = 'category'
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.slug, c.description, c.is_active, c.icon_url, c.display_order
        ORDER BY c.display_order, c.name
      `);
      
      // Get owned NFT counts per category if authenticated
      let ownedCounts: Record<string, number> = {};
      if (playerStakeKey) {
        const ownedResult = await pool.query(`
          SELECT 
            category_id,
            COUNT(id) as owned_count
          FROM player_nfts
          WHERE stake_key = $1
            AND status = 'confirmed'
            AND burned_at IS NULL
          GROUP BY category_id
        `, [playerStakeKey]);
        
        ownedResult.rows.forEach(row => {
          ownedCounts[row.category_id] = parseInt(row.owned_count) || 0;
        });
        
        console.log('[CATEGORIES] Owned NFT counts for player:', ownedCounts);
      }
      
      // Format response with NFT data from catalog
      const categories = result.rows.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        isActive: cat.isActive,
        iconUrl: cat.iconUrl,
        nftCount: parseInt(cat.nftCount) || 0,
        ownedCount: ownedCounts[cat.id] || 0,
        // Add NFT preview data from catalog
        nftImageIpfs: cat.nftPreview?.image || null,
        nftVideoIpfs: cat.nftPreview?.video || null,
        visualDescription: cat.nftPreview?.description || null,
      }));

      console.log('[CATEGORIES] Fetched categories with NFT data from catalog:', 
        categories.map(c => ({ 
          name: c.name, 
          hasNFT: !!c.nftImageIpfs,
          available: c.nftCount 
        }))
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ categories }));
    } catch (error) {
      console.error('[CATEGORIES] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch categories' }));
    }
    return;
  }

  // Sessions: Get limits
  if (path === '/api/sessions/limits' && method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      
      // Calculate reset time (tomorrow at midnight UTC)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      // Get config from AppConfig
      const appConfig = getAppConfigService();
      const config = await appConfig.getGameSettings();

      // If not authenticated, return default limits for guest
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const limits = {
          dailyLimit: config.limits.dailySessionsGuest,
          sessionsUsed: 0,
          remainingSessions: config.limits.dailySessionsGuest,
          resetAt: tomorrow.toISOString(),
          cooldownEndsAt: null,
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(limits));
        return;
      }

      // Get player from token
      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      const playerResult = await pool.query(
        'SELECT id FROM players WHERE stake_key = $1',
        [payload.stakeKey]
      );

      if (playerResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const playerId = playerResult.rows[0].id;

      // Count sessions started today (since midnight UTC)
      // Sessions are counted when first answer is submitted (started_at is set)
      // CURRENT_DATE in PostgreSQL returns the current date at midnight UTC
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sessionsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM sessions
        WHERE player_id = $1
          AND started_at >= $2
      `, [playerId, today.toISOString()]);

      const sessionsUsed = parseInt(sessionsResult.rows[0].count) || 0;
      const dailyLimit = config.limits.dailySessionsConnected; // From AppConfig
      const remainingSessions = Math.max(0, dailyLimit - sessionsUsed);

      const limits = {
        dailyLimit,
        sessionsUsed,
        remainingSessions,
        resetAt: tomorrow.toISOString(),
        cooldownEndsAt: null, // Could implement cooldown logic here
      };

      console.log(`[SESSIONS] Limits for player ${playerId}:`);
      console.log(`  - Sessions used today: ${sessionsUsed}/${dailyLimit}`);
      console.log(`  - Remaining sessions: ${remainingSessions}`);
      console.log(`  - Today started at: ${today.toISOString()}`);
      console.log(`  - Resets at: ${tomorrow.toISOString()}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(limits));
    } catch (error) {
      console.error('[SESSIONS] Error getting limits:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Sessions: Start new session
  if (path === '/api/sessions/start' && method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      console.log('[SESSIONS] Auth header:', authHeader ? 'Present' : 'Missing');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[SESSIONS] Unauthorized: No valid auth header');
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
      let payload;
      
      try {
        payload = JSON.parse(Buffer.from(token, 'base64').toString());
        console.log('[SESSIONS] Token decoded, stake key:', payload.stakeKey?.substring(0, 20) + '...');
      } catch (err) {
        console.log('[SESSIONS] Failed to decode token:', err);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token' }));
        return;
      }
      
      // Verify player exists in database
      const playerResult = await pool.query(
        'SELECT id FROM players WHERE stake_key = $1',
        [payload.stakeKey]
      );

      if (playerResult.rows.length === 0) {
        console.log('[SESSIONS] Player not found in database');
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const player = playerResult.rows[0];
      console.log(`[SESSIONS] Player verified, checking daily limit for category ${categoryId}`);

      // Get config from AppConfig
      const appConfig = getAppConfigService();
      const config = await appConfig.getGameSettings();

      // Check daily limit before starting session
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sessionsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM sessions
        WHERE player_id = $1
          AND started_at >= $2
      `, [player.id, today.toISOString()]);

      const sessionsUsed = parseInt(sessionsResult.rows[0].count) || 0;
      const dailyLimit = config.limits.dailySessionsConnected; // From AppConfig

      if (sessionsUsed >= dailyLimit) {
        console.log(`[SESSIONS] Daily limit reached: ${sessionsUsed}/${dailyLimit}`);
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Daily session limit reached',
          code: 'DAILY_LIMIT_REACHED',
          sessionsUsed,
          dailyLimit,
        }));
        return;
      }

      console.log(`[SESSIONS] Daily limit OK: ${sessionsUsed}/${dailyLimit}, starting session`);

      // Get questions with weighted selection (prefer less-used questions)
      // This ensures equal probability distribution over time
      const questionsPerSession = config.session.questionsPerSession; // From AppConfig
      const questionsResult = await pool.query(`
        SELECT id, text, options, correct_index as "correctIndex", explanation
        FROM questions
        WHERE category_id = $1 AND is_active = true
        ORDER BY times_used ASC, RANDOM()
        LIMIT $2
      `, [categoryId, questionsPerSession]);

      if (questionsResult.rows.length < questionsPerSession) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not enough questions for this category' }));
        return;
      }

      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();

      // 🧪 TESTING MODE: Set to true to include correct answers (REMOVE IN PRODUCTION!)
      const TESTING_MODE = true;

      // Prepare questions (without correct answers for client)
      const sessionQuestions = questionsResult.rows.map(q => ({
        questionId: q.id,
        text: q.text,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        servedAt: now,
        // 🧪 TESTING ONLY: Include correct answer index
        ...(TESTING_MODE && { correctIndex: q.correctIndex }),
      }));

      // Debug log to verify correctIndex is included
      if (TESTING_MODE) {
        console.log('[TESTING] First question correctIndex:', sessionQuestions[0].correctIndex);
      }

      // Store session with correct answers and explanations
      const session = {
        id: sessionId,
        categoryId,
        status: 'active',
        currentQuestionIndex: 0,
        questions: sessionQuestions,
        correctAnswers: questionsResult.rows.map(q => q.correctIndex),
        explanations: questionsResult.rows.map(q => q.explanation || 'No explanation available.'),
        answeredQuestions: new Set<number>(), // Track which questions have been answered
        score: 0,
        startedAt: now,
        persistedToDb: false, // Track if session has been saved to database (on first answer)
        stakeKey: payload.stakeKey, // Store for DB insert later
        playerId: player.id, // Store for DB insert later
      };

      activeSessions.set(sessionId, session);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        session: {
          id: session.id,
          categoryId: session.categoryId,
          status: session.status,
          currentQuestionIndex: session.currentQuestionIndex,
          questions: session.questions,
          score: session.score,
          startedAt: session.startedAt,
        }
      }));
    } catch (error) {
      console.error('[SESSIONS] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Sessions: Get session by ID
  if (path.match(/^\/api\/sessions\/[^/]+$/) && method === 'GET') {
    try {
      const sessionId = path.split('/')[3];
      const session = activeSessions.get(sessionId);

      if (!session) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found or expired' }));
        return;
      }

      console.log(`[SESSIONS] Retrieved session ${sessionId}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        session: {
          id: session.id,
          categoryId: session.categoryId,
          status: session.status,
          currentQuestionIndex: session.currentQuestionIndex,
          questions: session.questions,
          score: session.score,
          startedAt: session.startedAt,
        }
      }));
    } catch (error) {
      console.error('[SESSIONS] Error retrieving session:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Sessions: Submit answer
  if (path.match(/^\/api\/sessions\/[^/]+\/answer$/) && method === 'POST') {
    try {
      const sessionId = path.split('/')[3];
      const session = activeSessions.get(sessionId);

      if (!session) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found' }));
        return;
      }

      const body = await readBody(req);
      const { questionIndex, optionIndex } = JSON.parse(body);

      // Check if this question was already answered
      if (session.answeredQuestions.has(questionIndex)) {
        console.log(`[SESSIONS] Question ${questionIndex + 1} already answered, ignoring duplicate`);
        const correctIndex = session.correctAnswers[questionIndex];
        const explanation = session.explanations[questionIndex];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correct: optionIndex === correctIndex,
          correctIndex,
          explanation: explanation || 'No explanation available.',
          score: session.score,
        }));
        return;
      }

      const correctIndex = session.correctAnswers[questionIndex];
      const correct = optionIndex === correctIndex;
      const explanation = session.explanations[questionIndex];

      // Mark question as answered
      session.answeredQuestions.add(questionIndex);

      if (correct) {
        session.score++;
      }

      session.currentQuestionIndex = questionIndex + 1;

      // IMPORTANT: Insert session to database on first answer (commitment point)
      if (!session.persistedToDb) {
        try {
          await pool.query(`
            INSERT INTO sessions (id, player_id, stake_key, category_id, score, status, started_at, ended_at, total_ms, questions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            session.id,
            session.playerId,
            session.stakeKey,
            session.categoryId,
            session.score,
            'active',
            new Date().toISOString(), // started_at = now (first answer time)
            null, // ended_at = null (not completed yet)
            null, // total_ms = null (calculated at completion)
            JSON.stringify(session.questions)
          ]);
          
          session.persistedToDb = true;
          console.log(`[SESSIONS] Session ${sessionId} persisted to database on first answer (Q${questionIndex + 1})`);
        } catch (dbError) {
          console.error('[SESSIONS] Error persisting session to database:', dbError);
          // Continue anyway - session is still in memory
        }
      }

      console.log(`[SESSIONS] Answer submitted for ${sessionId}: Q${questionIndex + 1}, selected=${optionIndex}, correct=${correctIndex}, isCorrect=${correct}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        correct,
        correctIndex,
        explanation: explanation || 'No explanation available.',
        score: session.score,
      }));
    } catch (error) {
      console.error('[SESSIONS] Error submitting answer:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Sessions: Complete session
  if (path.match(/^\/api\/sessions\/[^/]+\/complete$/) && method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      const sessionId = path.split('/')[3];
      const session = activeSessions.get(sessionId);

      if (!session) {
        // Check if session was already completed in database
        const completedSession = await pool.query(
          'SELECT id, score, status, category_id FROM sessions WHERE id = $1',
          [sessionId]
        );

        if (completedSession.rows.length > 0) {
          // Session already completed, return existing result (idempotent)
          const existing = completedSession.rows[0];
          console.log(`[SESSIONS] Session ${sessionId} already completed, returning existing result`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            result: {
              sessionId,
              score: existing.score,
              totalQuestions: 10,
              isPerfect: existing.score === 10,
              categoryId: existing.category_id,
              status: existing.status,
              totalMs: 0,
            }
          }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found' }));
        return;
      }

      // Get player from database
      const playerResult = await pool.query(
        'SELECT id FROM players WHERE stake_key = $1',
        [payload.stakeKey]
      );

      if (playerResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const playerId = playerResult.rows[0].id;
      const isPerfect = session.score === session.questions.length;
      const endedAt = new Date();
      const startedAt = new Date(session.startedAt);
      const totalMs = endedAt.getTime() - startedAt.getTime();
      
      // Determine status: won if 6+ correct, lost otherwise
      const status = session.score >= 6 ? 'won' : 'lost';

      // Update or insert session to database
      if (session.persistedToDb) {
        // Session already in DB (first answer was submitted), UPDATE it
        await pool.query(`
          UPDATE sessions 
          SET score = $1, status = $2, ended_at = $3, total_ms = $4
          WHERE id = $5
        `, [
          session.score,
          status,
          endedAt.toISOString(),
          totalMs,
          sessionId
        ]);
        console.log(`[SESSIONS] Updated existing session ${sessionId} in database`);
      } else {
        // Edge case: Session completed without answering any questions (all timeouts ignored?)
        // Insert the session now
        await pool.query(`
          INSERT INTO sessions (id, player_id, stake_key, category_id, score, status, started_at, ended_at, total_ms, questions)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          sessionId,
          playerId,
          payload.stakeKey,
          session.categoryId,
          session.score,
          status,
          session.startedAt,
          endedAt.toISOString(),
          totalMs,
          JSON.stringify(session.questions)
        ]);
        console.log(`[SESSIONS] Inserted session ${sessionId} at completion (no answers submitted)`);
      }

      // Update season_points table (aggregated stats)
      try {
        // Get current active season
        const seasonResult = await pool.query(`
          SELECT id FROM seasons WHERE is_active = true LIMIT 1
        `);
        const currentSeasonId = seasonResult.rows.length > 0 ? seasonResult.rows[0].id : 'default-season';

        // Calculate points for this session (10 points per correct answer)
        const sessionPoints = session.score * 10;

        // Upsert season_points (insert or update if exists)
        await pool.query(`
          INSERT INTO season_points (
            season_id,
            stake_key,
            points,
            perfect_scores,
            nfts_minted,
            avg_answer_ms,
            sessions_used,
            first_achieved_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, 0, $5, 1, NOW(), NOW())
          ON CONFLICT (season_id, stake_key)
          DO UPDATE SET
            points = season_points.points + $3,
            perfect_scores = season_points.perfect_scores + $4,
            avg_answer_ms = (season_points.avg_answer_ms * season_points.sessions_used + $5) / (season_points.sessions_used + 1),
            sessions_used = season_points.sessions_used + 1,
            updated_at = NOW()
        `, [
          currentSeasonId,
          payload.stakeKey,
          sessionPoints,
          isPerfect ? 1 : 0,
          totalMs
        ]);

        console.log(`[SESSIONS] Updated season_points for ${payload.stakeKey}: +${sessionPoints} points, perfect=${isPerfect}`);
      } catch (error) {
        console.error('[SESSIONS] Error updating season_points:', error);
        // Don't fail the request if season_points update fails
      }

      // Create eligibility record if perfect score
      let eligibilityId = undefined;
      let nftAvailabilityMessage = null;
      
      if (isPerfect) {
        // Check if NFTs are available in catalog before creating eligibility
        const stockCheck = await pool.query(`
          SELECT COUNT(*) as available
          FROM nft_catalog
          WHERE category_id = $1
            AND is_minted = false
            AND tier = 'category'
        `, [session.categoryId]);

        const availableNFTs = parseInt(stockCheck.rows[0].available) || 0;
        console.log(`[SESSIONS] NFT stock check for category ${session.categoryId}: ${availableNFTs} available`);

        if (availableNFTs === 0) {
          // No NFTs available - don't create eligibility, inform player
          console.log(`[SESSIONS] No NFTs available for category ${session.categoryId}, skipping eligibility creation`);
          nftAvailabilityMessage = 'Unfortunately, all NFTs for this category have been minted. Your perfect score has been recorded, but no NFT eligibility was created.';
        } else {
          // NFTs available - create eligibility
          // We'll use session_id for deterministic NFT selection (same session = same NFT)
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
          
          const eligibilityType = 'category';
          
          // Get current active season (if any)
          const seasonResult = await pool.query(`
            SELECT id FROM seasons WHERE is_active = true LIMIT 1
          `);
          const currentSeasonId = seasonResult.rows.length > 0 ? seasonResult.rows[0].id : null;
          
          console.log(`[SESSIONS] Creating eligibility with type: "${eligibilityType}" for session ${sessionId}`);
          console.log(`[SESSIONS] Eligibility params:`, {
            playerId,
            sessionId,
            categoryId: session.categoryId,
            type: eligibilityType,
            status: 'active',
            stakeKey: payload.stakeKey,
            seasonId: currentSeasonId,
            expiresAt: expiresAt.toISOString(),
            availableNFTs
          });
          
          const eligibilityResult = await pool.query(`
            INSERT INTO eligibilities (
              player_id, 
              session_id, 
              category_id, 
              type, 
              status, 
              stake_key,
              season_id,
              expires_at, 
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id
          `, [
            playerId,
            sessionId,
            session.categoryId,
            eligibilityType, // type: category (for category NFT eligibility)
            'active', // status: active (can be minted)
            payload.stakeKey, // stake_key: denormalized for quick lookups
            currentSeasonId, // season_id: link to current season
            expiresAt.toISOString()
          ]);

          eligibilityId = eligibilityResult.rows[0].id;
          console.log(`[SESSIONS] Created eligibility ${eligibilityId} for perfect score (${availableNFTs} NFTs available, session: ${currentSeasonId || 'none'})`);
        }
      }

      // Update question usage tracking
      try {
        const questionIds = session.questions.map((q: any) => q.questionId);
        await pool.query(`
          UPDATE questions
          SET 
            times_used = times_used + 1,
            last_used_at = NOW()
          WHERE id = ANY($1)
        `, [questionIds]);
        console.log(`[SESSIONS] Updated usage tracking for ${questionIds.length} questions`);
      } catch (error) {
        console.error('[SESSIONS] Error updating question usage:', error);
        // Don't fail the request if usage tracking fails
      }

      // Remove from active sessions
      activeSessions.delete(sessionId);

      console.log(`[SESSIONS] Session completed: ${sessionId}, score=${session.score}/${session.questions.length}, perfect=${isPerfect}`);

      const result = {
        sessionId,
        score: session.score,
        totalQuestions: session.questions.length,
        isPerfect,
        categoryId: session.categoryId,
        status,
        totalMs,
        eligibilityId,
        nftAvailabilityMessage, // Include message if NFTs not available
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result }));
    } catch (error) {
      console.error('[SESSIONS] Error completing session:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Eligibilities: Get player eligibilities
  if (path === '/api/eligibilities' && method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      // Get player from database
      const playerResult = await pool.query(
        'SELECT id FROM players WHERE stake_key = $1',
        [payload.stakeKey]
      );

      if (playerResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const playerId = playerResult.rows[0].id;

      // Get all eligibilities (including expired ones for history)
      const eligibilitiesResult = await pool.query(`
        SELECT 
          e.id,
          e.type,
          e.category_id as "categoryId",
          e.player_id as "playerId",
          e.session_id as "sessionId",
          e.status,
          e.expires_at as "expiresAt",
          e.created_at as "createdAt",
          c.name as "categoryName",
          c.slug as "categorySlug"
        FROM eligibilities e
        JOIN categories c ON e.category_id = c.id
        WHERE e.player_id = $1
        ORDER BY e.created_at DESC
      `, [playerId]);

      const activeCount = eligibilitiesResult.rows.filter(e => 
        e.status === 'active' && new Date(e.expiresAt) > new Date()
      ).length;

      console.log(`[ELIGIBILITIES] Found ${eligibilitiesResult.rows.length} total eligibilities (${activeCount} active) for player ${playerId}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ eligibilities: eligibilitiesResult.rows }));
    } catch (error) {
      console.error('[ELIGIBILITIES] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Mint: Get NFT preview for an eligibility
  if (path.match(/^\/api\/mint\/[^/]+\/preview$/) && method === 'GET') {
    try {
      const eligibilityId = path.split('/')[3];
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      // Get eligibility
      const eligibilityResult = await pool.query(`
        SELECT 
          e.id,
          e.category_id,
          e.status,
          e.expires_at,
          c.name as category_name
        FROM eligibilities e
        JOIN categories c ON e.category_id = c.id
        WHERE e.id = $1 AND e.stake_key = $2
      `, [eligibilityId, payload.stakeKey]);

      if (eligibilityResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Eligibility not found' }));
        return;
      }

      const eligibility = eligibilityResult.rows[0];

      // Check if expired
      if (new Date(eligibility.expires_at) < new Date()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Eligibility has expired' }));
        return;
      }

      // Check if already used
      if (eligibility.status !== 'active') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Eligibility already used' }));
        return;
      }

      // Get a deterministic NFT using eligibility_id as seed
      // This ensures the same eligibility always shows/mints the same NFT
      console.log(`[MINT PREVIEW] Selecting NFT for eligibility ${eligibilityId}, category ${eligibility.category_id}`);
      
      const catalogResult = await pool.query(`
        WITH available_nfts AS (
          SELECT 
            nc.id as catalog_id,
            nc.name,
            nc.description,
            nc.ipfs_cid,
            nc.attributes,
            c.name as category_name,
            ROW_NUMBER() OVER (ORDER BY nc.id) as row_num
          FROM nft_catalog nc
          JOIN categories c ON nc.category_id = c.id
          WHERE nc.category_id = $1
            AND nc.is_minted = false
            AND nc.tier = 'category'
        ),
        total_count AS (
          SELECT COALESCE(COUNT(*), 0) as total FROM available_nfts
        )
        SELECT *
        FROM available_nfts
        WHERE (SELECT total FROM total_count) > 0
          AND row_num = (
            (ABS(hashtext($2::text)) % (SELECT total FROM total_count)) + 1
          )
      `, [eligibility.category_id, eligibilityId]);

      console.log(`[MINT PREVIEW] Query returned ${catalogResult.rows.length} rows`);

      if (catalogResult.rows.length === 0) {
        console.error(`[MINT PREVIEW] No available NFTs for category ${eligibility.category_id}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No available NFTs for this category' }));
        return;
      }

      const nft = catalogResult.rows[0];

      // Return preview
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        preview: {
          name: nft.name,
          description: nft.description,
          image: `ipfs://${nft.ipfs_cid}`,
          video: nft.attributes?.video_ipfs ? `ipfs://${nft.attributes.video_ipfs}` : undefined,
          visualDescription: nft.attributes?.visual_description,
          categoryName: nft.category_name,
        }
      }));
    } catch (error) {
      console.error('[MINT PREVIEW] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Mint: Initiate mint for an eligibility
  if (path.match(/^\/api\/mint\/[^/]+$/) && method === 'POST') {
    try {
      const eligibilityId = path.split('/')[3];
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      // Get player from database
      const playerResult = await pool.query(
        'SELECT id FROM players WHERE stake_key = $1',
        [payload.stakeKey]
      );

      if (playerResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const playerId = playerResult.rows[0].id;

      // Verify eligibility exists and belongs to player
      const eligibilityResult = await pool.query(`
        SELECT 
          e.id,
          e.type,
          e.category_id,
          e.status,
          e.expires_at
        FROM eligibilities e
        WHERE e.id = $1 AND e.player_id = $2
      `, [eligibilityId, playerId]);

      if (eligibilityResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Eligibility not found' }));
        return;
      }

      const eligibility = eligibilityResult.rows[0];

      // Check if eligibility is still active
      if (eligibility.status !== 'active') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Eligibility is not active' }));
        return;
      }

      // Check if eligibility has expired
      if (new Date(eligibility.expires_at) < new Date()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Eligibility has expired' }));
        return;
      }

      console.log(`[MINT] Initiating mint for eligibility ${eligibilityId}, player ${playerId}`);

      // Step 1: Select the SAME NFT that was shown in preview
      // Use eligibility_id as seed for deterministic selection
      console.log(`[MINT] Selecting NFT for eligibility ${eligibilityId}, category ${eligibility.category_id}`);
      
      const catalogResult = await pool.query(`
        WITH available_nfts AS (
          SELECT 
            nc.id as catalog_id,
            nc.name,
            nc.description,
            nc.ipfs_cid,
            nc.attributes,
            c.name as category_name,
            c.slug as category_slug,
            ROW_NUMBER() OVER (ORDER BY nc.id) as row_num
          FROM nft_catalog nc
          JOIN categories c ON nc.category_id = c.id
          WHERE nc.category_id = $1
            AND nc.is_minted = false
            AND nc.tier = 'category'
        ),
        total_count AS (
          SELECT COALESCE(COUNT(*), 0) as total FROM available_nfts
        )
        SELECT *
        FROM available_nfts
        WHERE (SELECT total FROM total_count) > 0
          AND row_num = (
            (ABS(hashtext($2::text)) % (SELECT total FROM total_count)) + 1
          )
      `, [eligibility.category_id, eligibilityId]);

      console.log(`[MINT] Query returned ${catalogResult.rows.length} rows`);

      if (catalogResult.rows.length === 0) {
        console.error('[MINT] No available NFTs in catalog for category:', eligibility.category_id);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'No NFTs available for this category. Please contact support.' 
        }));
        return;
      }

      const catalogNFT = catalogResult.rows[0];
      console.log(`[MINT] Selected NFT from catalog: ${catalogNFT.name} (${catalogNFT.catalog_id})`);

      // Step 2: Create mint operation record in mints table
      const policyId = 'dev_policy_' + crypto.randomUUID().substring(0, 8); // Mock policy ID for dev
      
      const mintResult = await pool.query(`
        INSERT INTO mints (
          eligibility_id,
          catalog_id,
          player_id,
          stake_key,
          policy_id,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
          id,
          eligibility_id as "eligibilityId",
          catalog_id as "catalogId",
          player_id as "playerId",
          status,
          created_at as "createdAt"
      `, [
        eligibilityId,
        catalogNFT.catalog_id,
        playerId,
        payload.stakeKey,
        policyId,
        'pending'
      ]);

      const mintRecord = mintResult.rows[0];
      console.log(`[MINT] Created mint operation record: ${mintRecord.id}`);

      // Step 3: Update eligibility status to 'used'
      await pool.query(`
        UPDATE eligibilities
        SET status = 'used', used_at = NOW()
        WHERE id = $1
      `, [eligibilityId]);

      console.log(`[MINT] Updated eligibility status to 'used'`);

      // Step 4: Mark catalog NFT as minted
      await pool.query(`
        UPDATE nft_catalog
        SET is_minted = true, minted_at = NOW()
        WHERE id = $1
      `, [catalogNFT.catalog_id]);

      console.log(`[MINT] Marked catalog NFT as minted`);

      // Return mint operation details
      const mintOperation = {
        id: mintRecord.id,
        eligibilityId: mintRecord.eligibilityId,
        playerId: mintRecord.playerId,
        status: mintRecord.status,
        createdAt: mintRecord.createdAt,
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        mintOperation
      }));

      console.log(`[MINT] Mint initiated successfully: ${mintRecord.id}`);
    } catch (error) {
      console.error('[MINT] Error:', error);
      console.error('[MINT] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
    return;
  }

  // Mint: Get mint status
  if (path.match(/^\/api\/mint\/[^/]+\/status$/) && method === 'GET') {
    try {
      const mintId = path.split('/')[3];
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      console.log(`[MINT] Checking status for mint ${mintId}`);

      // Step 1: Get mint operation from mints table
      const mintResult = await pool.query(`
        SELECT 
          m.id,
          m.eligibility_id as "eligibilityId",
          m.catalog_id as "catalogId",
          m.player_id as "playerId",
          m.stake_key as "stakeKey",
          m.status,
          m.tx_hash as "txHash",
          m.policy_id as "policyId",
          m.asset_fingerprint as "assetFingerprint",
          m.token_name as "tokenName",
          m.ipfs_cid as "ipfsCid",
          m.error,
          m.created_at as "createdAt",
          m.confirmed_at as "confirmedAt"
        FROM mints m
        WHERE m.id = $1 AND m.stake_key = $2
      `, [mintId, payload.stakeKey]);

      if (mintResult.rows.length === 0) {
        console.error('[MINT] Mint operation not found:', mintId);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Mint operation not found' }));
        return;
      }

      const mintOp = mintResult.rows[0];
      console.log(`[MINT] Found mint operation: ${mintOp.id}, status: ${mintOp.status}`);

      // Step 2: If still pending, check if already minted (prevent double-mint)
      if (mintOp.status === 'pending') {
        // If txHash exists, the mint already succeeded - just update status
        if (mintOp.txHash) {
          console.log(`[MINT] Mint already completed with txHash ${mintOp.txHash}, updating status...`);
          await pool.query(`
            UPDATE mints
            SET status = 'confirmed', confirmed_at = NOW()
            WHERE id = $1
          `, [mintId]);
          
          mintOp.status = 'confirmed';
          mintOp.confirmedAt = new Date();
        } else {
          console.log(`[MINT] Processing pending mint ${mintId}...`);
        
        // Get catalog NFT details
        const catalogResult = await pool.query(`
          SELECT 
            nc.id,
            nc.name,
            nc.description,
            nc.ipfs_cid,
            nc.attributes,
            nc.category_id,
            c.name as category_name,
            c.slug as category_slug
          FROM nft_catalog nc
          JOIN categories c ON nc.category_id = c.id
          WHERE nc.id = $1
        `, [mintOp.catalogId]);

        if (catalogResult.rows.length === 0) {
          console.error('[MINT] Catalog NFT not found:', mintOp.catalogId);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Catalog NFT not found' }));
          return;
        }

        const catalogNFT = catalogResult.rows[0];
        
        console.log(`[MINT] Minting real NFT on Cardano blockchain...`);
        
        // Get recipient address
        // For TESTING: Mint to backend wallet so backend can burn them for forging
        // For PRODUCTION: Mint to user's wallet (requires user-signed forge transactions)
        const USE_BACKEND_WALLET_FOR_TESTING = process.env.MINT_TO_BACKEND_WALLET === 'true';
        
        let recipientAddress: string;
        
        if (USE_BACKEND_WALLET_FOR_TESTING) {
          // Mint to backend wallet for testing
          const { Lucid, Blockfrost } = await import('lucid-cardano');
          const blockfrostUrl = `https://cardano-${process.env.CARDANO_NETWORK || 'preprod'}.blockfrost.io/api/v0`;
          const lucid = await Lucid.new(
            new Blockfrost(blockfrostUrl, process.env.BLOCKFROST_PROJECT_ID!),
            process.env.CARDANO_NETWORK === 'mainnet' ? 'Mainnet' : 'Preprod'
          );
          lucid.selectWalletFromSeed(process.env.WALLET_SEED_PHRASE!);
          recipientAddress = await lucid.wallet.address();
          console.log(`[MINT] TEST MODE: Minting to backend wallet: ${recipientAddress}`);
        } else {
          // Mint to user's wallet (production mode)
          const playerResult = await pool.query(
            'SELECT payment_address FROM players WHERE id = $1',
            [mintOp.playerId]
          );
          
          recipientAddress = playerResult.rows[0]?.payment_address;
          
          if (!recipientAddress) {
            throw new Error('Player payment address not found. Please reconnect your wallet.');
          }
          
          console.log(`[MINT] PRODUCTION MODE: Minting to user wallet: ${recipientAddress}`);
        }
        
        // Prepare metadata with real IPFS CIDs
        const videoIPFS = catalogNFT.attributes?.video_ipfs 
          ? `ipfs://${catalogNFT.attributes.video_ipfs}` 
          : undefined;
        
        // Generate asset name using new naming convention
        const hexId = generateHexId();
        const categoryCode = getCategoryCode(catalogNFT.category_slug as any);
        const assetName = buildAssetName({
          tier: 'category',
          categoryCode,
          id: hexId,
        });
        const typeCode = 'REG';
        
        console.log(`[MINT] Generated asset name: ${assetName} for ${catalogNFT.name}`);
        
        // Mint NFT on real Cardano blockchain!
        const mintResult = await cardanoService.mintNFT({
          recipientAddress,
          policyId: '', // Will be generated by service
          assetName: assetName,
          metadata: {
            name: catalogNFT.name, // display_name (human-friendly)
            asset_name: assetName, // on-chain identifier
            image: `ipfs://${catalogNFT.ipfs_cid}`,
            description: catalogNFT.description,
            video: videoIPFS,
            attributes: [
              { trait_type: 'Category', value: catalogNFT.category_name },
              { trait_type: 'CategoryCode', value: categoryCode },
              { trait_type: 'TierCode', value: typeCode },
              { trait_type: 'Score', value: '10/10' },
              { trait_type: 'Rarity', value: catalogNFT.attributes?.rarity || 'Common' },
            ],
            // CIP-27 Royalty Information (5% royalty to project)
            royalty: {
              addr: process.env.ROYALTY_ADDRESS || process.env.PAYMENT_ADDRESS || '',
              rate: process.env.ROYALTY_RATE || '0.025', // 2.5% default
            },
          },
        });
        
        console.log(`[MINT] Real blockchain mint successful!`);
        console.log(`[MINT] - TX Hash: ${mintResult.txHash}`);
        console.log(`[MINT] - Policy ID: ${mintResult.policyId}`);
        console.log(`[MINT] - Asset Fingerprint: ${mintResult.assetFingerprint}`);
        
        // Update mint operation with REAL blockchain data
        await pool.query(`
          UPDATE mints
          SET 
            status = 'confirmed',
            tx_hash = $1,
            asset_fingerprint = $2,
            token_name = $3,
            ipfs_cid = $4,
            policy_id = $5,
            confirmed_at = NOW()
          WHERE id = $6
        `, [
          mintResult.txHash,
          mintResult.assetFingerprint,
          mintResult.tokenName,
          catalogNFT.ipfs_cid,
          mintResult.policyId,
          mintId
        ]);

        console.log(`[MINT] Updated mint operation to confirmed`);
        console.log(`[MINT] Creating NFT record in player_nfts table...`);

        // Create metadata for database (reuse videoIPFS and naming variables from above)
        const nftMetadata = {
          name: catalogNFT.name, // display_name (human-friendly)
          asset_name: assetName, // on-chain identifier
          description: catalogNFT.description,
          image: `ipfs://${catalogNFT.ipfs_cid}`,
          video: videoIPFS,
          attributes: [
            { trait_type: 'Category', value: catalogNFT.category_name },
            { trait_type: 'CategoryCode', value: categoryCode },
            { trait_type: 'TierCode', value: typeCode },
            { trait_type: 'Score', value: '10/10' },
            { trait_type: 'Rarity', value: catalogNFT.attributes?.rarity || 'Common' },
          ],
          // CIP-27 Royalty Information (5% royalty to project)
          royalty: {
            addr: process.env.ROYALTY_ADDRESS || process.env.PAYMENT_ADDRESS || '',
            rate: process.env.ROYALTY_RATE || '0.05', // 5% default
          },
        };

        // Insert NFT into player_nfts table with REAL blockchain data
        const nftResult = await pool.query(`
          INSERT INTO player_nfts (
            stake_key,
            policy_id,
            asset_fingerprint,
            token_name,
            source,
            category_id,
            tier,
            type_code,
            status,
            metadata,
            mint_operation_id,
            minted_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          RETURNING 
            id,
            stake_key as "stakeKey",
            policy_id as "policyId",
            asset_fingerprint as "assetFingerprint",
            token_name as "tokenName",
            category_id as "categoryId",
            tier,
            type_code as "typeCode",
            status,
            metadata,
            minted_at as "mintedAt"
        `, [
          mintOp.stakeKey,
          mintResult.policyId,
          mintResult.assetFingerprint,
          mintResult.tokenName,
          'mint',
          catalogNFT.category_id,
          'category',
          'REG', // type_code for Tier 1 Category NFTs
          'confirmed',
          JSON.stringify(nftMetadata),
          mintId
        ]);

        console.log(`[MINT] NFT created successfully: ${nftResult.rows[0].id}`);
        
        // CRITICAL: Sync user's wallet immediately after mint
        syncService.queueUserSync(mintOp.stakeKey, SyncPriority.CRITICAL).catch(err => {
          console.error('[MINT] Failed to queue sync after mint:', err);
        });
        
        // Update mint operation status
        mintOp.status = 'confirmed';
        mintOp.txHash = mintResult.txHash;
        mintOp.assetFingerprint = mintResult.assetFingerprint;
        mintOp.tokenName = mintResult.tokenName;
        mintOp.ipfsCid = catalogNFT.ipfs_cid;
        mintOp.confirmedAt = new Date().toISOString();
        }
      }

      // Step 3: Get the NFT from player_nfts table
      const nftResult = await pool.query(`
        SELECT 
          id,
          stake_key as "stakeKey",
          policy_id as "policyId",
          asset_fingerprint as "assetFingerprint",
          token_name as "tokenName",
          category_id as "categoryId",
          tier,
          status,
          metadata,
          minted_at as "mintedAt"
        FROM player_nfts
        WHERE mint_operation_id = $1
      `, [mintId]);

      const nft = nftResult.rows[0] || null;

      // Return mint operation and NFT
      const mintOperation = {
        id: mintOp.id,
        eligibilityId: mintOp.eligibilityId,
        status: mintOp.status,
        txHash: mintOp.txHash,
        createdAt: mintOp.createdAt,
        confirmedAt: mintOp.confirmedAt,
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        mintOperation,
        nft
      }));

      console.log(`[MINT] Status returned for ${mintId}: confirmed`);
    } catch (error) {
      console.error('[MINT] Status check error:', error);
      console.error('[MINT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }));
    }
    return;
  }

  // Profile: Get player profile
  if (path === '/api/profile' && method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      // Get player from database
      const playerResult = await pool.query(
        'SELECT id, stake_key as "stakeKey", username, email FROM players WHERE stake_key = $1',
        [payload.stakeKey]
      );

      if (playerResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const player = playerResult.rows[0];

      // Get player stats
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN score = 10 THEN 1 END) as perfect_scores,
          COALESCE(SUM(score), 0) as total_score
        FROM sessions
        WHERE player_id = $1
      `, [player.id]);

      // Get total NFTs count
      const nftsResult = await pool.query(`
        SELECT COUNT(*) as total_nfts
        FROM player_nfts
        WHERE stake_key = $1 AND status = 'confirmed'
      `, [payload.stakeKey]);

      // Get perfect scores by category
      const perfectScoresByCategoryResult = await pool.query(`
        SELECT 
          c.name as category_name,
          COUNT(*) as perfect_count
        FROM sessions s
        JOIN categories c ON s.category_id = c.id
        WHERE s.player_id = $1 AND s.score = 10
        GROUP BY c.id, c.name
        ORDER BY perfect_count DESC
      `, [player.id]);

      const perfectScoresByCategory: Record<string, number> = {};
      perfectScoresByCategoryResult.rows.forEach(row => {
        perfectScoresByCategory[row.category_name] = parseInt(row.perfect_count);
      });

      const stats = {
        totalSessions: parseInt(statsResult.rows[0].total_sessions) || 0,
        perfectScores: parseInt(statsResult.rows[0].perfect_scores) || 0,
        totalNFTs: parseInt(nftsResult.rows[0].total_nfts) || 0,
        currentSeasonPoints: parseInt(statsResult.rows[0].total_score) || 0,
        perfectScoresByCategory,
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ player, stats }));
    } catch (error) {
      console.error('[PROFILE] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // NFTs: Get player NFTs
  if (path.startsWith('/api/profile/nfts') && method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      // Query player NFTs from database
      const nftsResult = await pool.query(`
        SELECT 
          id,
          stake_key as "stakeKey",
          policy_id as "policyId",
          asset_fingerprint as "assetFingerprint",
          token_name as "tokenName",
          source,
          category_id as "categoryId",
          tier,
          status,
          minted_at as "mintedAt",
          metadata
        FROM player_nfts
        WHERE stake_key = $1
          AND status = 'confirmed'
        ORDER BY minted_at DESC
      `, [payload.stakeKey]);

      const nfts = nftsResult.rows.map(row => ({
        ...row,
        mintedAt: row.mintedAt,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));

      console.log(`[NFTS] Found ${nfts.length} NFT(s) for player ${payload.stakeKey.substring(0, 20)}...`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ nfts }));
    } catch (error) {
      console.error('[NFTS] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Activity: Get player activity
  if (path.startsWith('/api/profile/activity') && method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      // Get player from database
      const playerResult = await pool.query(
        'SELECT id FROM players WHERE stake_key = $1',
        [payload.stakeKey]
      );

      if (playerResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const playerId = playerResult.rows[0].id;

      // Get recent sessions as activities
      const sessionsResult = await pool.query(`
        SELECT 
          s.id,
          s.score,
          s.status,
          s.ended_at as timestamp,
          c.name as category_name
        FROM sessions s
        JOIN categories c ON s.category_id = c.id
        WHERE s.player_id = $1
        ORDER BY s.ended_at DESC
        LIMIT 20
      `, [playerId]);

      // Transform sessions into activities
      const activities = sessionsResult.rows.map(row => ({
        id: row.id,
        type: 'session',
        timestamp: row.timestamp,
        details: {
          score: row.score,
          status: row.status,
          category: row.category_name,
        }
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ activities }));
    } catch (error) {
      console.error('[ACTIVITY] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Questions: Flag/Report question
  if (path === '/api/questions/flag' && method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      // Get player from database
      const playerResult = await pool.query(
        'SELECT id FROM players WHERE stake_key = $1',
        [payload.stakeKey]
      );

      if (playerResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      const playerId = playerResult.rows[0].id;

      const body = await readBody(req);
      const { questionId, reason } = JSON.parse(body);

      // Validate input
      if (!questionId || !reason || reason.trim().length < 10) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid input. Reason must be at least 10 characters.' }));
        return;
      }

      // Verify question exists
      const questionResult = await pool.query(
        'SELECT id FROM questions WHERE id = $1',
        [questionId]
      );

      if (questionResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Question not found' }));
        return;
      }

      // Insert flag record
      await pool.query(`
        INSERT INTO question_flags (question_id, player_id, reason, handled, created_at)
        VALUES ($1, $2, $3, false, NOW())
      `, [questionId, playerId, reason.trim()]);

      console.log(`[QUESTIONS] Question ${questionId} flagged by player ${playerId}: ${reason.substring(0, 50)}...`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('[QUESTIONS] Error flagging question:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Forge: Get progress
  if (path === '/api/forge/progress' && method === 'GET') {
    console.log('[FORGE] GET /api/forge/progress - Request received');
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[FORGE] Unauthorized - No auth header');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      // Get player's NFTs for forging progress
      const nftsResult = await pool.query(`
        SELECT 
          pn.id,
          pn.stake_key as "stakeKey",
          pn.policy_id as "policyId",
          pn.asset_fingerprint as "assetFingerprint",
          pn.token_name as "tokenName",
          c.slug as "categoryId",
          pn.season_id as "seasonId",
          pn.tier,
          pn.status,
          pn.source,
          pn.minted_at as "mintedAt",
          pn.metadata
        FROM player_nfts pn
        LEFT JOIN categories c ON pn.category_id = c.id
        WHERE pn.stake_key = $1
          AND pn.status = 'confirmed'
          AND pn.tier = 'category'
        ORDER BY c.slug
      `, [payload.stakeKey]);

      const nfts = nftsResult.rows;

      // Calculate forging progress
      const progress = [];

      // 1. Category Ultimate (10 NFTs from same category)
      const categoryGroups: Record<string, any[]> = {};
      nfts.forEach(nft => {
        if (nft.categoryId) {
          if (!categoryGroups[nft.categoryId]) {
            categoryGroups[nft.categoryId] = [];
          }
          categoryGroups[nft.categoryId].push(nft);
        }
      });

      // Add Category Ultimate progress for each category that has NFTs
      for (const [categoryId, categoryNFTs] of Object.entries(categoryGroups)) {
        progress.push({
          type: 'category',
          categoryId,
          required: 10,
          current: categoryNFTs.length,
          nfts: categoryNFTs, // Return ALL NFTs so user can choose which to burn
          canForge: categoryNFTs.length >= 10,
        });
      }

      // If no NFTs at all, show a placeholder Category Ultimate to explain the concept
      if (nfts.length === 0) {
        progress.push({
          type: 'category',
          categoryId: 'Any Category',
          required: 10,
          current: 0,
          nfts: [],
          canForge: false,
        });
      }

      // 2. Master Ultimate (1 NFT from each of 10 categories)
      const uniqueCategories = new Set(nfts.map(nft => nft.categoryId).filter(Boolean));
      
      // Get ALL NFTs from categories that have at least 1 NFT
      // User can choose which NFT from each category to burn
      const masterNFTs = nfts.filter(nft => nft.categoryId && uniqueCategories.has(nft.categoryId));

      progress.push({
        type: 'master',
        required: 10,
        current: uniqueCategories.size,
        nfts: masterNFTs, // Return ALL NFTs so user can choose which to burn
        canForge: uniqueCategories.size >= 10,
      });

      // 3. Seasonal Ultimate (2 NFTs from each category)
      const seasonalGroups: Record<string, any[]> = {};
      nfts.forEach(nft => {
        if (nft.categoryId) {
          if (!seasonalGroups[nft.categoryId]) {
            seasonalGroups[nft.categoryId] = [];
          }
          seasonalGroups[nft.categoryId].push(nft);
        }
      });

      const categoriesWithEnough = Object.values(seasonalGroups).filter(
        catNFTs => catNFTs.length >= 2
      );

      const seasonalNFTs: any[] = [];
      categoriesWithEnough.forEach(catNFTs => {
        seasonalNFTs.push(...catNFTs.slice(0, 2));
      });

      progress.push({
        type: 'season',
        required: 10, // 10 categories
        current: categoriesWithEnough.length,
        nfts: seasonalNFTs,
        canForge: categoriesWithEnough.length >= 10,
      });

      console.log(`[FORGE] Progress for ${payload.stakeKey}: ${progress.length} forge types`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ progress }));
    } catch (error) {
      console.error('[FORGE] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Forge: Initiate (category, master, season)
  if ((path === '/api/forge/category' || path === '/api/forge/master' || path === '/api/forge/season') && method === 'POST') {
    console.log(`[FORGE] POST ${path} - Request received`);
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[FORGE] Unauthorized - No auth header');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      // Parse request body
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      await new Promise(resolve => req.on('end', resolve));
      
      if (!body || body.trim() === '') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body is empty' }));
        return;
      }

      let forgeRequest;
      try {
        forgeRequest = JSON.parse(body);
      } catch (parseError) {
        console.error('[FORGE] JSON parse error:', parseError);
        console.error('[FORGE] Body received:', body);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
        return;
      }
      
      const { type, categoryId, seasonId, inputFingerprints } = forgeRequest;

      console.log(`[FORGE] Initiating ${type} forge with ${inputFingerprints.length} NFTs`);

      // Validate NFT ownership
      const ownershipCheck = await pool.query(`
        SELECT COUNT(*) as count
        FROM player_nfts
        WHERE stake_key = $1
          AND asset_fingerprint = ANY($2)
          AND status = 'confirmed'
      `, [payload.stakeKey, inputFingerprints]);

      if (parseInt(ownershipCheck.rows[0].count) !== inputFingerprints.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'You do not own all specified NFTs' }));
        return;
      }

      // Convert category slug to UUID if provided
      let categoryUUID = null;
      if (categoryId) {
        const categoryResult = await pool.query(
          'SELECT id FROM categories WHERE slug = $1',
          [categoryId]
        );
        if (categoryResult.rows.length > 0) {
          categoryUUID = categoryResult.rows[0].id;
          console.log(`[FORGE] Resolved category "${categoryId}" to UUID: ${categoryUUID}`);
        } else {
          console.error(`[FORGE] Category slug "${categoryId}" not found!`);
        }
      }

      // Create forge operation record (let PostgreSQL generate UUID)
      const forgeResult = await pool.query(`
        INSERT INTO forge_operations (
          type, stake_key, category_id, season_id, 
          input_fingerprints, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [
        type,
        payload.stakeKey,
        categoryUUID || null,
        seasonId || null,
        JSON.stringify(inputFingerprints),
        'pending'
      ]);
      
      const forgeId = forgeResult.rows[0].id;

      // Build unsigned transaction for user to sign
      console.log(`[FORGE] Building unsigned transaction for forge ${forgeId}...`);
      
      // Build transaction synchronously (don't use async IIFE)
      try {
        console.log(`[FORGE] Processing forge ${forgeId}...`);

          // Get recipient address (player's wallet)
          const playerResult = await pool.query(
            'SELECT payment_address FROM players WHERE stake_key = $1',
            [payload.stakeKey]
          );
          
          const recipientAddress = playerResult.rows[0]?.payment_address;
          
          if (!recipientAddress) {
            throw new Error('Player payment address not found. Please reconnect your wallet.');
          }
          
          console.log(`[FORGE] Using recipient address: ${recipientAddress}`);

          // Get NFT details for burning (policy IDs and token names)
          const nftsToburn = await pool.query(`
            SELECT policy_id, token_name, asset_fingerprint
            FROM player_nfts
            WHERE asset_fingerprint = ANY($1)
              AND status = 'confirmed'
          `, [inputFingerprints]);

          if (nftsToburn.rows.length !== inputFingerprints.length) {
            throw new Error(`Expected ${inputFingerprints.length} NFTs to burn, found ${nftsToburn.rows.length}`);
          }

          console.log(`[FORGE] Found ${nftsToburn.rows.length} NFTs to burn on blockchain`);

          // Get Ultimate NFT design from catalog
          const ultimateTier = type === 'master' ? 'master' : type === 'season' ? 'seasonal' : 'ultimate';
          
          const catalogQuery = await pool.query(`
            SELECT 
              id,
              name,
              description,
              ipfs_cid,
              attributes,
              category_id
            FROM nft_catalog
            WHERE category_id = $1
              AND tier = $2
              AND is_minted = false
            LIMIT 1
          `, [categoryUUID || null, ultimateTier]);

          let catalogNFT;
          let catalogId = null;

          if (catalogQuery.rows.length > 0) {
            catalogNFT = catalogQuery.rows[0];
            catalogId = catalogNFT.id;
            console.log(`[FORGE] Using catalog NFT: ${catalogNFT.name}`);
          } else {
            // Fallback to generated metadata if no catalog entry
            console.log(`[FORGE] No catalog entry found for ${ultimateTier}, using fallback`);
            catalogNFT = {
              name: `${type.charAt(0).toUpperCase() + type.slice(1)} Ultimate NFT`,
              description: `Forged from ${inputFingerprints.length} NFTs`,
              ipfs_cid: 'QmPlaceholder',
              attributes: { rarity: 'Ultimate' },
            };
          }

          // Prepare burn assets for blockchain (convert token names to hex)
          const { fromText } = await import('lucid-cardano');
          const burnAssets = nftsToburn.rows.map(nft => {
            // Sanitize token name the same way it was done during minting
            // Remove all non-alphanumeric characters except underscore
            const cleanTokenName = nft.token_name.replace(/[^a-zA-Z0-9_]/g, '');
            return {
              policyId: nft.policy_id,
              assetNameHex: fromText(cleanTokenName),
            };
          });
          
          console.log(`[FORGE] Burn assets prepared:`, burnAssets.map(a => ({ 
            policy: a.policyId.substring(0, 10) + '...', 
            hexLength: a.assetNameHex.length 
          })));

          // Prepare metadata for Ultimate NFT
          const videoIPFS = catalogNFT.attributes?.video_ipfs 
            ? `ipfs://${catalogNFT.attributes.video_ipfs}` 
            : undefined;

          // Parse description if it's a JSON string (array of chunks)
          let description = catalogNFT.description;
          if (typeof description === 'string') {
            try {
              description = JSON.parse(description);
            } catch (e) {
              // If not JSON, split it into 64-char chunks
              const chunks = [];
              for (let i = 0; i < description.length; i += 64) {
                chunks.push(description.substring(i, i + 64));
              }
              description = chunks;
            }
          }

          // Create a short unique asset name (max 32 bytes)
          // Use first 18 chars of name + 8 char ID = 27 chars total (with underscore)
          const shortName = catalogNFT.name.replace(/\s+/g, '_').substring(0, 18);
          const shortId = catalogId 
            ? catalogId.substring(0, 8) 
            : Date.now().toString().slice(-8); // Last 8 digits of timestamp
          const uniqueAssetName = `${shortName}_${shortId}`;
          
          console.log(`[FORGE] Ultimate NFT asset name: ${uniqueAssetName} (${uniqueAssetName.length} chars)`);
          console.log(`[FORGE] Description chunks:`, Array.isArray(description) ? description.length : 'single string');

          console.log(`[FORGE] Building UNSIGNED transaction...`);
          console.log(`[FORGE] - Will burn ${burnAssets.length} NFTs`);
          console.log(`[FORGE] - Will mint 1 Ultimate NFT: ${catalogNFT.name}`);

          // Build UNSIGNED transaction for user to sign
          const txBuildResult = await cardanoService.buildBurnAndMintTx({
            burnAssets,
            userAddress: recipientAddress,
            mintAsset: {
              recipientAddress,
              policyId: '', // Will be generated
              assetName: uniqueAssetName,
              metadata: {
                name: catalogNFT.name,
                image: `ipfs://${catalogNFT.ipfs_cid}`,
                description: description,
                video: videoIPFS,
                attributes: [
                  { trait_type: 'Type', value: 'Ultimate' },
                  { trait_type: 'Tier', value: ultimateTier },
                  { trait_type: 'Forged From', value: `${inputFingerprints.length} NFTs` },
                  { trait_type: 'Rarity', value: catalogNFT.attributes?.rarity || 'Ultimate' },
                ],
                royalty: {
                  addr: process.env.ROYALTY_ADDRESS || process.env.PAYMENT_ADDRESS || '',
                  rate: process.env.ROYALTY_RATE || '0.025',
                },
              },
            },
          });

          console.log(`[FORGE] Unsigned transaction built successfully!`);
          console.log(`[FORGE] - Policy ID: ${txBuildResult.policyId}`);
          console.log(`[FORGE] - Asset Fingerprint: ${txBuildResult.assetFingerprint}`);
          console.log(`[FORGE] - TX CBOR length: ${txBuildResult.txCBOR.length}`);

          // Store transaction metadata for later use (after user signs)
          const forgeMetadata = {
            catalogId,
            catalogNFT,
            videoIPFS,
            ultimateTier,
            uniqueAssetName,
            policyId: txBuildResult.policyId,
            assetFingerprint: txBuildResult.assetFingerprint,
          };

          // Update forge operation with transaction CBOR (awaiting user signature)
          await pool.query(`
            UPDATE forge_operations
            SET 
              status = 'pending',
              output_asset_fingerprint = $1,
              error = $2
            WHERE id = $3
          `, [
            txBuildResult.assetFingerprint,
            JSON.stringify({ txCBOR: txBuildResult.txCBOR, metadata: forgeMetadata }),
            forgeId
          ]);

          console.log(`[FORGE] Forge operation updated - ready for user signature`);
      } catch (error) {
        console.error(`[FORGE] Error building transaction for forge ${forgeId}:`, error);
        
        // Update forge operation with error
        await pool.query(`
          UPDATE forge_operations
          SET status = 'failed', error = $1
          WHERE id = $2
        `, [error instanceof Error ? error.message : 'Unknown error', forgeId]);
        
        // Re-throw so the outer catch handles it
        throw error;
      }

      // Return forge operation with transaction CBOR
      const forgeOpResult = await pool.query(`
        SELECT 
          id, type, stake_key as "stakeKey",
          category_id as "categoryId", season_id as "seasonId",
          input_fingerprints as "inputFingerprints",
          output_asset_fingerprint as "outputAssetFingerprint",
          status, error, created_at as "createdAt"
        FROM forge_operations
        WHERE id = $1
      `, [forgeId]);

      const forgeOperation = forgeOpResult.rows[0];
      // Parse inputFingerprints if it's a string
      if (typeof forgeOperation.inputFingerprints === 'string') {
        forgeOperation.inputFingerprints = JSON.parse(forgeOperation.inputFingerprints);
      }

      // Extract txCBOR from error field (temporary storage)
      let txCBOR = null;
      let metadata = null;
      
      console.log('[FORGE] Checking for txCBOR in error field...');
      console.log('[FORGE] error field type:', typeof forgeOperation.error);
      console.log('[FORGE] error field value:', forgeOperation.error ? forgeOperation.error.substring(0, 100) : 'null');
      
      if (forgeOperation.error) {
        try {
          const errorData = JSON.parse(forgeOperation.error);
          txCBOR = errorData.txCBOR;
          metadata = errorData.metadata;
          console.log('[FORGE] ✅ Extracted txCBOR, length:', txCBOR ? txCBOR.length : 'null');
          console.log('[FORGE] ✅ Extracted metadata:', metadata ? 'yes' : 'no');
          delete forgeOperation.error; // Don't send error field to frontend
        } catch (e) {
          console.error('[FORGE] ❌ Failed to parse error field:', e);
          // If error is not JSON, it's a real error
        }
      } else {
        console.log('[FORGE] ❌ No error field found!');
      }

      console.log(`[FORGE] Forge operation ${forgeId} created with transaction`);
      console.log('[FORGE] Sending response with txCBOR:', txCBOR ? 'YES' : 'NO');

      const response = { 
        forgeOperation,
        txCBOR,
        policyId: metadata?.policyId,
        assetFingerprint: metadata?.assetFingerprint,
      };
      
      console.log('[FORGE] Response keys:', Object.keys(response));
      console.log('[FORGE] Response txCBOR length:', response.txCBOR ? response.txCBOR.length : 'null');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (error) {
      console.error('[FORGE] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Forge: Submit signed transaction
  if (path === '/api/forge/submit-signed' && method === 'POST') {
    console.log(`[FORGE] POST /api/forge/submit-signed - Request received`);
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      const body = await readBody(req);
      console.log('[FORGE] Raw body received:', body.substring(0, 200));
      console.log('[FORGE] Body length:', body.length);
      
      let forgeId, signedTxCBOR;
      try {
        const parsed = JSON.parse(body);
        forgeId = parsed.forgeId;
        signedTxCBOR = parsed.signedTxCBOR;
      } catch (parseError) {
        console.error('[FORGE] JSON parse error:', parseError);
        console.error('[FORGE] Body that failed to parse:', body);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
        return;
      }

      console.log(`[FORGE] Submitting signed transaction for forge ${forgeId}`);

      // Get forge operation
      const forgeOpResult = await pool.query(`
        SELECT 
          id, stake_key, input_fingerprints, error, output_asset_fingerprint
        FROM forge_operations
        WHERE id = $1 AND stake_key = $2
      `, [forgeId, payload.stakeKey]);

      if (forgeOpResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forge operation not found' }));
        return;
      }

      const forgeOp = forgeOpResult.rows[0];
      
      console.log('[FORGE] Forge operation error field type:', typeof forgeOp.error);
      console.log('[FORGE] Forge operation error field preview:', forgeOp.error ? forgeOp.error.substring(0, 100) : 'null');
      
      // Extract metadata and unsigned CBOR from error field
      let errorData, metadata, inputFingerprints, unsignedTxCBOR;
      try {
        errorData = JSON.parse(forgeOp.error);
        metadata = errorData.metadata;
        unsignedTxCBOR = errorData.txCBOR;
        console.log('[FORGE] ✅ Parsed error field successfully');
        console.log('[FORGE] Unsigned TX CBOR length:', unsignedTxCBOR ? unsignedTxCBOR.length : 'null');
      } catch (e) {
        console.error('[FORGE] ❌ Failed to parse error field:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to parse forge metadata' }));
        return;
      }
      
      if (!unsignedTxCBOR) {
        console.error('[FORGE] ❌ No unsigned transaction CBOR found in forge operation');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing unsigned transaction data' }));
        return;
      }
      
      // Parse input fingerprints (might already be an object)
      if (typeof forgeOp.input_fingerprints === 'string') {
        inputFingerprints = JSON.parse(forgeOp.input_fingerprints);
      } else {
        inputFingerprints = forgeOp.input_fingerprints;
      }

      // Submit signed transaction to blockchain (with backend signature added)
      const txHash = await submitSignedTransaction(signedTxCBOR, unsignedTxCBOR);

      console.log(`[FORGE] Transaction submitted! TX Hash: ${txHash}`);

      // Mark catalog NFT as minted if we used one
      if (metadata.catalogId) {
        await pool.query(`
          UPDATE nft_catalog
          SET is_minted = true, minted_at = NOW()
          WHERE id = $1
        `, [metadata.catalogId]);
      }

      // Mark input NFTs as burned in database
      await pool.query(`
        UPDATE player_nfts
        SET status = 'burned', burned_at = NOW()
        WHERE asset_fingerprint = ANY($1)
      `, [inputFingerprints]);

      // Insert Ultimate NFT into database with REAL blockchain data
      const nftMetadata = {
        name: metadata.catalogNFT.name,
        description: metadata.catalogNFT.description,
        image: `ipfs://${metadata.catalogNFT.ipfs_cid}`,
        video: metadata.videoIPFS,
        attributes: [
          { trait_type: 'Type', value: 'Ultimate' },
          { trait_type: 'Tier', value: metadata.ultimateTier },
          { trait_type: 'Forged From', value: `${inputFingerprints.length} NFTs` },
          { trait_type: 'Rarity', value: metadata.catalogNFT.attributes?.rarity || 'Ultimate' },
        ],
      };

      await pool.query(`
        INSERT INTO player_nfts (
          stake_key, policy_id, asset_fingerprint, token_name,
          source, category_id, season_id, tier, status, minted_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
      `, [
        payload.stakeKey,
        metadata.policyId,
        metadata.assetFingerprint,
        metadata.uniqueAssetName,
        'forge',
        metadata.catalogNFT.category_id || null,
        null, // seasonId
        metadata.ultimateTier,
        'confirmed',
        JSON.stringify(nftMetadata)
      ]);

      // Update forge operation with blockchain data
      await pool.query(`
        UPDATE forge_operations
        SET 
          status = 'confirmed',
          burn_tx_hash = $1,
          mint_tx_hash = $1,
          confirmed_at = NOW(),
          error = NULL
        WHERE id = $2
      `, [txHash, forgeId]);

      console.log(`[FORGE] Forge ${forgeId} completed successfully!`);

      // CRITICAL: Sync user's wallet immediately after forge
      syncService.queueUserSync(payload.stakeKey, SyncPriority.CRITICAL).catch(err => {
        console.error('[FORGE] Failed to queue sync after forge:', err);
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        txHash,
        status: 'confirmed',
        assetFingerprint: metadata.assetFingerprint,
      }));
    } catch (error) {
      console.error('[FORGE] Error submitting signed transaction:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }));
    }
    return;
  }

  // Forge: Get status
  if (path.match(/^\/api\/forge\/[^/]+\/status$/) && method === 'GET') {
    console.log(`[FORGE] GET ${path} - Request received`);
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[FORGE] Unauthorized - No auth header');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const forgeId = path.split('/')[3];

      // Get forge operation
      const forgeResult = await pool.query(`
        SELECT 
          id, type, stake_key as "stakeKey",
          category_id as "categoryId", season_id as "seasonId",
          input_fingerprints as "inputFingerprints",
          burn_tx_hash as "burnTxHash",
          mint_tx_hash as "mintTxHash",
          output_asset_fingerprint as "outputAssetFingerprint",
          status, error,
          created_at as "createdAt",
          confirmed_at as "confirmedAt"
        FROM forge_operations
        WHERE id = $1
      `, [forgeId]);

      if (forgeResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forge operation not found' }));
        return;
      }

      const forgeOperation = forgeResult.rows[0];
      forgeOperation.inputFingerprints = JSON.parse(forgeOperation.inputFingerprints);

      // Get Ultimate NFT if confirmed
      let ultimateNFT = null;
      if (forgeOperation.status === 'confirmed' && forgeOperation.outputAssetFingerprint) {
        const nftResult = await pool.query(`
          SELECT 
            id, stake_key as "stakeKey",
            policy_id as "policyId",
            asset_fingerprint as "assetFingerprint",
            token_name as "tokenName",
            source, category_id as "categoryId",
            season_id as "seasonId", tier, status,
            minted_at as "mintedAt", metadata
          FROM player_nfts
          WHERE asset_fingerprint = $1
        `, [forgeOperation.outputAssetFingerprint]);

        if (nftResult.rows.length > 0) {
          ultimateNFT = nftResult.rows[0];
        }
      }

      console.log(`[FORGE] Status for ${forgeId}: ${forgeOperation.status}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        forgeOperation,
        ultimateNFT,
        executionStatus: null // Would come from Step Functions in production
      }));
    } catch (error) {
      console.error('[FORGE] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Seasons: Get current season
  if (path === '/api/seasons/current' && method === 'GET') {
    try {
      const result = await pool.query(
        'SELECT id, name, starts_at, ends_at, grace_days FROM seasons WHERE starts_at <= NOW() AND ends_at >= NOW() ORDER BY starts_at DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        // Create a default season if none exists
        const defaultSeason = {
          id: 'season-1',
          name: 'Season 1',
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          gracePeriodEndsAt: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(), // 37 days from now
          activeCategories: ['science', 'history', 'geography', 'sports', 'arts', 'entertainment', 'technology', 'nature', 'mythology', 'weird-wonderful'],
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ season: defaultSeason }));
        return;
      }

      const row = result.rows[0];
      const gracePeriodEnd = new Date(row.ends_at);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (row.grace_days || 7));
      
      const season = {
        id: row.id,
        name: row.name,
        endsAt: row.ends_at,
        gracePeriodEndsAt: gracePeriodEnd.toISOString(),
        activeCategories: ['science', 'history', 'geography', 'sports', 'arts', 'entertainment', 'technology', 'nature', 'mythology', 'weird-wonderful'],
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ season }));
    } catch (error: any) {
      console.error('[SEASONS] Error getting current season:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
    }
    return;
  }

  // Leaderboard: Get global leaderboard
  if (path === '/api/leaderboard/global' && method === 'GET') {
    console.log('[LEADERBOARD] Global leaderboard endpoint hit!');
    try {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const seasonId = url.searchParams.get('seasonId') || 'season-1';

      console.log('[LEADERBOARD] Params:', { limit, offset, seasonId });

      // Try to use season_points first (optimized), fall back to sessions if empty
      const countCheck = await pool.query(
        'SELECT COUNT(*) as count FROM season_points WHERE season_id = $1',
        [seasonId]
      );
      const hasSeasonPoints = parseInt(countCheck.rows[0].count) > 0;

      let result, countResult;

      if (hasSeasonPoints) {
        console.log('[LEADERBOARD] Using season_points table (optimized)');
        
        // Use pre-aggregated season_points
        result = await pool.query(`
          SELECT 
            p.stake_key,
            p.username,
            sp.points,
            sp.perfect_scores,
            sp.nfts_minted,
            sp.avg_answer_ms as avg_answer_time,
            sp.sessions_used as total_sessions
          FROM players p
          INNER JOIN season_points sp ON p.stake_key = sp.stake_key
          WHERE sp.season_id = $1 AND sp.points > 0
          ORDER BY sp.points DESC, sp.perfect_scores DESC, sp.avg_answer_ms ASC
          LIMIT $2 OFFSET $3
        `, [seasonId, limit, offset]);

        countResult = await pool.query(`
          SELECT COUNT(*) as total
          FROM season_points
          WHERE season_id = $1 AND points > 0
        `, [seasonId]);
      } else {
        console.log('[LEADERBOARD] Falling back to sessions table (calculating)');
        
        // Calculate from sessions table (fallback)
        result = await pool.query(`
          SELECT 
            p.stake_key,
            p.username,
            SUM(s.score * 10) as points,
            COUNT(CASE WHEN s.score = 10 THEN 1 END) as perfect_scores,
            COUNT(DISTINCT e.id) as nfts_minted,
            AVG(s.total_ms) as avg_answer_time,
            COUNT(s.id) as total_sessions
          FROM players p
          INNER JOIN sessions s ON p.stake_key = s.stake_key
          LEFT JOIN eligibilities e ON p.stake_key = e.stake_key
          WHERE s.status = 'won' OR s.status = 'completed'
          GROUP BY p.stake_key, p.username
          HAVING SUM(s.score * 10) > 0
          ORDER BY points DESC, perfect_scores DESC, avg_answer_time ASC
          LIMIT $1 OFFSET $2
        `, [limit, offset]);

        countResult = await pool.query(`
          SELECT COUNT(DISTINCT s.stake_key) as total
          FROM sessions s
          WHERE s.status = 'won' OR s.status = 'completed'
        `);
      }

      console.log('[LEADERBOARD] Found', result.rows.length, 'entries');

      const total = parseInt(countResult.rows[0]?.total || '0');
      const hasMore = offset + limit < total;

      const entries = result.rows.map((row, index) => ({
        rank: offset + index + 1,
        stakeKey: row.stake_key,
        username: row.username,
        points: parseInt(row.points),
        perfectScores: parseInt(row.perfect_scores),
        nftsMinted: parseInt(row.nfts_minted),
        avgAnswerTime: parseFloat(row.avg_answer_time),
      }));

      console.log('[LEADERBOARD] Returning', entries.length, 'entries, hasMore:', hasMore);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        leaderboard: {
          seasonId,
          entries,
          hasMore,
          total,
        },
      }));
    } catch (error: any) {
      console.error('[LEADERBOARD] Error getting global leaderboard:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
    }
    return;
  }

  // Leaderboard: Get category leaderboard
  if (path.match(/^\/api\/leaderboard\/category\/[^/]+$/) && method === 'GET') {
    console.log('[LEADERBOARD] Category leaderboard endpoint hit!');
    try {
      const categorySlug = path.split('/').pop();
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const seasonId = url.searchParams.get('seasonId') || 'season-1';

      console.log('[LEADERBOARD] Category params:', { categorySlug, limit, offset, seasonId });

      // First, get the category UUID from the slug
      const categoryResult = await pool.query(
        'SELECT id FROM categories WHERE slug = $1',
        [categorySlug]
      );

      if (categoryResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Category not found', categorySlug }));
        return;
      }

      const categoryId = categoryResult.rows[0].id;
      console.log('[LEADERBOARD] Category UUID:', categoryId);

      // Get leaderboard entries for specific category
      // Calculate from sessions table since we don't have per-category season_points
      const result = await pool.query(`
        SELECT 
          p.stake_key,
          p.username,
          COUNT(*) * 10 as points,
          COUNT(CASE WHEN s.score = 10 THEN 1 END) as perfect_scores,
          COUNT(DISTINCT e.id) as nfts_minted,
          AVG(s.total_ms) as avg_answer_time
        FROM players p
        INNER JOIN sessions s ON p.stake_key = s.stake_key
        LEFT JOIN eligibilities e ON p.stake_key = e.stake_key AND e.category_id = s.category_id
        WHERE s.category_id = $1
        GROUP BY p.stake_key, p.username
        HAVING COUNT(*) > 0
        ORDER BY points DESC, perfect_scores DESC, avg_answer_time ASC
        LIMIT $2 OFFSET $3
      `, [categoryId, limit, offset]);

      console.log('[LEADERBOARD] Found', result.rows.length, 'category entries');

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(DISTINCT s.stake_key) as total
        FROM sessions s
        WHERE s.category_id = $1
      `, [categoryId]);

      const total = parseInt(countResult.rows[0]?.total || '0');
      const hasMore = offset + limit < total;

      const entries = result.rows.map((row, index) => ({
        rank: offset + index + 1,
        stakeKey: row.stake_key,
        username: row.username,
        points: parseInt(row.points),
        perfectScores: parseInt(row.perfect_scores),
        nftsMinted: parseInt(row.nfts_minted),
        avgAnswerTime: parseFloat(row.avg_answer_time),
      }));

      console.log('[LEADERBOARD] Returning', entries.length, 'category entries');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        leaderboard: {
          seasonId,
          categoryId: categorySlug,
          entries,
          hasMore,
          total,
        },
      }));
    } catch (error: any) {
      console.error('[LEADERBOARD] Error getting category leaderboard:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
    }
    return;
  }

  // Default 404
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
  console.log(`💾 Database: Connected to Neon`);
  console.log(`🖼️  NFT Media: Using IPFS hashes from database`);
});
