import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AppIcon } from './AppIcon';
import { AvatarGraphic, GameAsset } from './GameAsset';

interface HeaderStatsProps {
  showBack?: boolean;
  onBack?: () => void;
  showSettings?: boolean;
}

export function HeaderStats({ showBack = false, onBack, showSettings = true }: HeaderStatsProps) {
  const { stats, triggerHaptic } = useGame();
  const systemScheme = useColorScheme();
  const router = useRouter();

  const isDark = stats.darkModeOverride !== null ? stats.darkModeOverride : systemScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const handleBackPress = () => {
    triggerHaptic('light');
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View style={styles.container}>
      {/* Left side: Back Button + Avatar */}
      <View style={styles.leftGroup}>
        {showBack && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBackPress}
            style={[styles.circleButton, { backgroundColor: isDark ? theme.surfaceElevated : '#EDE7F6' }]}>
            <AppIcon name="arrow-back" size={20} color={isDark ? '#FFF' : '#2D1B36'} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            router.push('/(tabs)/profile' as any);
          }}
          style={styles.avatarBorder}>
          <AvatarGraphic avatar={stats.avatar} size={40} />
        </TouchableOpacity>
      </View>

      {/* Center: Currency Pills */}
      <View style={styles.centerGroup}>
        {/* Coins Pill (Display only - ability to add more coins removed) */}
        <View style={[styles.pill, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <GameAsset name="coin" size={20} />
          <Text style={[styles.pillText, { color: isDark ? '#FFF' : '#1E1335' }]}>
            {stats.coins}
          </Text>
        </View>

        {/* Stars Pill -> navigates to Levels */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            triggerHaptic('light');
            router.push('/levels' as any);
          }}
          style={[styles.pill, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <GameAsset name="star" size={18} />
          <Text style={[styles.pillText, { color: isDark ? '#FFF' : '#1E1335' }]}>
            {stats.stars}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right side: Settings Button */}
      {showSettings ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            triggerHaptic('light');
            router.push('/settings' as any);
          }}
          style={[styles.circleButton, { backgroundColor: isDark ? theme.surfaceElevated : '#EDE7F6' }]}>
          <AppIcon name="settings-sharp" size={19} color={isDark ? '#FFF' : '#2D1B36'} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#7C4DFF',
    backgroundColor: '#EDE7F6',
    overflow: 'hidden',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  emojiAvatarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE7F6',
  },
  emojiAvatarText: {
    fontSize: 24,
  },
  centerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  coinBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinEmoji: {
    fontSize: 14,
  },
  starEmoji: {
    fontSize: 16,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '800',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
