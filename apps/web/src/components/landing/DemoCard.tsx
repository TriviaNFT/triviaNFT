import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';

interface DemoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}

export function DemoCard({ icon, title, description, onPress }: DemoCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPointerEnter={() => Platform.OS === 'web' && setIsHovered(true)}
      onPointerLeave={() => Platform.OS === 'web' && setIsHovered(false)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${description}`}
      style={{
        minHeight: 48, // Increased from 44 for better touch target
        minWidth: 48,
      }}
    >
      <View
        style={{
          borderRadius: 20,
          backgroundColor: 'rgba(18, 26, 42, 0.5)',
          borderWidth: 1,
          borderColor: isHovered || isFocused ? 'rgba(138, 92, 246, 0.5)' : 'rgba(39, 50, 74, 0.3)',
          padding: 24,
          // Box shadow for depth
          shadowColor: '#000',
          shadowOffset: { width: 0, height: isHovered ? 12 : 8 },
          shadowOpacity: 0.3,
          shadowRadius: isHovered ? 48 : 32,
          elevation: isHovered ? 12 : 8,
          // Transform for hover effect
          transform: [
            { translateY: isHovered ? -4 : 0 },
            { scale: isHovered ? 1.02 : 1 },
          ],
        }}
        className="backdrop-blur-glass transition-all duration-150 ease-out"
      >
        {/* Inner glow */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        />

        {/* Enhanced glow on hover/focus */}
        {(isHovered || isFocused) && (
          <View
            style={{
              position: 'absolute',
              top: -1,
              left: -1,
              right: -1,
              bottom: -1,
              borderRadius: 20,
              shadowColor: '#8A5CF6',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 24,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Focus ring for keyboard navigation */}
        {isFocused && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              left: -4,
              right: -4,
              bottom: -4,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: '#8A5CF6',
              shadowColor: '#8A5CF6',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 12,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Icon container */}
        <View
          style={{
            width: 48,
            height: 48,
            backgroundColor: 'rgba(138, 92, 246, 0.1)',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {icon}
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#EAF2FF',
            marginBottom: 8,
          }}
        >
          {title}
        </Text>

        {/* Description */}
        <Text
          style={{
            fontSize: 16,
            color: '#9FB0CF',
            lineHeight: 24, // 1.5 * 16px
          }}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
