// apps/web/app/whitepaper.tsx
import React from 'react';
import { View, Text, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Navigation } from '../src/components/landing/Navigation';
import { Footer } from '../src/components/landing/Footer';
import { useAuth } from '../src/contexts';

export default function Whitepaper() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { wallet, isAuthenticated, player, disconnectWallet } = useAuth();
  const [showWalletModal, setShowWalletModal] = React.useState(false);
  
  const isMobile = width <= 768;

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
      {/* Navigation */}
      <Navigation
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        isWalletConnected={isAuthenticated}
        walletAddress={wallet?.address}
        username={player?.username}
      />

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: isMobile ? 16 : 48,
          paddingTop: isMobile ? 100 : 120,
          paddingBottom: 48,
        }}
      >
        <View
          style={{
            maxWidth: 900,
            marginHorizontal: 'auto',
            width: '100%',
          }}
        >
          {/* Header */}
          <View style={{ marginBottom: 48 }}>
            <Text
              style={{
                fontSize: isMobile ? 32 : 48,
                fontWeight: '700',
                color: '#EAF2FF',
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              TriviaNFT Whitepaper
            </Text>
            <Text
              style={{
                fontSize: 18,
                color: '#9CA3AF',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              A Blockchain-Powered Trivia Platform on Cardano
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#6B7280',
                textAlign: 'center',
              }}
            >
              Version 1.0 | November 2025
            </Text>
          </View>

          {/* Content Sections */}
          <WhitepaperContent isMobile={isMobile} />
        </View>
      </ScrollView>

      {/* Footer */}
      <Footer />
    </View>
  );
}

