import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AppIcon } from '@/components/AppIcon';
import { GameAsset } from '@/components/GameAsset';
import { GameBackground } from '@/components/GameBackground';
import { PrimaryButton } from '@/components/PrimaryButton';

export default function HowToPlayModal() {
  const router = useRouter();
  const { stats, triggerHaptic } = useGame();
  const systemScheme = useColorScheme();

  const isDark = stats.darkModeOverride !== null ? stats.darkModeOverride : systemScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <GameBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            How to Play
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <GameAsset name="magnifying_glass" size={62} style={{ marginBottom: 10 }} />
            <Text style={[styles.title, { color: theme.text }]}>How to Play Odd One Out</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Sharpen your eyes and train your brain!
            </Text>

            {/* Rule 1 */}
            <View
              style={[
                styles.ruleCard,
                {
                  backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.94)',
                  borderColor: theme.border,
                },
              ]}>
              <GameAsset name="target" size={34} />
              <View style={styles.ruleInfo}>
                <Text style={[styles.ruleTitle, { color: theme.text }]}>1. Find the Difference</Text>
                <Text style={[styles.ruleDesc, { color: theme.textMuted }]}>
                  Every grid has multiple identical tiles and exactly ONE tile that is subtly different. It could be a different fruit, a shifted shade of color, a rotated angle, or an odd letter!
                </Text>
              </View>
            </View>

            {/* Rule 2 */}
            <View
              style={[
                styles.ruleCard,
                {
                  backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.94)',
                  borderColor: theme.border,
                },
              ]}>
              <GameAsset name="stopwatch" size={34} />
              <View style={styles.ruleInfo}>
                <Text style={[styles.ruleTitle, { color: theme.text }]}>2. Beat the Clock</Text>
                <Text style={[styles.ruleDesc, { color: theme.textMuted }]}>
                  Solve the puzzle before the timer runs down. The faster you solve it, the more bonus stars (up to 3 stars) and coins you earn!
                </Text>
              </View>
            </View>

            {/* Rule 3 */}
            <View
              style={[
                styles.ruleCard,
                {
                  backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.94)',
                  borderColor: theme.border,
                },
              ]}>
              <GameAsset name="red_heart" size={34} />
              <View style={styles.ruleInfo}>
                <Text style={[styles.ruleTitle, { color: theme.text }]}>3. Protect Your Hearts</Text>
                <Text style={[styles.ruleDesc, { color: theme.textMuted }]}>
                  Tapping an incorrect tile costs 1 heart. Hearts recharge automatically over time or can be refilled with coins.
                </Text>
              </View>
            </View>

            {/* Rule 4 */}
            <View
              style={[
                styles.ruleCard,
                {
                  backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.94)',
                  borderColor: theme.border,
                },
              ]}>
              <GameAsset name="seedling" size={34} />
              <View style={styles.ruleInfo}>
                <Text style={[styles.ruleTitle, { color: theme.text }]}>4. Grow Your Daily Habit</Text>
                <Text style={[styles.ruleDesc, { color: theme.textMuted }]}>
                  Play the Daily Puzzle every day to grow your seedling into a blazing streak and unlock milestone rewards!
                </Text>
              </View>
            </View>

            <PrimaryButton
              title="Got it, Let's Play!"
              onPress={() => router.back()}
              size="large"
              style={{ width: '100%', marginTop: 12 }}
            />
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
    alignItems: 'center',
    paddingBottom: 70,
  },
  heroEmoji: {
    fontSize: 54,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  ruleCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    width: '100%',
    gap: 14,
  },
  ruleEmoji: {
    fontSize: 32,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  ruleDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
