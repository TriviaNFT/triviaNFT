import React from 'react';
import { View } from 'react-native';
import { NFTCard } from './NFTCard';

// Card configuration array with 3 cards
const CARD_CONFIG = [

  {
    id: 'celebration-card',
    icon: 'celebration' as const,
    imageSrc: '/card-celebration.svg',
    glowColor: '#22D3EE', // Cyan
    rotation: 0,
    zIndex: 2,
  },
  {
    id: 'hourglass-card',
    icon: 'hourglass' as const,
    imageSrc: '/card-hourglass.svg',
    glowColor: '#A3E635', // Lime
    rotation: 8,
    zIndex: 3,
  },

    {
    id: 'question-card',
    icon: 'question' as const,
    imageSrc: '/card-question.svg',
    glowColor: '#8A5CF6', // Violet
    rotation: -8,
    zIndex: 1,
  },
  
];

export function NFTCardShowcase() {
  return (
    <View
      accessibilityLabel="Three neon-edged collectible cards: key, mascot, and trident"
      accessibilityRole="img"
      style={{
        position: 'relative',
        width: '100%',
        height: 400,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      // Responsive height: smaller on mobile, medium on tablet, full on desktop
      className="h-[280px] md:h-[340px] lg:h-[400px]"
    >
      {/* Container for fanned card arrangement */}
      <View
        style={{
          position: 'relative',
          width: 300,
          height: 340,
        }}
        // Responsive sizing for card container
        className="w-[200px] h-[255px] md:w-[260px] md:h-[312px] lg:w-[300px] lg:h-[340px]"
      >
        {CARD_CONFIG.map((card) => (
          <View
            key={card.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: -120, // Half of card width (240px / 2)
              marginTop: -170, // Half of card height (340px / 2)
            }}
            // Responsive centering: adjust margins based on card size
            className="-ml-[90px] -mt-[127.5px] md:-ml-[110px] md:-mt-[156px] lg:-ml-[120px] lg:-mt-[170px]"
          >
            <NFTCard
              icon={card.icon}
              imageSrc={card.imageSrc}
              glowColor={card.glowColor}
              rotation={card.rotation}
              zIndex={card.zIndex}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
