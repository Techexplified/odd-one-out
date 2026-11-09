import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/AppIcon';
import { GameAsset } from '@/components/GameAsset';
import { GameBackground } from '@/components/GameBackground';
import { HeaderStats } from '@/components/HeaderStats';
import { STREAK_MILESTONE_DAYS, useGame } from '@/context/GameContext';
import { formatHMS, formatLongDate, formatMMSS, msUntilNextDay, weekKeys } from '@/utils/date';
import { generateDailyLevel, TIER_LABEL } from '@/utils/gameEngine';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function DailyPuzzleScreen() {
  const router = useRouter();
  const {
    stats,
    today,
    isDailyCompletedToday,
    markDailyInstructionsSeen,
    triggerHaptic,
  } = useGame();

  const [showInstructions, setShowInstructions] = useState(false);
  const [msToMidnight, setMsToMidnight] = useState(() => msUntilNextDay());

  const dailyLevel = useMemo(() => generateDailyLevel(today), [today]);

  // Automatically show "How Daily Puzzle Works" modal the first time
  useEffect(() => {
    if (!stats.hasSeenDailyInstructions) {
      setShowInstructions(true);
    }
  }, [stats.hasSeenDailyInstructions]);

  // Live countdown to midnight for "Next puzzle in 8h 12m 25s"
  useEffect(() => {
    const id = setInterval(() => {
      setMsToMidnight(msUntilNextDay());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const closeInstructions = () => {
    triggerHaptic('light');
    markDailyInstructionsSeen();
    setShowInstructions(false);
  };

  const openInstructions = () => {
    triggerHaptic('light');
    setShowInstructions(true);
  };

  const handleBack = () => {
    triggerHaptic('light');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handlePlayDaily = (practice = false) => {
    triggerHaptic('medium');
    router.push({
      pathname: '/game',
      params: practice ? { mode: 'daily', practice: '1' } : { mode: 'daily' },
    });
  };

  const week = weekKeys(today);
  const completedSet = new Set(stats.completedDates);
  const frozenSet = new Set(stats.frozenDates);
  const daysIntoCycle = stats.currentStreak % STREAK_MILESTONE_DAYS;
  const daysToNextReward = STREAK_MILESTONE_DAYS - daysIntoCycle;

  const bestDailyScore = stats.dailyBestScore || stats.dailyLastScore;
  const bestDailyTime = stats.dailyBestTimeSec ?? stats.dailyLastTimeSec;
  const bestDailyAccuracy = stats.dailyLastAccuracy;
  const rankToday =
    bestDailyScore > 0 ? Math.max(1, Math.min(999, Math.round(1450 - bestDailyScore))) : null;

  return (
    <GameBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <HeaderStats />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Sub-Header: Back button + Daily Puzzle title */}
          <View style={styles.subHeader}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <AppIcon name="chevron-left" size={24} color="#2B2250" />
            </Pressable>
            <Text style={styles.screenTitle}>Daily Puzzle</Text>
            <Pressable style={styles.infoButton} onPress={openInstructions}>
              <AppIcon name="info" size={20} color="#6D56D6" />
            </Pressable>
          </View>

          {!isDailyCompletedToday ? (
            /* ============================================================ */
            /* SCREEN 1: Daily Puzzle (Not Played)                          */
            /* ============================================================ */
            <>
              {/* Today's Puzzle Card */}
              <View style={styles.todayCard}>
                <View style={styles.todayTopRow}>
                  <View style={styles.calendarIconBox}>
                    <AppIcon name="calendar-today" size={26} color="#7B4DFF" />
                  </View>
                  <View style={styles.todayTextCol}>
                    <Text style={styles.todayCardTitle}>Today&apos;s Puzzle</Text>
                    <Text style={styles.todayCardDate}>{formatLongDate(today)}</Text>
                  </View>
                  <Image
                    source={require('@/assets/images/butterfly_hires_transparent.png')}
                    style={styles.butterflyPreview}
                    resizeMode="contain"
                  />
                </View>

                {/* Difficulty | Time Limit meta pill */}
                <View style={styles.metaBar}>
                  <View style={styles.metaItem}>
                    <AppIcon name="groups" size={18} color="#7B4DFF" />
                    <Text style={styles.metaText}>{TIER_LABEL[dailyLevel.tier]}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <AppIcon name="schedule" size={18} color="#7B4DFF" />
                    <Text style={styles.metaText}>{dailyLevel.timeLimitSeconds} seconds</Text>
                  </View>
                </View>

                {/* Play Today's Puzzle CTA */}
                <Pressable
                  onPress={() => handlePlayDaily(false)}
                  style={({ pressed }) => [
                    styles.playButtonOuter,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}>
                  <LinearGradient
                    colors={['#FF74A4', '#FF477E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.playButtonGradient}>
                    <Text style={styles.playButtonText}>Play Today&apos;s Puzzle</Text>
                    <AppIcon name="arrow-forward" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Streak Card */}
              <Pressable
                style={styles.streakCard}
                onPress={() => {
                  triggerHaptic('light');
                  router.push('/(tabs)/streak');
                }}>
                <View style={styles.streakLeft}>
                  <View style={styles.streakHeaderRow}>
                    <GameAsset name="fire" size={30} />
                    <View>
                      <Text style={styles.streakDaysTitle}>
                        {stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'}
                      </Text>
                      <Text style={styles.streakSubText}>
                        {stats.currentStreak > 0 ? 'in a row!' : 'Start your streak today!'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.weekCirclesRow}>
                    {week.map((dayKey, idx) => {
                      const isDone = completedSet.has(dayKey) || frozenSet.has(dayKey);
                      return (
                        <View
                          key={dayKey}
                          style={[
                            styles.dayCircle,
                            isDone ? styles.dayCircleDone : styles.dayCirclePending,
                          ]}>
                          {isDone ? (
                            <AppIcon name="check" size={13} color="#FFFFFF" />
                          ) : (
                            <Text style={styles.dayCircleText}>{DAY_LETTERS[idx]}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.streakVerticalDivider} />

                <View style={styles.streakRight}>
                  <Image
                    source={require('@/assets/images/gift_box_hires_transparent.png')}
                    style={styles.giftIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.nextRewardText}>
                    Next reward{'\n'}in {daysToNextReward}{' '}
                    {daysToNextReward === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              </Pressable>

              {/* How Daily Puzzle Works Section */}
              <Pressable style={styles.howItWorksSection} onPress={openInstructions}>
                <Text style={styles.howItWorksTitle}>How Daily Puzzle Works</Text>
                <View style={styles.howItWorksRow}>
                  <View style={styles.howMiniCard}>
                    <GameAsset name="crown" size={26} />
                    <Text style={styles.howMiniText}>Same puzzle{'\n'}for everyone</Text>
                  </View>
                  <View style={styles.howMiniCard}>
                    <AppIcon name="groups" size={26} color="#7B4DFF" />
                    <Text style={styles.howMiniText}>New puzzle{'\n'}every day</Text>
                  </View>
                  <View style={styles.howMiniCard}>
                    <GameAsset name="star" size={26} />
                    <Text style={styles.howMiniText}>Earn rewards{'\n'}and build streak</Text>
                  </View>
                </View>
              </Pressable>
            </>
          ) : (
            /* ============================================================ */
            /* SCREEN 5: Already Completed (Later in day)                   */
            /* ============================================================ */
            <>
              {/* Green Already Completed Pill */}
              <View style={styles.completedBannerWrap}>
                <View style={styles.completedPill}>
                  <View style={styles.completedCheckCircle}>
                    <AppIcon name="check" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.completedPillText}>Already Completed!</Text>
                </View>
                <Text style={styles.completedDateText}>{formatLongDate(today)}</Text>
              </View>

              {/* 3-Column Best Stats Card */}
              <View style={styles.bestStatsCard}>
                <View style={styles.bestStatCol}>
                  <GameAsset name="star" size={26} />
                  <Text style={styles.bestStatLabel}>Best Score</Text>
                  <Text style={styles.bestStatValue}>{bestDailyScore}</Text>
                </View>
                <View style={styles.bestStatDivider} />
                <View style={styles.bestStatCol}>
                  <AppIcon name="schedule" size={26} color="#6D56D6" />
                  <Text style={styles.bestStatLabel}>Best Time</Text>
                  <Text style={styles.bestStatValue}>{formatMMSS(bestDailyTime)}</Text>
                </View>
                <View style={styles.bestStatDivider} />
                <View style={styles.bestStatCol}>
                  <GameAsset name="target" size={26} />
                  <Text style={styles.bestStatLabel}>Accuracy</Text>
                  <Text style={styles.bestStatValue}>{bestDailyAccuracy}%</Text>
                </View>
              </View>

              {/* Your Rank Today Card */}
              <Pressable
                style={styles.actionCard}
                onPress={() => {
                  triggerHaptic('light');
                  router.push('/(tabs)/leaderboard');
                }}>
                <GameAsset name="trophy" size={32} />
                <View style={styles.actionCardBody}>
                  <Text style={styles.rankSubLabel}>Your Rank Today</Text>
                  <Text style={styles.rankNumberText}>
                    {rankToday !== null ? `#${rankToday}` : '--'}
                  </Text>
                </View>
                <AppIcon name="chevron-right" size={24} color="#7B4DFF" />
              </Pressable>

              {/* Play Again (No rewards) Card */}
              <Pressable
                style={styles.actionCard}
                onPress={() => handlePlayDaily(true)}>
                <View style={styles.purpleIconCircle}>
                  <AppIcon name="play-arrow" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.actionCardBody}>
                  <Text style={styles.actionCardTitle}>Play Again</Text>
                  <Text style={styles.actionCardSubtitle}>(No rewards)</Text>
                </View>
              </Pressable>

              {/* View Leaderboard Card */}
              <Pressable
                style={styles.actionCard}
                onPress={() => {
                  triggerHaptic('light');
                  router.push('/(tabs)/leaderboard');
                }}>
                <GameAsset name="trophy" size={32} />
                <View style={styles.actionCardBody}>
                  <Text style={styles.actionCardTitle}>View Leaderboard</Text>
                </View>
              </Pressable>

              {/* Next puzzle in countdown */}
              <View style={styles.nextPuzzleFooter}>
                <View style={styles.nextPuzzleInfoBadge}>
                  <Text style={styles.nextPuzzleInfoText}>i</Text>
                </View>
                <View>
                  <Text style={styles.nextPuzzleLabel}>Next puzzle in</Text>
                  <Text style={styles.nextPuzzleTimer}>{formatHMS(msToMidnight)}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* ============================================================ */}
        {/* SCREEN 2: Instructions Modal ("How Daily Puzzle Works")      */}
        {/* ============================================================ */}
        <Modal
          visible={showInstructions}
          transparent
          animationType="fade"
          onRequestClose={closeInstructions}>
          <View style={styles.modalBackdrop}>
            <View style={styles.instructionsSheet}>
              <View style={styles.sheetHeaderRow}>
                <View style={{ width: 32 }} />
                <Text style={styles.sheetTitle}>How Daily Puzzle Works</Text>
                <Pressable style={styles.sheetCloseBtn} onPress={closeInstructions}>
                  <AppIcon name="close" size={18} color="#4A3F78" />
                </Pressable>
              </View>

              {/* Bullseye Target Icon */}
              <View style={styles.bullseyeWrap}>
                <GameAsset name="target" size={76} />
              </View>

              <Text style={styles.sheetHeadline}>
                Find the odd one out{'\n'}in today&apos;s special puzzle!
              </Text>

              {/* 4 Feature Rows */}
              <View style={styles.featureList}>
                <View style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <AppIcon name="calendar-today" size={22} color="#7B4DFF" />
                  </View>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>A new puzzle every day</Text>
                    <Text style={styles.featureDesc}>Same puzzle for everyone.</Text>
                  </View>
                </View>

                <View style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <GameAsset name="trophy" size={26} />
                  </View>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Beat the timer</Text>
                    <Text style={styles.featureDesc}>Score higher for faster answers.</Text>
                  </View>
                </View>

                <View style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <Image
                      source={require('@/assets/images/gift_box_hires_transparent.png')}
                      style={{ width: 28, height: 28 }}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Earn rewards</Text>
                    <Text style={styles.featureDesc}>Get coins and grow your streak.</Text>
                  </View>
                </View>

                <View style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <GameAsset name="fire" size={26} />
                  </View>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Build your streak</Text>
                    <Text style={styles.featureDesc}>Play every day to keep it going.</Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={closeInstructions}
                style={({ pressed }) => [
                  styles.gotItBtnOuter,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}>
                <LinearGradient
                  colors={['#FF74A4', '#FF477E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gotItBtnGradient}>
                  <Text style={styles.gotItBtnText}>Got it!</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2B2250',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  infoButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2B2250',
  },
  todayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  todayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFE9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  todayTextCol: {
    flex: 1,
  },
  todayCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2B2250',
  },
  todayCardDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6494',
    marginTop: 2,
  },
  butterflyPreview: {
    width: 78,
    height: 66,
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1FF',
    borderRadius: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metaDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#DDD4F6',
  },
  metaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B2F68',
  },
  playButtonOuter: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#FF477E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  playButtonText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 22,
    padding: 15,
    marginBottom: 14,
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  streakLeft: {
    flex: 1,
  },
  streakHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  flameEmoji: {
    fontSize: 28,
  },
  streakDaysTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2B2250',
  },
  streakSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6494',
  },
  weekCirclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDone: {
    backgroundColor: '#22C55E',
  },
  dayCirclePending: {
    backgroundColor: '#ECE6FF',
  },
  dayCircleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7D72A8',
  },
  streakVerticalDivider: {
    width: 1,
    height: 68,
    backgroundColor: '#E8E1FA',
    marginHorizontal: 12,
  },
  streakRight: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 92,
  },
  giftIcon: {
    width: 48,
    height: 48,
    marginBottom: 4,
  },
  nextRewardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A5080',
    textAlign: 'center',
    lineHeight: 14,
  },
  howItWorksSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  howItWorksTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2250',
    textAlign: 'center',
    marginBottom: 10,
  },
  howItWorksRow: {
    flexDirection: 'row',
    gap: 8,
  },
  howMiniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  howMiniEmoji: {
    fontSize: 22,
  },
  howMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B4076',
    textAlign: 'center',
    lineHeight: 14,
  },
  completedBannerWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCF8E6',
    borderWidth: 1.5,
    borderColor: '#ABEBC4',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 22,
    gap: 10,
    marginBottom: 8,
  },
  completedCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedPillText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#166534',
  },
  completedDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5D5386',
  },
  bestStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 12,
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bestStatCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bestStatDivider: {
    width: 1,
    height: 54,
    backgroundColor: '#E9E2FA',
  },
  bestStatIcon: {
    fontSize: 24,
  },
  bestStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6494',
  },
  bestStatValue: {
    fontSize: 21,
    fontWeight: '900',
    color: '#2B2250',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
    gap: 14,
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  actionCardEmoji: {
    fontSize: 30,
  },
  purpleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7B4DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardBody: {
    flex: 1,
  },
  rankSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6494',
  },
  rankNumberText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2B2250',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2B2250',
  },
  actionCardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A709E',
    marginTop: 1,
  },
  nextPuzzleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  nextPuzzleInfoBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7B4DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPuzzleInfoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  nextPuzzleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5B3FD9',
  },
  nextPuzzleTimer: {
    fontSize: 15,
    fontWeight: '900',
    color: '#4B2FC9',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 16, 48, 0.56)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  instructionsSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
  },
  sheetHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2B2250',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullseyeWrap: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bullseyeOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7B4DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullseyeMid: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullseyeInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFB800',
  },
  bullseyeDart: {
    position: 'absolute',
    fontSize: 48,
  },
  sheetHeadline: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2B2250',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 14,
  },
  featureList: {
    width: '100%',
    gap: 10,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4FF',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECE4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2B2250',
  },
  featureDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6494',
    marginTop: 1,
  },
  gotItBtnOuter: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  gotItBtnGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotItBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
