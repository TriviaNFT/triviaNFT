/**
 * Cardano Service - Real blockchain minting using Lucid + Blockfrost
 * 
 * NOTE: This requires a wallet with signing keys to actually mint.
 * For now, this will create the transaction structure but cannot submit
 * without private keys.
 * 
 * TODO: Add wallet private key management for production
 */

import { Blockfrost, Lucid, fromText } from 'lucid-cardano';

interface MintNFTParams {
  recipientAddress: string;
  policyId: string;
  assetName: string;
  metadata: {
    name: string;
    image: string;
    description?: string;
    video?: string;
    attributes?: Array<{ trait_type: string; value: string }>;
    royalty?: {
      addr: string;  // Cardano address to receive royalties
      rate: string;  // Royalty percentage as decimal (e.g., "0.05" = 5%)
    };
  };
}

interface MintResult {
  txHash: string;
  policyId: string;
  assetFingerprint: string;
  tokenName: string;
}

export class CardanoService {
  private lucid: Lucid | null = null;
  private blockfrostApiKey: string;
  private network: 'Mainnet' | 'Preprod';
  private seedPhrase: string;

  constructor() {
    this.blockfrostApiKey = process.env.BLOCKFROST_PROJECT_ID || '';
    const net = (process.env.CARDANO_NETWORK || 'preprod').toLowerCase();

    if (!this.blockfrostApiKey) {
      throw new Error('BLOCKFROST_PROJECT_ID is missing');
    }

    if (!process.env.WALLET_SEED_PHRASE) {
      throw new Error('WALLET_SEED_PHRASE is missing');
    }

    const words = process.env.WALLET_SEED_PHRASE.trim().split(/\s+/);
    if (words.length !== 24) {
      throw new Error(`WALLET_SEED_PHRASE must have 24 words, got ${words.length}`);
    }

    this.seedPhrase = process.env.WALLET_SEED_PHRASE;
    this.network = net === 'mainnet' ? 'Mainnet' : 'Preprod';
  }

  /**
   * Initialize Lucid instance with wallet
   */
  private async initLucid(): Promise<Lucid> {
    if (this.lucid) return this.lucid;

    const blockfrostUrl = `https://cardano-${this.network.toLowerCase()}.blockfrost.io/api/v0`;
    console.log('[CardanoService] Blockfrost URL:', blockfrostUrl);
    console.log('[CardanoService] Blockfrost API Key (first 10 chars):', this.blockfrostApiKey.substring(0, 10));
    console.log('[CardanoService] Network:', this.network);

    // Try the alternative Lucid initialization syntax
    this.lucid = await Lucid.new(
      new Blockfrost(blockfrostUrl, this.blockfrostApiKey),
      this.network
    );
    
    console.log('[CardanoService] Lucid initialized, loading wallet from seed...');
    console.log('[CardanoService] Seed phrase word count:', this.seedPhrase.split(' ').length);
    
    // Load wallet from seed phrase - this enables signing!
    this.lucid.selectWalletFromSeed(this.seedPhrase);

    console.log('[CardanoService] Wallet loaded successfully');
    const address = await this.lucid.wallet.address();
    console.log('[CardanoService] Wallet address:', address);
    
    // Test if we can get UTXOs (this will call Blockfrost)
    try {
      const utxos = await this.lucid.wallet.getUtxos();
      console.log('[CardanoService] Successfully fetched UTXOs from Blockfrost:', utxos.length);
    } catch (utxoError) {
      console.error('[CardanoService] Failed to fetch UTXOs:', utxoError);
      throw new Error(`Blockfrost connection test failed: ${utxoError}`);
    }

    return this.lucid;
  }

  /**
   * Create a simple signature-based minting policy
   * This policy allows the wallet owner to mint at any time
   */
  private async createMintingPolicy() {
    const lucid = await this.initLucid();
    
    // Get wallet address details
    const address = await lucid.wallet.address();
    const { paymentCredential } = lucid.utils.getAddressDetails(address);
    
    if (!paymentCredential) {
      throw new Error('Invalid wallet address');
    }

    // Create simple signature policy (wallet owner can mint)
    const mintingPolicy = lucid.utils.nativeScriptFromJson({
      type: 'sig',
      keyHash: paymentCredential.hash,
    });

    const policyId = lucid.utils.mintingPolicyToId(mintingPolicy);

    console.log('[CardanoService] Minting policy created:', policyId);
    console.log('[CardanoService] Policy script:', JSON.stringify(mintingPolicy));

    return { policyId, policy: mintingPolicy };
  }

