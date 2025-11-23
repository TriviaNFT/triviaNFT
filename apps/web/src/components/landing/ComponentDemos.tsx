import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useRouter, Href } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { DemoCard } from './DemoCard';

// Simple icon components using react-native-svg
const LockIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A5CF6" strokeWidth="2" accessibilityLabel="Lock icon">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

const GamepadIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A5CF6" strokeWidth="2" accessibilityLabel="Gamepad icon">
    <Path d="M6 12h4m2 0h4M12 6v4m0 2v4" />
    <Rect x="4" y="4" width="16" height="16" rx="4" />
  </Svg>
);

const DiamondIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A5CF6" strokeWidth="2" accessibilityLabel="Diamond icon">
    <Path d="M12 2L2 7l10 15 10-15-10-5z" />
    <Path d="M2 7h20M12 22V7" />
  </Svg>
);

const TrophyIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A5CF6" strokeWidth="2" accessibilityLabel="Trophy icon">
    <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <Path d="M6 9a6 6 0 0 0 12 0M12 15v6M8 21h8" />
  </Svg>
);

const StarIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A5CF6" strokeWidth="2" accessibilityLabel="Star icon">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const UserIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A5CF6" strokeWidth="2" accessibilityLabel="User icon">
    <Circle cx="12" cy="8" r="5" />
    <Path d="M3 21c0-4.418 4.03-8 9-8s9 3.582 9 8" />
  </Svg>
);

interface Demo {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  path: Href<string>;
}

const COMPONENT_DEMOS: Demo[] = [
  {
    id: 'minting',
    title: 'Minting',
    description: 'NFT minting & inventory',
    path: '/mint-demo',
    icon: <DiamondIcon />,
  },
  {
    id: 'forging',
    title: 'Forging',
    description: 'NFT forging mechanics',
    path: '/forge-demo',
    icon: <TrophyIcon />,
  },
];

export function ComponentDemos() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Determine breakpoints (mobile ≤640px, tablet 641-1024px, desktop ≥1024px)
  const isMobile = width <= 640;
  const isTablet = width > 640 && width <= 1024;
  const isDesktop = width > 1024;

  const handleDemoPress = (path: Href<string>) => {
    router.push(path);
  };

  // Calculate responsive spacing and layout
  const horizontalPadding = isMobile ? 16 : isTablet ? 32 : 48;
  const gap = isMobile ? 12 : isTablet ? 16 : 24;
  
  // Calculate card width for responsive grid
  // Mobile: 100%, Tablet/Desktop: ~50% accounting for gap
  const cardWidth = isMobile 
    ? width - (horizontalPadding * 2) 
    : (width > 1200 ? 560 : (width - (horizontalPadding * 2) - gap) / 2);

  return (
    <View
      style={{
        paddingHorizontal: horizontalPadding,
        paddingVertical: isMobile ? 40 : isTablet ? 56 : 80,
      }}
    >
      {/* Section Heading */}
      <Text
        style={{
          fontSize: isMobile ? 24 : isTablet ? 28 : 32,
          fontWeight: '700',
          color: '#EAF2FF',
          marginBottom: isMobile ? 24 : isTablet ? 28 : 32,
          textAlign: 'center',
        }}
        accessibilityRole="header"
      >
        Component Demos
      </Text>

      {/* Responsive Grid */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: gap,
          justifyContent: 'center',
          maxWidth: isDesktop ? 1200 : '100%',
          marginHorizontal: 'auto',
          alignSelf: 'center',
        }}
      >
        {COMPONENT_DEMOS.map((demo) => (
          <View
            key={demo.id}
            style={{
              width: cardWidth,
            }}
          >
            <DemoCard
              icon={demo.icon}
              title={demo.title}
              description={demo.description}
              onPress={() => handleDemoPress(demo.path)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
