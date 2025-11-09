import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { ForgeInterface } from '../src/components';
import { colors } from '../src/theme';

export default function ForgeDemoScreen() {
  const handleForgeComplete = (ultimateNFT: any) => {
    console.log('Forge completed! Ultimate NFT:', ultimateNFT);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forge Demo</Text>
        <Text style={styles.headerSubtitle}>
          Test the forging UI components
        </Text>
      </View>

      <ForgeInterface onForgeComplete={handleForgeComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