function WhitepaperContent({ isMobile }: { isMobile: boolean }) {
  const sectionStyle = {
    marginBottom: 40,
  };

  const headingStyle = {
    fontSize: isMobile ? 24 : 32,
    fontWeight: '700' as const,
    color: '#EAF2FF',
    marginBottom: 16,
  };

  const subheadingStyle = {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '600' as const,
    color: '#C4B5FD',
    marginBottom: 12,
    marginTop: 24,
  };

  const paragraphStyle = {
    fontSize: 16,
    lineHeight: 28,
    color: '#D1D5DB',
    marginBottom: 16,
  };

  const listItemStyle = {
    fontSize: 16,
    lineHeight: 28,
    color: '#D1D5DB',
    marginBottom: 8,
    paddingLeft: 20,
  };

  return (
    <View>
      {/* Executive Summary */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>Executive Summary</Text>
        <Text style={paragraphStyle}>
          TriviaNFT combines the excitement of trivia gaming with blockchain technology to create a unique play-to-earn experience on the Cardano network. Players test their knowledge across diverse categories, earning NFT rewards for perfect gameplay and competing for seasonal prizes.
        </Text>
      </View>

      {/* Introduction */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>Introduction</Text>
        
        <Text style={subheadingStyle}>What is TriviaNFT?</Text>
        <Text style={paragraphStyle}>
          TriviaNFT is a decentralized trivia gaming platform where knowledge meets blockchain rewards. By answering questions correctly, players earn collectible NFTs that represent their achievements and can be combined to create increasingly rare Ultimate NFTs.
        </Text>

        <Text style={subheadingStyle}>Why Cardano?</Text>
        <Text style={paragraphStyle}>We chose Cardano for its:</Text>
        <Text style={listItemStyle}>• Low transaction fees: Affordable minting and burning operations</Text>
        <Text style={listItemStyle}>• Energy efficiency: Proof-of-stake consensus with minimal environmental impact</Text>
        <Text style={listItemStyle}>• Security: Peer-reviewed blockchain architecture</Text>
        <Text style={listItemStyle}>• Scalability: Growing ecosystem with robust infrastructure</Text>
      </View>

      {/* How It Works */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>How It Works</Text>

        <Text style={subheadingStyle}>1. Connect Your Wallet</Text>
        <Text style={paragraphStyle}>
          Start by connecting any CIP-30 compatible Cardano wallet (Nami, Eternl, Flint, etc.). Your wallet address serves as your unique player identity—no email or personal information required.
        </Text>

        <Text style={subheadingStyle}>2. Choose Your Category</Text>
        <Text style={paragraphStyle}>Select from 9 diverse trivia categories:</Text>
        <Text style={listItemStyle}>• Science & Nature</Text>
        <Text style={listItemStyle}>• History</Text>
        <Text style={listItemStyle}>• Geography</Text>
        <Text style={listItemStyle}>• Arts & Literature</Text>
        <Text style={listItemStyle}>• Sports & Recreation</Text>
        <Text style={listItemStyle}>• Entertainment</Text>
        <Text style={listItemStyle}>• Technology</Text>
        <Text style={listItemStyle}>• General Knowledge</Text>
        <Text style={listItemStyle}>• Pop Culture</Text>

        <Text style={subheadingStyle}>3. Play a Session</Text>
        <Text style={paragraphStyle}>Each trivia session consists of:</Text>
        <Text style={listItemStyle}>• 10 questions from your chosen category</Text>
        <Text style={listItemStyle}>• 10 seconds per question to answer</Text>
        <Text style={listItemStyle}>• Real-time feedback on your performance</Text>
        <Text style={listItemStyle}>• Instant scoring at the end</Text>

        <Text style={subheadingStyle}>4. Earn NFT Eligibility</Text>
        <Text style={paragraphStyle}>
          Achieve a perfect score (10/10) to unlock a 1-hour mint eligibility for that category's NFT, points toward seasonal leaderboards, and progress toward Ultimate NFT forging.
        </Text>

        <Text style={subheadingStyle}>5. Mint Your NFT</Text>
        <Text style={paragraphStyle}>
          During your eligibility window, navigate to the Mint page, review your eligible NFTs, pay only the Cardano network transaction fee, and receive your NFT directly to your wallet.
        </Text>

        <Text style={subheadingStyle}>6. Forge Ultimate NFTs</Text>
        <Text style={paragraphStyle}>Collect multiple NFTs to forge higher-tier rewards:</Text>
        <Text style={listItemStyle}>• Category Ultimate (Tier 2): Burn 3 NFTs from the same category</Text>
        <Text style={listItemStyle}>• Master Ultimate (Tier 3): Burn 3 Category Ultimate NFTs from different categories</Text>
        <Text style={listItemStyle}>• Seasonal Ultimate (Tier 4): Burn 3 Master Ultimate NFTs</Text>
      </View>

      {/* Game Mechanics */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>Game Mechanics</Text>

        <Text style={subheadingStyle}>Daily Limits</Text>
        <Text style={paragraphStyle}>
          To ensure fair play: 10 sessions per day maximum, cooldown period between sessions, and limits reset at midnight UTC.
        </Text>

        <Text style={subheadingStyle}>Scoring System</Text>
        <Text style={paragraphStyle}>Points are awarded based on:</Text>
        <Text style={listItemStyle}>• Correct answers: Base points per question</Text>
        <Text style={listItemStyle}>• Perfect scores: Bonus multiplier</Text>
        <Text style={listItemStyle}>• Streak bonuses: Consecutive perfect sessions</Text>
        <Text style={listItemStyle}>• Category diversity: Playing across multiple categories</Text>

        <Text style={subheadingStyle}>Leaderboards</Text>
        <Text style={paragraphStyle}>
          Compete in daily, weekly, seasonal, and all-time rankings. Top performers earn recognition badges, exclusive NFT airdrops, seasonal prize pools, and community status.
        </Text>
      </View>

      {/* NFT Economics */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>NFT Economics</Text>

        <Text style={subheadingStyle}>Minting</Text>
        <Text style={listItemStyle}>• Cost: Only Cardano network transaction fees (~1-2 ADA)</Text>
        <Text style={listItemStyle}>• Supply: Unlimited minting for perfect scores</Text>
        <Text style={listItemStyle}>• Eligibility: 1-hour window after perfect score</Text>
        <Text style={listItemStyle}>• Metadata: Stored on IPFS for permanence</Text>

        <Text style={subheadingStyle}>Burning (Forging)</Text>
        <Text style={listItemStyle}>• Irreversible: Burned NFTs are permanently destroyed</Text>
        <Text style={listItemStyle}>• Value creation: Lower-tier NFTs become higher-tier NFTs</Text>
        <Text style={listItemStyle}>• Scarcity: Reduces total supply over time</Text>
        <Text style={listItemStyle}>• Progression: Clear path from Tier 1 to Tier 4</Text>
      </View>

      {/* Security */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>Security & Fair Play</Text>

        <Text style={subheadingStyle}>Wallet Authentication</Text>
        <Text style={paragraphStyle}>
          Cryptographic signatures prove wallet ownership, JWT tokens secure session management, and no passwords are required—wallet-based authentication only.
        </Text>

        <Text style={subheadingStyle}>Anti-Cheat Measures</Text>
        <Text style={listItemStyle}>• Server-side validation: All answers verified on backend</Text>
        <Text style={listItemStyle}>• Time limits: Enforced server-side</Text>
        <Text style={listItemStyle}>• Rate limiting: Prevents automated abuse</Text>
        <Text style={listItemStyle}>• Session integrity: Cryptographic session tokens</Text>
      </View>

      {/* Roadmap */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>Roadmap</Text>

        <Text style={subheadingStyle}>Phase 1: Launch (Q4 2025)</Text>
        <Text style={listItemStyle}>✅ Core trivia gameplay</Text>
        <Text style={listItemStyle}>✅ NFT minting and forging</Text>
        <Text style={listItemStyle}>✅ Basic leaderboards</Text>
        <Text style={listItemStyle}>✅ Web PWA release</Text>

        <Text style={subheadingStyle}>Phase 2: Mobile & Features (Q1 2026)</Text>
        <Text style={listItemStyle}>📱 Native mobile apps (iOS/Android)</Text>
        <Text style={listItemStyle}>🎮 Multiplayer trivia battles</Text>
        <Text style={listItemStyle}>🏆 Enhanced seasonal competitions</Text>
        <Text style={listItemStyle}>🎁 Community voting on categories</Text>

        <Text style={subheadingStyle}>Phase 3: Expansion (Q2 2026)</Text>
        <Text style={listItemStyle}>🌍 Multi-language support</Text>
        <Text style={listItemStyle}>🎨 Custom NFT artwork contests</Text>
        <Text style={listItemStyle}>🤝 Partnership integrations</Text>
        <Text style={listItemStyle}>💰 Staking and governance</Text>
      </View>

      {/* FAQ */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>FAQ</Text>

        <Text style={subheadingStyle}>Do I need cryptocurrency to play?</Text>
        <Text style={paragraphStyle}>
          You need a small amount of ADA (~5-10) to mint NFTs and pay transaction fees. Playing trivia is free.
        </Text>

        <Text style={subheadingStyle}>What wallets are supported?</Text>
        <Text style={paragraphStyle}>
          Any CIP-30 compatible Cardano wallet (Nami, Eternl, Flint, Typhon, etc.).
        </Text>

        <Text style={subheadingStyle}>Can I play without minting NFTs?</Text>
        <Text style={paragraphStyle}>
          Yes! You can play trivia and compete on leaderboards without minting.
        </Text>

        <Text style={subheadingStyle}>Can I sell my NFTs?</Text>
        <Text style={paragraphStyle}>
          Yes, on any Cardano NFT marketplace that supports our policy ID.
        </Text>
      </View>

      {/* Contact */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>Contact & Resources</Text>
        <Text style={paragraphStyle}>
          Support: support@trivianft.io{'\n'}
          Partnerships: partnerships@trivianft.io{'\n'}
          Press: press@trivianft.io
        </Text>
      </View>

      {/* Conclusion */}
      <View style={sectionStyle}>
        <Text style={headingStyle}>Conclusion</Text>
        <Text style={paragraphStyle}>
          TriviaNFT represents a new paradigm in gaming—where knowledge is rewarded with tangible, tradeable digital assets. By combining engaging trivia gameplay with Cardano's robust blockchain infrastructure, we're creating a sustainable play-to-earn ecosystem that values skill, strategy, and community.
        </Text>
        <Text style={paragraphStyle}>
          Whether you're a trivia enthusiast, NFT collector, or blockchain gamer, TriviaNFT offers a unique experience that rewards your knowledge and participation.
        </Text>
        <Text style={{ ...paragraphStyle, fontWeight: '600', color: '#C4B5FD', textAlign: 'center', marginTop: 24 }}>
          Join us in building the future of blockchain gaming.
        </Text>
      </View>

      {/* Footer Note */}
      <View style={{ marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(138, 92, 246, 0.2)' }}>
        <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' }}>
          This whitepaper is subject to updates as the platform evolves.{'\n'}
          Last updated: November 16, 2025
        </Text>
      </View>
    </View>
  );
}
