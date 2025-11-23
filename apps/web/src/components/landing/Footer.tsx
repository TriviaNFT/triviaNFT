import React from 'react';
import { View, Text, Pressable, Linking, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useResponsive } from '../../hooks/useResponsive';

// Social Media Icons
const TwitterIcon = ({ color = '#EAF2FF' }: { color?: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
    <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </Svg>
);

const DiscordIcon = ({ color = '#EAF2FF' }: { color?: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
    <Path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
  </Svg>
);

const TelegramIcon = ({ color = '#EAF2FF' }: { color?: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
    <Path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z" />
  </Svg>
);

const TikTokIcon = ({ color = '#EAF2FF' }: { color?: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
    <Path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </Svg>
);

interface SocialLink {
  name: string;
  url: string;
  icon: React.ReactNode;
}

const socialLinks: SocialLink[] = [
  {
    name: 'Twitter',
    url: 'https://x.com/TriviaNft21269',
    icon: <TwitterIcon />,
  },
  {
    name: 'Discord',
    url: 'https://discord.gg/YFjMJvKH',
    icon: <DiscordIcon />,
  },
  {
    name: 'Telegram',
    url: 'https://t.me/+NRxPnc7W2l1iNWMx',
    icon: <TelegramIcon />,
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@trivianft',
    icon: <TikTokIcon />,
  },
];

export function Footer() {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [hoveredIcon, setHoveredIcon] = React.useState<string | null>(null);

  const handleSocialPress = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  // Get network from env
  const network = process.env.EXPO_PUBLIC_CARDANO_NETWORK || 'preprod';

  // Responsive sizing
  const verticalPadding = isMobile ? 24 : isTablet ? 28 : 32;
  const horizontalPadding = isMobile ? 16 : isTablet ? 32 : 48;
  const gap = isMobile ? 16 : isTablet ? 20 : 24;
  const iconSize = 44; // Ensure minimum touch target size

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: 'rgba(138, 92, 246, 0.2)',
        paddingVertical: verticalPadding,
        paddingHorizontal: horizontalPadding,
      }}
    >
      <View
        style={{
          maxWidth: 1280,
          marginHorizontal: 'auto',
          width: '100%',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: isMobile ? 'center' : 'space-between',
          alignItems: 'center',
          gap: gap,
        }}
      >
        {/* Copyright Text + Cardano Badge */}
        <View style={{ alignItems: isMobile ? 'center' : 'flex-start', gap: 8 }}>
          <Text
            style={{
              fontSize: isMobile ? 13 : 14,
              color: '#D1D5DB',
              textAlign: isMobile ? 'center' : 'left',
            }}
          >
            © {new Date().getFullYear()} TriviaNFT. All rights reserved.
          </Text>
          <Text
            style={{
              fontSize: isMobile ? 11 : 12,
              color: '#9CA3AF',
              textAlign: isMobile ? 'center' : 'left',
            }}
          >
            Built on Cardano • {network === 'mainnet' ? 'Mainnet' : 'Preprod'}
          </Text>
        </View>

        {/* Social Links */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: isMobile ? 10 : 12,
          }}
        >
          {socialLinks.map((social) => (
            <Pressable
              key={social.name}
              onPress={() => handleSocialPress(social.url)}
              onHoverIn={() => setHoveredIcon(social.name)}
              onHoverOut={() => setHoveredIcon(null)}
              accessibilityRole="link"
              accessibilityLabel={`Visit our ${social.name}`}
              style={{
                width: iconSize,
                height: iconSize,
                minWidth: 44, // Ensure minimum touch target
                minHeight: 44, // Ensure minimum touch target
                borderRadius: iconSize / 2,
                backgroundColor: hoveredIcon === social.name
                  ? 'rgba(34, 211, 238, 0.2)'
                  : 'rgba(138, 92, 246, 0.1)',
                borderWidth: 1,
                borderColor: hoveredIcon === social.name
                  ? '#22D3EE'
                  : 'rgba(138, 92, 246, 0.3)',
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ scale: hoveredIcon === social.name && isDesktop ? 1.1 : 1 }],
                shadowColor: hoveredIcon === social.name ? '#22D3EE' : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: hoveredIcon === social.name ? 0.6 : 0,
                shadowRadius: hoveredIcon === social.name ? 12 : 0,
                ...(Platform.OS === 'web' && {
                  // @ts-ignore - Web-only CSS property
                  transition: 'all 0.2s ease',
                  // @ts-ignore - Web-only CSS property
                  boxShadow: hoveredIcon === social.name ? '0 0 16px rgba(34, 211, 238, 0.6)' : 'none',
                }),
              }}
            >
              <View style={{ opacity: hoveredIcon === social.name ? 1 : 0.8 }}>
                {React.cloneElement(social.icon as React.ReactElement, {
                  color: hoveredIcon === social.name ? '#22D3EE' : '#EAF2FF',
                })}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