  /**
   * Validate a Cardano address
   */
  private validateRecipientAddress(addr: string): boolean {
    try {
      if (!addr || typeof addr !== 'string') {
        return false;
      }
      // This will throw if addr is not a valid bech32 Cardano address
      this.lucid!.utils.getAddressDetails(addr);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Split long strings into chunks of max 64 characters for Cardano metadata
   * Cardano transaction metadata has a 64-character limit per string
   */
  private chunkString(str: string, maxLength: number = 64): string | string[] {
    if (str.length <= maxLength) {
      return str;
    }
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += maxLength) {
      chunks.push(str.substring(i, i + maxLength));
    }
    return chunks;
  }

  /**
   * Mint an NFT on Cardano blockchain
   */
  async mintNFT(params: MintNFTParams): Promise<MintResult> {
    try {
      console.log('[CardanoService] Starting mint for:', params.assetName);
      console.log('[CardanoService] Recipient address:', params.recipientAddress);
      
      // IMPORTANT: Reinitialize Lucid to get fresh UTXOs
      // This prevents "BadInputsUTxO" errors from stale UTXO cache
      this.lucid = null;
      const lucid = await this.initLucid();
      console.log('[CardanoService] Lucid reinitialized with fresh UTXOs');

      // Validate recipient address FIRST
      if (!params.recipientAddress || !this.validateRecipientAddress(params.recipientAddress)) {
        throw new Error(`Invalid recipient address: "${params.recipientAddress}"`);
      }
      console.log('[CardanoService] Recipient address validated ✓');

      // Create minting policy
      const { policyId, policy } = await this.createMintingPolicy();
      console.log('[CardanoService] Policy ID:', policyId);

      // Create asset name (must be hex) - clean the name first
      const cleanAssetName = params.assetName.replace(/[^a-zA-Z0-9_]/g, '');
      console.log('[CardanoService] Clean asset name:', cleanAssetName);
      
      // Convert to hex using fromText
      const assetNameHex = fromText(cleanAssetName);
      console.log('[CardanoService] Asset name (hex):', assetNameHex);
      
      // Create the full unit (policyId + assetNameHex)
      const unit = policyId + assetNameHex;
      console.log('[CardanoService] Asset unit:', unit);
      console.log('[CardanoService] Unit length:', unit.length);

      // Build CIP-25 metadata (standard NFT metadata format)
      // CIP-25 compliant metadata structure
      // When using attachMetadata(721, ...), Lucid adds the "721" label
      // So we just need the policy_id -> asset_name structure
      const metadata = {
        [policyId]: {
          [cleanAssetName]: {
            name: this.chunkString(params.metadata.name),
            image: this.chunkString(params.metadata.image),
            mediaType: 'image/png',
            ...(params.metadata.description && { 
              description: this.chunkString(params.metadata.description) 
            }),
            ...(params.metadata.video && { 
              files: [{
                name: this.chunkString(params.metadata.name + ' Video'),
                mediaType: 'video/mp4',
                src: this.chunkString(params.metadata.video),
              }]
            }),
            ...(params.metadata.attributes && { 
              attributes: params.metadata.attributes.reduce((acc, attr) => {
                acc[attr.trait_type] = this.chunkString(attr.value);
                return acc;
              }, {} as Record<string, string | string[]>)
            }),
            ...(params.metadata.royalty && { 
              royalty: {
                addr: this.chunkString(params.metadata.royalty.addr),
                rate: this.chunkString(params.metadata.royalty.rate),
              }
            }),
          },
        },
        version: '1.0', // CIP-25 version
      };

      console.log('[CardanoService] Building transaction...');
      console.log('[CardanoService] Metadata:', JSON.stringify(metadata, null, 2));
      
      // Check wallet balance first
      try {
        const utxos = await lucid.wallet.getUtxos();
        console.log('[CardanoService] Wallet UTXOs:', utxos.length);
        
        if (utxos.length === 0) {
          throw new Error('No UTXOs found - wallet needs test ADA from faucet: https://docs.cardano.org/cardano-testnet/tools/faucet/');
        }
        
        const totalAda = utxos.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n);
        console.log('[CardanoService] Wallet balance:', Number(totalAda) / 1000000, 'ADA');
        
        if (totalAda < 2000000n) { // Less than 2 ADA
          throw new Error(`Insufficient funds: ${Number(totalAda) / 1000000} ADA. Need at least 2 ADA. Get test ADA from: https://docs.cardano.org/cardano-testnet/tools/faucet/`);
        }
      } catch (balanceError: any) {
        console.error('[CardanoService] Balance check error:', balanceError);
        throw new Error(`Wallet balance check failed: ${balanceError.message}`);
      }

      // Build transaction
      console.log('[CardanoService] Creating transaction builder...');
      let tx;
      try {
        // Try fetching protocol parameters first
        console.log('[CardanoService] Fetching protocol parameters from Blockfrost...');
        try {
          const protocolParams = await lucid.provider.getProtocolParameters();
          console.log('[CardanoService] Protocol parameters fetched successfully');
          console.log('[CardanoService] Min fee A:', protocolParams.minFeeA);
          console.log('[CardanoService] Min fee B:', protocolParams.minFeeB);
        } catch (protoError) {
          console.error('[CardanoService] Failed to fetch protocol parameters:', protoError);
          throw new Error(`Protocol parameters fetch failed: ${protoError}`);
        }
        
        // Try a simpler transaction first - send ADA to SELF (backend wallet)
        console.log('[CardanoService] Testing SIMPLE ADA transaction to self...');
        try {
          const senderAddress = await lucid.wallet.address(); // backend wallet
          await lucid
            .newTx()
            .payToAddress(senderAddress, { lovelace: 2_000_000n })
            .complete();
          console.log('[CardanoService] Simple ADA transaction to self works! ✓');
        } catch (simpleError) {
          console.error('[CardanoService] Even simple ADA transaction to self fails:', simpleError);
          throw new Error(`Basic transaction building failed: ${simpleError instanceof Error ? simpleError.message : String(simpleError)}`);
        }
        
        // Now test with the actual recipient address
        console.log('[CardanoService] Testing SIMPLE ADA transaction to recipient...');
        try {
          await lucid
            .newTx()
            .payToAddress(params.recipientAddress, { lovelace: 2_000_000n })
            .complete();
          console.log('[CardanoService] Simple ADA transaction to recipient works! ✓');
        } catch (recipientError) {
          console.error('[CardanoService] ADA transaction to recipient fails:', recipientError);
          throw new Error(`Recipient address issue: ${recipientError instanceof Error ? recipientError.message : String(recipientError)}`);
        }
        
        // Try without metadata first to isolate the issue
        console.log('[CardanoService] Testing transaction WITHOUT metadata...');
        const testTxBuilder = lucid
          .newTx()
          .mintAssets({ [unit]: 1n })
          .attachMintingPolicy(policy)
          .payToAddress(params.recipientAddress, { [unit]: 1n });
        
        console.log('[CardanoService] Calling complete() on test transaction...');
        await testTxBuilder.complete();
        console.log('[CardanoService] Test transaction completed! Metadata is NOT the issue.');
        
        // Now try with metadata
        console.log('[CardanoService] Building transaction WITH metadata...');
        const txBuilder = lucid
          .newTx()
          .mintAssets({ [unit]: 1n })
          .attachMintingPolicy(policy)
          .payToAddress(params.recipientAddress, { [unit]: 1n })
          .attachMetadata(721, metadata);
        
        console.log('[CardanoService] Calling complete() to finalize transaction...');
        tx = await txBuilder.complete();
        console.log('[CardanoService] Transaction completed successfully');
      } catch (completeError: any) {
        console.error('[CardanoService] Error during tx.complete():', completeError);
        console.error('[CardanoService] Complete error type:', typeof completeError);
        console.error('[CardanoService] Complete error string:', String(completeError));
        
        // Try to get more details from the error
        if (completeError?.response) {
          console.error('[CardanoService] Blockfrost response:', completeError.response);
        }
        if (completeError?.request) {
          console.error('[CardanoService] Blockfrost request:', completeError.request);
        }
        
        throw completeError;
      }

      console.log('[CardanoService] Signing transaction...');

      // Sign transaction (wallet loaded from seed phrase)
      const signedTx = await tx.sign().complete();

      console.log('[CardanoService] Submitting to blockchain...');

      // Submit to blockchain
      const txHash = await signedTx.submit();

      console.log('[CardanoService] Transaction submitted! Hash:', txHash);

      // Calculate asset fingerprint (CIP-14)
      const assetFingerprint = unit; // Simplified - use unit as fingerprint for now

      console.log('[CardanoService] Mint successful!');
      console.log('[CardanoService] - TX Hash:', txHash);
      console.log('[CardanoService] - Policy ID:', policyId);
      console.log('[CardanoService] - Asset Fingerprint:', assetFingerprint);

      return {
        txHash,
        policyId,
        assetFingerprint,
        tokenName: params.assetName,
      };
    } catch (error: any) {
      console.error('[CardanoService] Mint error:', error);
      console.error('[CardanoService] Error type:', typeof error);
      console.error('[CardanoService] Error keys:', error ? Object.keys(error) : 'none');
      console.error('[CardanoService] Full error object:', JSON.stringify(error, null, 2));
      
      // Try to extract Blockfrost-specific error
      const errorMessage = error?.message || error?.error || error?.toString() || 'Unknown error';
      const errorDetails = error?.response?.data || error?.data || '';
      
      console.error('[CardanoService] Error message:', errorMessage);
      console.error('[CardanoService] Error details:', errorDetails);
      
      throw new Error(`Failed to mint NFT: ${errorMessage}${errorDetails ? ` - ${JSON.stringify(errorDetails)}` : ''}`);
    }
  }

