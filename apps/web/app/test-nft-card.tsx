import React from 'react';
import { View } from 'react-native';
import { NFTCard } from '../src/components/landing/NFTCard';

export default function TestNFTCard() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0B1220',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
    >
      {/* Test all three card types */}
      <View style={{ position: 'relative', width: 600, height: 400 }}>
        <NFTCard
          icon="key"
          glowColor="#8A5CF6"
          rotation={-8}
          zIndex={1}
        />
        <NFTCard
          icon="ghost"
          glowColor="#22D3EE"
          rotation={0}
          zIndex={2}
        />
        <NFTCard
          icon="trident"
          glowColor="#A3E635"
          rotation={8}
          zIndex={3}
        />
      </View>
    </View>
  );
}
