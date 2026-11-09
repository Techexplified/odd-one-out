import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useGame,
  HEART_REFILL_COST,
  HINT_PACK_COST,
  HINT_PACK_SIZE,
} from '@/context/GameContext';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AppIcon } from '@/components/AppIcon';
import { GameAsset } from '@/components/GameAsset';
import { GameBackground } from '@/components/GameBackground';
import { formatCountdown } from '@/utils/date';
import { confirmAction, showMessage } from '@/utils/dialog';
import { remindersSupported } from '@/utils/reminders';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    stats,
    nextHeartInMs,
    toggleSfx,
    toggleHaptics,
    toggleDarkMode,
    setStreakReminder,
    buyHeartRefill,
    buyHintPack,
    resetProgress,
    triggerHaptic,
  } = useGame();
  const systemScheme = useColorScheme();

  const isDark = stats.darkModeOverride !== null ? stats.darkModeOverride : systemScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled && !remindersSupported) {
      showMessage(
        'Mobile Only Feature',
        'Daily push notifications are supported on Android and iOS devices.'
      );
      return;
    }
    const ok = await setStreakReminder(enabled);
    if (enabled && !ok) {
      showMessage(
        'Permission Needed',
        'Please enable notifications in your device settings to receive the 8:00 PM streak reminder.'
      );
    }
  };

  const handleRefillHearts = () => {
    const res = buyHeartRefill();
    if (res === 'full') {
      showMessage(
        'Hearts Full',
        `Your hearts are already at maximum (${stats.maxHearts}/${stats.maxHearts})!`
      );
    } else if (res === 'insufficient') {
      showMessage(
        'Not Enough Coins',
        `Refilling all ${stats.maxHearts} hearts costs ${HEART_REFILL_COST} coins.`
      );
    } else {
      showMessage(
        'Hearts Refilled!',
        `All ${stats.maxHearts} hearts have been restored.`
      );
    }
  };

  const handleBuyHints = () => {
    const res = buyHintPack();
    if (res === 'insufficient') {
      showMessage(
        'Not Enough Coins',
        `A pack of ${HINT_PACK_SIZE} hints costs ${HINT_PACK_COST} coins.`
      );
    } else {
      showMessage('Hints Added!', `+${HINT_PACK_SIZE} hints added to your inventory.`);
    }
  };

  const handleReset = () => {
    confirmAction({
      title: 'Reset All Progress?',
      message: 'This will erase your levels, high scores, coins, and streak.',
      confirmText: 'Reset',
      destructive: true,
      onConfirm: () => {
        resetProgress();
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      },
    });
  };

  return (
    <GameBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Custom Pastel Modal Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              triggerHaptic('light');
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={styles.backBtn}>
            <AppIcon name="arrow-back" size={20} color="#2B2250" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#2B2250' }]}>
            Settings
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Audio & Haptics Section */}
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              GAMEPLAY & FEEL
            </Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.94)',
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <GameAsset name="speaker" size={24} />
                  <Text style={[styles.label, { color: theme.text }]}>Sound Effects</Text>
                </View>
                <Switch
                  value={stats.sfxEnabled}
                  onValueChange={toggleSfx}
                  trackColor={{ false: '#D1C4E9', true: theme.primary }}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <GameAsset name="vibration" size={24} />
                  <Text style={[styles.label, { color: theme.text }]}>Haptic Feedback</Text>
                </View>
                <Switch
                  value={stats.hapticsEnabled}
                  onValueChange={toggleHaptics}
                  trackColor={{ false: '#D1C4E9', true: theme.primary }}
                />
              </View>
            </View>

            {/* Display & Habit Section */}
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              DISPLAY & HABITS
            </Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.94)',
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <GameAsset name="moon" size={24} />
                  <Text style={[styles.label, { color: theme.text }]}>Dark Theme</Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: '#D1C4E9', true: theme.primary }}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <GameAsset name="bell" size={24} />
                  <Text style={[styles.label, { color: theme.text }]}>
                    Daily Focus Reminder (8 PM)
                  </Text>
                </View>
                <Switch
                  value={stats.streakReminderEnabled}
                  onValueChange={handleToggleReminder}
                  trackColor={{ false: '#D1C4E9', true: theme.primary }}
                />
              </View>
            </View>

            {/* Hearts & Supplies */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted, marginBottom: 0 }]}>
                SUPPLIES (BALANCE: {stats.coins}
              </Text>
              <GameAsset name="coin" size={14} />
              <Text style={[styles.sectionTitle, { color: theme.textMuted, marginBottom: 0, marginLeft: 0 }]}>
                )
              </Text>
            </View>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.94)',
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <GameAsset name="heart" size={24} />
                  <View>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Hearts: {stats.hearts}/{stats.maxHearts}
                    </Text>
                    <Text style={[styles.subLabel, { color: theme.textMuted }]}>
                      {nextHeartInMs !== null
                        ? `Next heart in ${formatCountdown(nextHeartInMs)}`
                        : 'All hearts full!'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleRefillHearts}
                  style={[
                    styles.smallBtn,
                    {
                      backgroundColor:
                        stats.hearts >= stats.maxHearts ? '#9E92B0' : theme.primary,
                    },
                  ]}>
                  {stats.hearts >= stats.maxHearts ? (
                    <Text style={styles.smallBtnText}>Full</Text>
                  ) : (
                    <View style={styles.btnCoinInline}>
                      <Text style={styles.smallBtnText}>{HEART_REFILL_COST}</Text>
                      <GameAsset name="coin" size={14} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <GameAsset name="bulb" size={24} />
                  <View>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Hints: {stats.hintsRemaining} in stock
                    </Text>
                    <Text style={[styles.subLabel, { color: theme.textMuted }]}>
                      Pack of +{HINT_PACK_SIZE} hints
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleBuyHints}
                  style={[styles.smallBtn, { backgroundColor: '#FFB800' }]}>
                  <View style={styles.btnCoinInline}>
                    <Text style={[styles.smallBtnText, { color: '#1C1236' }]}>
                      {HINT_PACK_COST}
                    </Text>
                    <GameAsset name="coin" size={14} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Game Rules / How to play */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/modal' as any)}
              style={[
                styles.guideCard,
                {
                  backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.94)',
                  borderColor: theme.border,
                },
              ]}>
              <GameAsset name="book" size={30} />
              <View style={styles.guideInfo}>
                <Text style={[styles.guideTitle, { color: theme.text }]}>How to Play</Text>
                <Text style={[styles.guideDesc, { color: theme.textMuted }]}>
                  Learn game tips, scoring rules & powerups
                </Text>
              </View>
              <AppIcon name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Danger zone */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleReset}
              style={styles.dangerBtn}>
              <Text style={styles.dangerBtnText}>Reset All Game Data</Text>
            </TouchableOpacity>

            <Text style={[styles.versionText, { color: theme.textMuted }]}>
              Odd One Out v1.0.0 • By Explified
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GameBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  btnCoinInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  subLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    marginBottom: 24,
  },
  guideIcon: {
    fontSize: 28,
  },
  guideInfo: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  guideDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  dangerBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FF3B56',
    marginBottom: 24,
  },
  dangerBtnText: {
    color: '#FF3B56',
    fontSize: 14,
    fontWeight: '800',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
});