  /**
   * Build an unsigned burn and mint transaction for user to sign
   * 
   * SOLUTION: Manual UTXO selection to avoid InputsExhaustedError
   * We manually select UTXOs containing the NFTs to burn + ADA for fees,
   * then build the transaction with explicit inputs/outputs.
   */
  async buildBurnAndMintTx(params: {
    burnAssets: Array<{ policyId: string; assetNameHex: string }>;
    mintAsset: MintNFTParams;
    userAddress: string;
  }): Promise<{ txCBOR: string; policyId: string; assetFingerprint: string }> {
    try {
      console.log('[CardanoService] Building unsigned burn and mint transaction...');
      console.log('[CardanoService] Burning', params.burnAssets.length, 'NFTs');
      console.log('[CardanoService] Minting 1 Ultimate NFT');
      console.log('[CardanoService] User address:', params.userAddress);

      // Step 1: Create minting policy using backend wallet
      const { policyId, policy } = await this.createMintingPolicy();
      console.log('[CardanoService] Ultimate NFT Policy ID:', policyId);

      // Step 2: Initialize Lucid with backend wallet (for signing minting policy)
      const lucid = await this.initLucid();
      
      // Step 3: Query user's UTXOs
      console.log('[CardanoService] Querying user UTXOs from:', params.userAddress);
      const userUtxos = await lucid.provider.getUtxos(params.userAddress);
      console.log('[CardanoService] Found', userUtxos.length, 'UTXOs for user');
      
      if (userUtxos.length === 0) {
        throw new Error('User has no UTXOs. Wallet may be empty or address is incorrect.');
      }

      // Step 4: Manually select UTXOs containing the NFTs to burn
      const burnUnits = params.burnAssets.map(asset => asset.policyId + asset.assetNameHex);
      console.log('[CardanoService] Looking for NFTs to burn:', burnUnits);
      
      const selectedUtxos: any[] = [];
      const selectedUtxoIds = new Set<string>(); // Track which UTXOs we've already selected
      let totalAdaSelected = 0n;
      const nftsFound = new Map<string, number>(); // Track how many of each NFT we found
      
      // Count how many of each NFT we need
      const nftsNeeded = new Map<string, number>();
      for (const burnUnit of burnUnits) {
        nftsNeeded.set(burnUnit, (nftsNeeded.get(burnUnit) || 0) + 1);
      }
      
      console.log('[CardanoService] NFTs needed:', Array.from(nftsNeeded.entries()).map(([unit, count]) => {
        const hex = unit.slice(56);
        let name = hex;
        try {
          name = Buffer.from(hex, 'hex').toString('utf8');
        } catch (e) {}
        return `${count}x ${name}`;
      }));
      
      console.log('[CardanoService] Total UTXOs to search:', userUtxos.length);
      
      // Debug: Log all NFTs in all UTXOs
      console.log('[CardanoService] Scanning all UTXOs for NFTs...');
      for (let i = 0; i < userUtxos.length; i++) {
        const utxo = userUtxos[i];
        const nftsInUtxo = Object.keys(utxo.assets).filter(k => k !== 'lovelace');
        if (nftsInUtxo.length > 0) {
          console.log(`[CardanoService] UTXO ${i + 1}: ${nftsInUtxo.length} NFTs`);
          for (const unit of nftsInUtxo) {
            const hex = unit.slice(56);
            let name = hex;
            try {
              name = Buffer.from(hex, 'hex').toString('utf8');
            } catch (e) {}
            console.log(`  - ${name} (${utxo.assets[unit]}x)`);
          }
        }
      }
      
      // Find UTXOs containing the NFTs we need to burn
      for (const utxo of userUtxos) {
        const utxoId = utxo.txHash + utxo.outputIndex;
        
        // Skip if we've already selected this UTXO
        if (selectedUtxoIds.has(utxoId)) continue;
        
        // Check if this UTXO has any NFTs we need
        let hasNeededNFT = false;
        for (const burnUnit of burnUnits) {
          const found = nftsFound.get(burnUnit) || 0;
          const needed = nftsNeeded.get(burnUnit) || 0;
          
          // If we still need this NFT and this UTXO has it
          if (found < needed && utxo.assets[burnUnit]) {
            hasNeededNFT = true;
            nftsFound.set(burnUnit, found + Number(utxo.assets[burnUnit]));
            console.log('[CardanoService] Found NFT in UTXO:', burnUnit, `(${found + 1}/${needed})`);
          }
        }
        
        // If this UTXO has NFTs we need, select it
        if (hasNeededNFT) {
          selectedUtxos.push(utxo);
          selectedUtxoIds.add(utxoId);
          totalAdaSelected += utxo.assets.lovelace || 0n;
          console.log('[CardanoService] Selected UTXO', selectedUtxos.length, '- Total ADA:', Number(totalAdaSelected) / 1_000_000);
        }
        
        // Check if we've found all NFTs
        const allFound = Array.from(nftsNeeded.entries()).every(([unit, needed]) => {
          const found = nftsFound.get(unit) || 0;
          return found >= needed;
        });
        
        if (allFound) break; // Stop searching once we have everything
      }
      
      // Verify we found all NFTs
      const missing: string[] = [];
      for (const [unit, needed] of nftsNeeded.entries()) {
        const found = nftsFound.get(unit) || 0;
        if (found < needed) {
          missing.push(unit);
        }
      }
      
      if (missing.length > 0) {
        console.log('[CardanoService] NFTs found summary:');
        for (const [unit, needed] of nftsNeeded.entries()) {
          const found = nftsFound.get(unit) || 0;
          const hex = unit.slice(56);
          let name = hex;
          try {
            name = Buffer.from(hex, 'hex').toString('utf8');
          } catch (e) {}
          console.log(`  ${name}: ${found}/${needed} ${found >= needed ? '✅' : '❌'}`);
        }
        throw new Error(`Missing NFTs in user wallet: ${missing.join(', ')}`);
      }
      
      console.log('[CardanoService] ✅ All NFTs found! Selected', selectedUtxos.length, 'UTXOs');
      
      console.log('[CardanoService] Selected', selectedUtxos.length, 'UTXOs containing NFTs');
      console.log('[CardanoService] Total ADA in selected UTXOs:', Number(totalAdaSelected) / 1_000_000, 'ADA');
      
      // Step 5: Add more UTXOs if we need more ADA for fees (estimate ~2 ADA needed)
      const minAdaNeeded = 3_000_000n; // 3 ADA to be safe
      if (totalAdaSelected < minAdaNeeded) {
        console.log('[CardanoService] Need more ADA for fees, selecting additional UTXOs...');
        
        for (const utxo of userUtxos) {
          // Skip if already selected
          if (selectedUtxos.includes(utxo)) continue;
          
          // Add this UTXO
          selectedUtxos.push(utxo);
          totalAdaSelected += utxo.assets.lovelace || 0n;
          
          console.log('[CardanoService] Added UTXO for fees, total ADA now:', Number(totalAdaSelected) / 1_000_000, 'ADA');
          
          // Stop if we have enough
          if (totalAdaSelected >= minAdaNeeded) break;
        }
        
        if (totalAdaSelected < minAdaNeeded) {
          throw new Error(`Insufficient ADA for transaction fees. Need at least ${Number(minAdaNeeded) / 1_000_000} ADA, but user only has ${Number(totalAdaSelected) / 1_000_000} ADA`);
        }
      }
      
      console.log('[CardanoService] Final selection:', selectedUtxos.length, 'UTXOs with', Number(totalAdaSelected) / 1_000_000, 'ADA');

      // Step 6: Create asset name for Ultimate NFT
      const cleanAssetName = params.mintAsset.assetName.replace(/[^a-zA-Z0-9_]/g, '');
      const assetNameHex = fromText(cleanAssetName);
      const mintUnit = policyId + assetNameHex;

      // Step 7: Build CIP-25 metadata
      // Helper to chunk strings into 64-char segments (CIP-25 limit)
      const chunkString = (str: string, maxLength: number = 64): string | string[] => {
        if (str.length <= maxLength) return str;
        const chunks: string[] = [];
        for (let i = 0; i < str.length; i += maxLength) {
          chunks.push(str.substring(i, i + maxLength));
        }
        return chunks;
      };

      // Build base metadata
      const nftMetadata: any = {
        name: params.mintAsset.metadata.name,
        image: params.mintAsset.metadata.image,
        description: params.mintAsset.metadata.description || '',
        mediaType: 'image/png',
      };

      // Add video if present
      if (params.mintAsset.metadata.video) {
        nftMetadata.video = params.mintAsset.metadata.video;
      }

      // Add files array if video is present (CIP-25 standard)
      if (params.mintAsset.metadata.video) {
        nftMetadata.files = [{
          name: `${params.mintAsset.metadata.name} Video`,
          mediaType: 'video/mp4',
          src: params.mintAsset.metadata.video,
        }];
      }

      // Add attributes (chunk long values)
      if (params.mintAsset.metadata.attributes) {
        nftMetadata.attributes = params.mintAsset.metadata.attributes.reduce((acc: any, attr) => {
          const value = typeof attr.value === 'string' 
            ? chunkString(attr.value, 64)
            : attr.value;
          acc[attr.trait_type] = value;
          return acc;
        }, {});
      }

      // Add royalty info (CIP-27) - chunk address if needed
      if (params.mintAsset.metadata.royalty) {
        nftMetadata.royalty = {
          addr: chunkString(params.mintAsset.metadata.royalty.addr, 64),
          rate: params.mintAsset.metadata.royalty.rate,
        };
      }

      const metadata = {
        [policyId]: {
          [cleanAssetName]: nftMetadata,
        },
      };

      console.log('[CardanoService] Building transaction with manual UTXO selection...');

      // Step 8: Get the burn policy (the policy used to mint the original NFTs)
      // All NFTs being burned should have the same policy ID (backend's policy)
      const burnPolicyId = params.burnAssets[0].policyId;
      console.log('[CardanoService] Burn policy ID:', burnPolicyId);
      
      // Create the burn policy script - this should be the SAME policy used to mint the original NFTs
      // Since the original NFTs were minted by the backend wallet, we need to recreate that policy
      const address = await lucid.wallet.address();
      const { paymentCredential } = lucid.utils.getAddressDetails(address);
      
      if (!paymentCredential) {
        throw new Error('Invalid backend wallet address');
      }
      
      const burnPolicy = lucid.utils.nativeScriptFromJson({
        type: 'sig',
        keyHash: paymentCredential.hash,
      });
      
      const burnPolicyIdCheck = lucid.utils.mintingPolicyToId(burnPolicy);
      console.log('[CardanoService] Burn policy recreated:', burnPolicyIdCheck);
      console.log('[CardanoService] Expected burn policy:', burnPolicyId);
      
      if (burnPolicyIdCheck !== burnPolicyId) {
        console.warn('[CardanoService] ⚠️  Burn policy mismatch! This may cause issues.');
        console.warn('[CardanoService] The NFTs were minted with a different policy than the current backend wallet.');
      }

      // Step 9: Build transaction with explicit UTXO selection
      let txBuilder = lucid
        .newTx()
        .attachMintingPolicy(policy) // For minting the NEW Ultimate NFT
        .attachMintingPolicy(burnPolicy); // For burning the OLD NFTs

      // Add the selected UTXOs as inputs
      for (const utxo of selectedUtxos) {
        txBuilder = txBuilder.collectFrom([utxo]);
      }

      // Add minting of new Ultimate NFT (positive amount = mint)
      txBuilder = txBuilder.mintAssets({ [mintUnit]: 1n });

      // Add burning of input NFTs (negative amount = burn)
      for (const burnAsset of params.burnAssets) {
        const burnUnit = burnAsset.policyId + burnAsset.assetNameHex;
        console.log('[CardanoService] Adding burn for asset (hex):', burnAsset.assetNameHex);
        txBuilder = txBuilder.mintAssets({ [burnUnit]: -1n });
      }

      // Pay the new Ultimate NFT to user
      txBuilder = txBuilder
        .payToAddress(params.userAddress, { [mintUnit]: 1n })
        .attachMetadata(721, metadata);

      console.log('[CardanoService] Completing transaction...');
      const tx = await txBuilder.complete();

      // Get transaction CBOR (unsigned)
      const txCBOR = tx.toString();
      console.log('[CardanoService] Unsigned transaction built successfully');
      console.log('[CardanoService] TX CBOR length:', txCBOR.length);

      const assetFingerprint = mintUnit;

      return {
        txCBOR,
        policyId,
        assetFingerprint,
      };
    } catch (error: any) {
      console.error('[CardanoService] Build transaction error:', error);
      console.error('[CardanoService] Error details:', {
        message: error?.message,
        stack: error?.stack,
        type: error?.constructor?.name,
      });
      throw new Error(`Failed to build burn and mint transaction: ${error?.message || error}`);
    }
  }

