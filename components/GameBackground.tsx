import React from 'react';
import { StyleSheet, ImageBackground, ViewStyle } from 'react-native';
import { useGame } from '@/context/GameContext';
import { useColorScheme } from '@/components/useColorScheme';

interface GameBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GameBackground({ children, style }: GameBackgroundProps) {
  const { stats } = useGame();
  const systemScheme = useColorScheme();

  const isDark = stats.darkModeOverride !== null ? stats.darkModeOverride : systemScheme === 'dark';

  return (
    <ImageBackground
      source={
        isDark
          ? require('@/assets/images/bg_dark.png')
          : require('@/assets/images/bg_light.png')
      }
      style={[styles.background, style]}
      resizeMode="cover">
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
