import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame, STREAK_MILESTONE_DAYS } from '@/context/GameContext';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AppIcon } from '@/components/AppIcon';
import { GameAsset } from '@/components/GameAsset';
import { HeaderStats } from '@/components/HeaderStats';
import { GameBackground } from '@/components/GameBackground';
import { weekKeys } from '@/utils/date';
import { TOTAL_LEVELS } from '@/utils/gameEngine';

const EXPLIFIED_PLAY_STORE_URL = 'https://play.google.com/store/search?q=Explified&c=apps';

export default function PlayScreen() {
  const router = useRouter();
  const { stats, today, isDailyCompletedToday, triggerHaptic } = useGame();
  const systemScheme = useColorScheme();

  const isDark = stats.darkModeOverride !== null ? stats.darkModeOverride : systemScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const handleContinuePlaying = () => {
    triggerHaptic('light');
    router.push({
      pathname: '/game' as any,
      params: { level: String(stats.currentLevel) },
    });
  };

  const handlePlayDaily = () => {
    triggerHaptic('light');
    router.push('/daily' as any);
  };

  const handleOpenMoreGames = async () => {
    triggerHaptic('light');
    try {
      await Linking.openURL(EXPLIFIED_PLAY_STORE_URL);
    } catch {
      // Fallback to Explified website if store link cannot open
      await Linking.openURL('https://explified.com').catch(() => {});
    }
  };

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const currentWeekKeys = weekKeys(today);
  const daysToReward = STREAK_MILESTONE_DAYS - (stats.currentStreak % STREAK_MILESTONE_DAYS);
  const completedAllLevels = Object.keys(stats.levelStars).length >= TOTAL_LEVELS;

  return (
    <GameBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <HeaderStats />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Title / Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/logo_odd_one_out_hires_transparent.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* 1. Daily Puzzle Card */}
          <View style={[styles.card, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
            <View style={styles.dailyTopRow}>
              <View style={styles.dailyInfo}>
                <View style={styles.dailyTitleRow}>
                  <View style={styles.calendarIconCircle}>
                    <GameAsset name="calendar" size={26} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.dailyHeaderInline}>
                      <Text style={[styles.dailyTitle, { color: isDark ? '#FFF' : '#1C1236' }]}>
                        Daily Puzzle
                      </Text>
                      {isDailyCompletedToday && (
                        <View style={styles.solvedBadge}>
                          <AppIcon name="check" size={11} color="#2E7D32" />
                          <Text style={styles.solvedBadgeText}>Done</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.dailyDate, { color: theme.textMuted }]}>
                      {todayFormatted}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Blue Butterfly Asset */}
              <View style={styles.butterflyWrapper}>
                <Image
                  source={require('@/assets/images/butterfly_hires_transparent.png')}
                  style={styles.butterflyImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Pink Play Today Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePlayDaily}
              style={styles.playDailyBtnWrapper}>
              <LinearGradient
                colors={isDailyCompletedToday ? ['#4CAF50', '#2E7D32'] : ['#FF3B7A', '#FF2366']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playDailyBtn}>
                <Text style={styles.playDailyBtnText}>
                  {isDailyCompletedToday ? "Solved Today • Practice Again" : "Play Today's Puzzle"}
                </Text>
                <AppIcon name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 2. Streak Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              triggerHaptic('light');
              router.push('/(tabs)/streak' as any);
            }}
            style={[styles.card, styles.streakCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
            <View style={styles.streakLeft}>
              <View style={styles.streakTitleRow}>
                <GameAsset name="fire" size={30} />
                <View>
                  <Text style={[styles.streakDaysText, { color: isDark ? '#FFF' : '#1C1236' }]}>
                    {stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'}
                  </Text>
                  <Text style={[styles.streakSubtitle, { color: theme.textMuted }]}>
                    {stats.currentStreak > 0 ? 'In a row!' : 'Solve today to start!'}
                  </Text>
                </View>
              </View>

              {/* 7 Circles row for current Monday-Sunday week */}
              <View style={styles.circlesRow}>
                {weekdayLabels.map((dayLabel, index) => {
                  const dayKey = currentWeekKeys[index];
                  const isDone = stats.completedDates.includes(dayKey);
                  const isFrozen = !isDone && stats.frozenDates.includes(dayKey);
                  const isToday = dayKey === today;
                  return (
                    <View
                      key={dayKey}
                      style={[
                        styles.dayCircle,
                        isDone
                          ? styles.dayCircleDone
                          : isFrozen
                          ? styles.dayCircleFrozen
                          : [
                              styles.dayCirclePending,
                              { backgroundColor: isDark ? theme.surfaceElevated : '#EDE7F6' },
                              isToday && { borderWidth: 1.5, borderColor: '#FF2E75' },
                            ],
                      ]}>
                      {isDone ? (
                        <AppIcon name="check" size={12} color="#FFFFFF" />
                      ) : isFrozen ? (
                        <GameAsset name="snowflake" size={13} />
                      ) : (
                        <Text
                          style={[
                            styles.dayCircleLabel,
                            { color: isToday ? '#FF2E75' : theme.textMuted },
                          ]}>
                          {dayLabel}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.streakDivider, { backgroundColor: isDark ? theme.border : '#F0E6F2' }]} />

            {/* Streak Right: Gift Box */}
            <View style={styles.streakRight}>
              <Image
                source={require('@/assets/images/gift_box_hires_transparent.png')}
                style={styles.giftBoxImage}
                resizeMode="contain"
              />
              <Text style={[styles.nextRewardText, { color: theme.textMuted }]}>
                Next reward{'\n'}in {daysToReward} {daysToReward === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 3. Primary Action: Continue Playing Button */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleContinuePlaying}
            style={styles.continueBtnWrapper}>
            <LinearGradient
              colors={['#FFE259', '#FFA751']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnGradient}>
              <View style={styles.playIconCircle}>
                <AppIcon name="play-arrow" size={22} color="#FF2E75" />
              </View>
              <View style={styles.continueBtnInfo}>
                <Text style={styles.continueBtnTitle}>
                  {completedAllLevels ? 'Continue Master Campaign' : 'Continue Playing'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Text style={[styles.continueBtnLevel, { marginTop: 0 }]}>
                    Level {stats.currentLevel} • {stats.stars}
                  </Text>
                  <GameAsset name="star" size={14} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* 3b. Endless Mode Quick-Launch Card */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              triggerHaptic('medium');
              router.push({
                pathname: '/game' as any,
                params: { mode: 'endless' },
              });
            }}
            style={styles.endlessHomeWrapper}>
            <LinearGradient
              colors={['#9333EA', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.endlessHomeGradient}>
              <View style={styles.endlessHomeIconCircle}>
                <GameAsset name="bolt" size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.endlessHomeTitle}>Endless Mode</Text>
                <Text style={styles.endlessHomeSub}>
                  {stats.endlessBestWave > 0
                    ? `Best: Wave ${stats.endlessBestWave} • ${stats.endlessBestScore.toLocaleString()} pts`
                    : 'Infinite waves • +4s per wave cleared'}
                </Text>
              </View>
              <AppIcon name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* 4. Quick Actions (3 cards in a row) */}
          <View style={styles.quickActionsRow}>
            {/* Leaderboard Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                router.push('/(tabs)/leaderboard' as any);
              }}
              style={[styles.quickCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
              <GameAsset name="crown" size={28} style={{ marginBottom: 6 }} />
              <Text style={[styles.quickCardTitle, { color: isDark ? '#FFF' : '#1C1236' }]}>
                Leaderboard
              </Text>
              <Text style={[styles.quickCardSub, { color: theme.textMuted }]}>
                Compete globally
              </Text>
            </TouchableOpacity>

            {/* Levels Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                router.push('/levels' as any);
              }}
              style={[styles.quickCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
              <GameAsset name="gamepad" size={28} style={{ marginBottom: 6 }} />
              <Text style={[styles.quickCardTitle, { color: isDark ? '#FFF' : '#1C1236' }]}>
                Levels
              </Text>
              <Text style={[styles.quickCardSub, { color: theme.textMuted }]}>
                75+ • Endless
              </Text>
            </TouchableOpacity>

            {/* More Games Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenMoreGames}
              style={[styles.quickCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
              <View style={styles.gridEmojiBox}>
                <GameAsset name="mobile" size={28} />
              </View>
              <Text style={[styles.quickCardTitle, { color: isDark ? '#FFF' : '#1C1236' }]}>
                More Games
              </Text>
              <Text style={[styles.quickCardSub, { color: theme.textMuted }]}>
                By Explified
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom spacing to reveal scenic flower garden */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </GameBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  logoImage: {
    width: 270,
    height: 142,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  dailyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dailyInfo: {
    flex: 1,
    paddingRight: 8,
  },
  dailyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dailyHeaderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  solvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  solvedBadgeText: {
    color: '#2E7D32',
    fontSize: 10,
    fontWeight: '800',
  },
  calendarIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EDE7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarEmoji: {
    fontSize: 22,
  },
  dailyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  dailyDate: {
    fontSize: 12,
    marginTop: 2,
  },
  butterflyWrapper: {
    width: 100,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  butterflyImage: {
    width: '100%',
    height: '100%',
  },
  playDailyBtnWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#FF2E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  playDailyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 22,
    gap: 8,
  },
  playDailyBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  playDailyArrow: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  streakLeft: {
    flex: 1,
  },
  streakTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  streakFlame: {
    fontSize: 28,
  },
  streakDaysText: {
    fontSize: 17,
    fontWeight: '900',
  },
  streakSubtitle: {
    fontSize: 12,
  },
  circlesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDone: {
    backgroundColor: '#4CAF50',
  },
  dayCircleFrozen: {
    backgroundColor: '#29B6F6',
  },
  dayCirclePending: {
    backgroundColor: '#EDE7F6',
  },
  checkmarkIcon: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  dayCircleLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  streakDivider: {
    width: 1,
    height: '80%',
    marginHorizontal: 12,
  },
  streakRight: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 85,
  },
  giftBoxImage: {
    width: 48,
    height: 48,
    marginBottom: 4,
  },
  nextRewardText: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 13,
  },
  continueBtnWrapper: {
    marginVertical: 8,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#FFA751',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 14,
  },
  playIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  playTriangle: {
    color: '#FF2E75',
    fontSize: 18,
    marginLeft: 3,
  },
  continueBtnInfo: {
    flex: 1,
  },
  continueBtnTitle: {
    color: '#1C1236',
    fontSize: 19,
    fontWeight: '900',
  },
  continueBtnLevel: {
    color: '#4A3520',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  endlessHomeWrapper: {
    marginVertical: 4,
    borderRadius: 24,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  endlessHomeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 24,
    gap: 14,
  },
  endlessHomeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endlessHomeTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  endlessHomeSub: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  quickCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickCardEmoji: {
    fontSize: 26,
    marginBottom: 6,
  },
  gridEmojiBox: {
    marginBottom: 6,
  },
  gridEmoji: {
    fontSize: 26,
  },
  quickCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickCardSub: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
});