  /**
   * Burn multiple NFTs and mint a new Ultimate NFT in a single transaction
   * (Backend-signed version - requires backend to own the NFTs)
   */
  async burnAndMintNFT(params: {
    burnAssets: Array<{ policyId: string; assetNameHex: string }>;
    mintAsset: MintNFTParams;
  }): Promise<MintResult> {
    try {
      console.log('[CardanoService] Starting burn and mint transaction...');
      console.log('[CardanoService] Burning', params.burnAssets.length, 'NFTs');
      console.log('[CardanoService] Minting 1 Ultimate NFT');

      // Reinitialize Lucid to get fresh UTXOs
      this.lucid = null;
      const lucid = await this.initLucid();

      // Check what UTXOs we have
      const utxos = await lucid.wallet.getUtxos();
      console.log('[CardanoService] Wallet has', utxos.length, 'UTXOs');
      console.log('[CardanoService] UTXO assets:', utxos.map(u => Object.keys(u.assets)));

      // Create minting policy for the new Ultimate NFT
      const { policyId, policy } = await this.createMintingPolicy();
      console.log('[CardanoService] Ultimate NFT Policy ID:', policyId);

      // Create asset name for Ultimate NFT
      const cleanAssetName = params.mintAsset.assetName.replace(/[^a-zA-Z0-9_]/g, '');
      const assetNameHex = fromText(cleanAssetName);
      const mintUnit = policyId + assetNameHex;

      // Build CIP-25 metadata for Ultimate NFT
      const metadata = {
        [policyId]: {
          [cleanAssetName]: {
            name: params.mintAsset.metadata.name,
            image: params.mintAsset.metadata.image,
            description: params.mintAsset.metadata.description || '',
            mediaType: 'image/png',
            ...(params.mintAsset.metadata.video && { video: params.mintAsset.metadata.video }),
            ...(params.mintAsset.metadata.attributes && {
              attributes: params.mintAsset.metadata.attributes.reduce((acc: any, attr) => {
                acc[attr.trait_type] = attr.value;
                return acc;
              }, {}),
            }),
          },
        },
      };

      console.log('[CardanoService] Building burn and mint transaction...');

      // Start transaction builder
      let txBuilder = lucid
        .newTx()
        .attachMintingPolicy(policy);

      // Add minting of new Ultimate NFT (positive amount = mint)
      txBuilder = txBuilder.mintAssets({ [mintUnit]: 1n });

      // Add burning of input NFTs (negative amount = burn)
      for (const burnAsset of params.burnAssets) {
        const burnUnit = burnAsset.policyId + burnAsset.assetNameHex;
        console.log('[CardanoService] Adding burn for asset (hex):', burnAsset.assetNameHex);
        txBuilder = txBuilder.mintAssets({ [burnUnit]: -1n });
      }

      // Pay the new Ultimate NFT to recipient
      txBuilder = txBuilder
        .payToAddress(params.mintAsset.recipientAddress, { [mintUnit]: 1n })
        .attachMetadata(721, metadata);

      console.log('[CardanoService] Completing transaction...');
      const tx = await txBuilder.complete();

      console.log('[CardanoService] Signing transaction...');
      const signedTx = await tx.sign().complete();

      console.log('[CardanoService] Submitting transaction...');
      const txHash = await signedTx.submit();

      console.log('[CardanoService] Burn and mint transaction submitted! Hash:', txHash);

      const assetFingerprint = mintUnit;

      return {
        txHash,
        policyId,
        assetFingerprint,
        tokenName: params.mintAsset.assetName,
      };
    } catch (error: any) {
      console.error('[CardanoService] Burn and mint error:', error);
      throw new Error(`Failed to burn and mint: ${error?.message || error}`);
    }
  }

