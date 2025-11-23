import React from 'react';
import { View, Text, Platform } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Import SVG icons as strings for react-native-svg
const KEY_SVG = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="35" cy="35" r="20" stroke="currentColor" stroke-width="4" fill="none"/>
  <circle cx="35" cy="35" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
  <line x1="48" y1="48" x2="95" y2="95" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <line x1="75" y1="75" x2="75" y2="85" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <line x1="85" y1="85" x2="85" y2="95" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <line x1="95" y1="95" x2="95" y2="105" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const GHOST_SVG = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M30 50 C30 30, 90 30, 90 50 L90 90 L80 85 L70 90 L60 85 L50 90 L40 85 L30 90 Z" 
        stroke="currentColor" stroke-width="4" fill="none" stroke-linejoin="round"/>
  <circle cx="45" cy="50" r="5" fill="currentColor"/>
  <circle cx="75" cy="50" r="5" fill="currentColor"/>
  <path d="M50 65 Q60 70 70 65" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`;

const TRIDENT_SVG = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="60" y1="20" x2="60" y2="100" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <line x1="40" y1="20" x2="40" y2="50" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <line x1="80" y1="20" x2="80" y2="50" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path d="M40 50 Q50 60 60 50" stroke="currentColor" stroke-width="4" fill="none"/>
  <path d="M60 50 Q70 60 80 50" stroke="currentColor" stroke-width="4" fill="none"/>
  <line x1="50" y1="95" x2="70" y2="95" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <line x1="55" y1="100" x2="65" y2="100" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
</svg>`;

interface NFTCardProps {
  icon: 'question' | 'celebration' | 'hourglass';
  imageSrc: string;
  glowColor: string;
  rotation: number;
  zIndex: number;
}

export function NFTCard({ icon, imageSrc, glowColor, rotation, zIndex }: NFTCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Calculate hover rotation (add ±2deg to base rotation)
  const hoverRotation = rotation + (rotation < 0 ? -2 : rotation > 0 ? 2 : 0);

  return (
    <View
      onPointerEnter={() => Platform.OS === 'web' && setIsHovered(true)}
      onPointerLeave={() => Platform.OS === 'web' && setIsHovered(false)}
      style={{
        position: 'absolute',
        width: 240,
        height: 340,
        zIndex,
        transform: [
          { rotate: `${isHovered ? hoverRotation : rotation}deg` },
        ],
      }}
      // Responsive sizing: smaller on mobile (≤640px), full size on tablet/desktop
      className="w-[180px] h-[255px] md:w-[220px] md:h-[312px] lg:w-[240px] lg:h-[340px]"
    >
      {/* Card container with frosted finish and neon glow */}
      <View
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 16,
          borderWidth: 3,
          borderColor: glowColor,
          backgroundColor: 'rgba(18, 26, 42, 0.6)',
          // Multi-layer box shadows
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.4,
          shadowRadius: 40,
          elevation: 20,
        }}
        className={prefersReducedMotion ? '' : 'animate-float'}
      >
        {/* Frosted overlay with white tint */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />

        {/* Inner highlight */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        />

        {/* Outer glow effect - stronger on desktop */}
        <View
          style={{
            position: 'absolute',
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: 16,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isHovered ? 0.8 : 0.6,
            shadowRadius: isHovered ? 50 : 40,
          }}
          className={`${prefersReducedMotion ? '' : 'animate-glow-pulse'} lg:shadow-[0_0_50px] md:shadow-[0_0_35px] shadow-[0_0_25px]`}
        />

        {/* Card content */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          {/* Card Image */}
          {Platform.OS === 'web' ? (
            <img
              src={imageSrc}
              alt={`${icon} card`}
              loading="eager"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: 16,
              }}
            />
          ) : (
            <View
              style={{
                width: 120,
                height: 120,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: glowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
              }}
            >
              <SvgXml
                xml={KEY_SVG}
                width={120}
                height={120}
                color={glowColor}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
