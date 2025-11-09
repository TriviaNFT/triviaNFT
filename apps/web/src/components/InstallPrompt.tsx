/**
 * PWA Install Prompt Component
 * Shows install banner on supported browsers
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useInstallPrompt, isIOSSafari } from '../hooks/useInstallPrompt';

interface InstallPromptProps {
  /**
   * Delay before showing prompt (in milliseconds)
   * Default: 30000 (30 seconds)
   */
  delay?: number;
  
  /**
   * Show prompt only once per session
   * Default: true
   */
  oncePerSession?: boolean;
}

export function InstallPrompt({ 
  delay = 30000,
  oncePerSession = true 
}: InstallPromptProps) {
  const { isInstallable, isInstalled, promptInstall, dismissPrompt } = useInstallPrompt();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isInstalled) {
      return;
    }

    // Check if already dismissed this session
    if (oncePerSession) {
      const dismissed = sessionStorage.getItem('install_prompt_dismissed');
      if (dismissed) {
        return;
      }
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      if (isInstallable) {
        setShowPrompt(true);
      } else if (isIOSSafari()) {
        // Show iOS-specific instructions
        setShowIOSInstructions(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, delay, oncePerSession]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    dismissPrompt();
    
    if (oncePerSession) {
      sessionStorage.setItem('install_prompt_dismissed', 'true');
    }
  };

  // Don't render if not showing
  if (!showPrompt && !showIOSInstructions) {
    return null;
  }

  // iOS Safari instructions
  if (showIOSInstructions) {
    return (
      <View className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-800 border border-primary rounded-lg shadow-lg p-4 z-50">
        <View className="flex-row items-start justify-between mb-2">
          <Text className="text-white font-semibold text-base flex-1">
            Install TriviaNFT
          </Text>
          <Pressable
            onPress={handleDismiss}
            className="ml-2 p-1"
            accessibilityLabel="Dismiss install prompt"
          >
            <Text className="text-gray-400 text-lg">×</Text>
          </Pressable>
        </View>
        
        <Text className="text-gray-300 text-sm mb-3">
          Install this app on your iPhone for a better experience:
        </Text>
        
        <View className="space-y-2 mb-4">
          <View className="flex-row items-start">
            <Text className="text-primary font-bold mr-2">1.</Text>
            <Text className="text-gray-300 text-sm flex-1">
              Tap the Share button <Text className="text-primary">⎋</Text> in Safari
            </Text>
          </View>
          
          <View className="flex-row items-start">
            <Text className="text-primary font-bold mr-2">2.</Text>
            <Text className="text-gray-300 text-sm flex-1">
              Scroll down and tap "Add to Home Screen"
            </Text>
          </View>
          
          <View className="flex-row items-start">
            <Text className="text-primary font-bold mr-2">3.</Text>
            <Text className="text-gray-300 text-sm flex-1">
              Tap "Add" to install
            </Text>
          </View>
        </View>
        
        <Pressable
          onPress={handleDismiss}
          className="bg-gray-700 rounded-lg py-2 px-4 active:opacity-80"
          accessibilityLabel="Got it"
        >
          <Text className="text-white font-semibold text-center">
            Got it
          </Text>
        </Pressable>
      </View>
    );
  }

  // Standard install prompt
  return (
    <View className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-800 border border-primary rounded-lg shadow-lg p-4 z-50">
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-white font-semibold text-base flex-1">
          Install TriviaNFT
        </Text>
        <Pressable
          onPress={handleDismiss}
          className="ml-2 p-1"
          accessibilityLabel="Dismiss install prompt"
        >
          <Text className="text-gray-400 text-lg">×</Text>
        </Pressable>
      </View>
      
      <Text className="text-gray-300 text-sm mb-4">
        Install this app for quick access and a better experience. Works offline!
      </Text>
      
      <View className="flex-row gap-2">
        <Pressable
          onPress={handleInstall}
          className="flex-1 bg-primary rounded-lg py-2 px-4 active:opacity-80"
          accessibilityLabel="Install app"
        >
          <Text className="text-dark font-semibold text-center">
            Install
          </Text>
        </Pressable>
        
        <Pressable
          onPress={handleDismiss}
          className="flex-1 bg-gray-700 rounded-lg py-2 px-4 active:opacity-80"
          accessibilityLabel="Not now"
        >
          <Text className="text-white font-semibold text-center">
            Not Now
          </Text>
        </Pressable>
      </View>
      
      <View className="mt-3 flex-row items-center">
        <View className="flex-1 h-px bg-gray-700" />
        <Text className="text-gray-500 text-xs mx-2">Benefits</Text>
        <View className="flex-1 h-px bg-gray-700" />
      </View>
      
      <View className="mt-3 space-y-1">
        <View className="flex-row items-center">
          <Text className="text-primary mr-2">✓</Text>
          <Text className="text-gray-400 text-xs">Quick access from home screen</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-primary mr-2">✓</Text>
          <Text className="text-gray-400 text-xs">Works offline</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-primary mr-2">✓</Text>
          <Text className="text-gray-400 text-xs">Faster loading</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Compact install button for header/navbar
 */
export function InstallButton() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();

  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleClick = async () => {
    await promptInstall();
  };

  return (
    <Pressable
      onPress={handleClick}
      className="bg-primary rounded-lg py-2 px-4 active:opacity-80"
      accessibilityLabel="Install app"
    >
      <Text className="text-dark font-semibold text-sm">
        Install App
      </Text>
    </Pressable>
  );
}