  /**
   * Check if a transaction is confirmed
   */
  async isTransactionConfirmed(txHash: string): Promise<boolean> {
    try {
      const lucid = await this.initLucid();
      // Wait for confirmation (simplified)
      await lucid.awaitTx(txHash);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash: string) {
    const lucid = await this.initLucid();
    return await lucid.awaitTx(txHash);
  }
}

// Export singleton instance (lazy initialization)
let _cardanoService: CardanoService | null = null;

export const cardanoService = {
  async mintNFT(params: MintNFTParams): Promise<MintResult> {
    if (!_cardanoService) {
      _cardanoService = new CardanoService();
    }
    return _cardanoService.mintNFT(params);
  },
  
  async buildBurnAndMintTx(params: {
    burnAssets: Array<{ policyId: string; assetNameHex: string }>;
    mintAsset: MintNFTParams;
    userAddress: string;
  }): Promise<{ txCBOR: string; policyId: string; assetFingerprint: string }> {
    if (!_cardanoService) {
      _cardanoService = new CardanoService();
    }
    return _cardanoService.buildBurnAndMintTx(params);
  },
  
  async burnAndMintNFT(params: {
    burnAssets: Array<{ policyId: string; assetNameHex: string }>;
    mintAsset: MintNFTParams;
  }): Promise<MintResult> {
    if (!_cardanoService) {
      _cardanoService = new CardanoService();
    }
    return _cardanoService.burnAndMintNFT(params);
  },
  
  async isTransactionConfirmed(txHash: string): Promise<boolean> {
    if (!_cardanoService) {
      _cardanoService = new CardanoService();
    }
    return _cardanoService.isTransactionConfirmed(txHash);
  },
  
  async getTransaction(txHash: string) {
    if (!_cardanoService) {
      _cardanoService = new CardanoService();
    }
    return _cardanoService.getTransaction(txHash);
  },
};
