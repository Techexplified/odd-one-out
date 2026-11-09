import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
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
import { useGame } from '@/context/GameContext';
import { showMessage } from '@/utils/dialog';
import { dateKey, parseDateKey, weekKeys } from '@/utils/date';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MILESTONE_TIERS = [
  { days: 3, coins: 50, stars: 1 },
  { days: 7, coins: 100, stars: 3 },
  { days: 14, coins: 200, stars: 5 },
  { days: 30, coins: 500, stars: 10 },
];

type SubPage = 'main' | 'milestone' | 'history' | 'reminder';

export default function StreakScreen() {
  const router = useRouter();
  const {
    stats,
    today,
    isDailyCompletedToday,
    setStreakReminder,
    triggerHaptic,
  } = useGame();

  const [subPage, setSubPage] = useState<SubPage>('main');
  const [selectedMilestoneDays, setSelectedMilestoneDays] = useState<number>(7);
  const [calMonthDate, setCalMonthDate] = useState(() => parseDateKey(today));

  // Automatically open Milestone celebration when the player is on a 7-day multiple
  useEffect(() => {
    if (stats.currentStreak > 0 && stats.currentStreak % 7 === 0) {
      setSelectedMilestoneDays(stats.currentStreak);
      setSubPage('milestone');
    } else if (subPage === 'milestone' && stats.currentStreak === 0) {
      setSubPage('main');
    }
  }, [stats.currentStreak]);

  const week = useMemo(() => weekKeys(today), [today]);
  const completedSet = useMemo(() => new Set(stats.completedDates), [stats.completedDates]);
  const frozenSet = useMemo(() => new Set(stats.frozenDates), [stats.frozenDates]);

  const nextMilestone = useMemo(() => {
    const found = MILESTONE_TIERS.find((t) => t.days > stats.currentStreak);
    if (found) return found;
    const nextSevenMultiple = (Math.floor(stats.currentStreak / 7) + 1) * 7;
    return { days: nextSevenMultiple, coins: 100, stars: 3 };
  }, [stats.currentStreak]);

  const handleBack = () => {
    triggerHaptic('light');
    if (subPage !== 'main') {
      setSubPage('main');
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handlePlayToday = () => {
    triggerHaptic('medium');
    router.push('/daily');
  };

  const handleToggleNotifications = async () => {
    const nextState = !stats.streakReminderEnabled;
    const ok = await setStreakReminder(nextState);
    if (nextState && ok) {
      showMessage(
        'Daily Reminders Enabled!',
        "We'll remind you at 8:00 PM so you never miss your streak."
      );
      setSubPage('main');
    } else if (!nextState) {
      showMessage(
        'Reminders Disabled',
        'Daily streak reminders have been turned off.'
      );
      setSubPage('main');
    } else {
      showMessage(
        'Notifications Permission Needed',
        'Please allow notification permissions in your device settings to receive daily streak reminders.'
      );
    }
  };

  const changeMonth = (delta: number) => {
    triggerHaptic('light');
    setCalMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // Build real monthly calendar cells with leading weekday offset (Monday = 0)
  const calendarGrid = useMemo(() => {
    const year = calMonthDate.getFullYear();
    const month = calMonthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const leadingBlanks = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const blanks = Array.from({ length: leadingBlanks }, (_, i) => ({
      id: `blank-${i}`,
      isBlank: true as const,
    }));

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const key = dateKey(new Date(year, month, dayNum));
      const isDone = completedSet.has(key) || frozenSet.has(key);
      const isCurrent = key === today;
      return {
        id: key,
        isBlank: false as const,
        dayNum,
        key,
        isDone,
        isCurrent,
      };
    });

    return [...blanks, ...days];
  }, [calMonthDate, completedSet, frozenSet, today]);

  // Determine which main state applies based on real persisted stats
  const isStreakLostState =
    stats.currentStreak === 0 && Boolean(stats.lastMissedStreakDate);
  const isStartState = stats.currentStreak === 0 && !isStreakLostState;

  return (
    <GameBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top Navigation Row */}
        <View style={styles.headerRow}>
          <Pressable style={styles.circleBackBtn} onPress={handleBack}>
            <AppIcon name="arrow-back" size={20} color="#2B2250" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {subPage === 'history' ? 'Streak History' : 'Streak'}
          </Text>
          <View style={styles.headerRightActions}>
            <Pressable
              style={[
                styles.headerActionMini,
                subPage === 'history' && styles.headerActionMiniActive,
              ]}
              onPress={() => {
                triggerHaptic('light');
                setSubPage(subPage === 'history' ? 'main' : 'history');
              }}>
              <AppIcon
                name="calendar-today"
                size={18}
                color={subPage === 'history' ? '#FFFFFF' : '#6D56D6'}
              />
            </Pressable>
            <Pressable
              style={[
                styles.headerActionMini,
                (subPage === 'reminder' || stats.streakReminderEnabled) &&
                  styles.headerActionMiniActive,
              ]}
              onPress={() => {
                triggerHaptic('light');
                setSubPage(subPage === 'reminder' ? 'main' : 'reminder');
              }}>
              <AppIcon
                name="notifications"
                size={18}
                color={
                  subPage === 'reminder' || stats.streakReminderEnabled
                    ? '#FFFFFF'
                    : '#6D56D6'
                }
              />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* ============================================================ */}
          {/* SUBPAGE: Streak History (Real Monthly Calendar + Real Stats) */}
          {/* ============================================================ */}
          {subPage === 'history' && (
            <View style={styles.centerSection}>
              <View style={styles.historyCalendarCard}>
                <View style={styles.calHeaderRow}>
                  <Pressable onPress={() => changeMonth(-1)} style={styles.calArrowBtn}>
                    <AppIcon name="chevron-left" size={20} color="#2B2250" />
                  </Pressable>
                  <Text style={styles.calMonthTitleBig}>
                    {MONTH_NAMES[calMonthDate.getMonth()]} {calMonthDate.getFullYear()}
                  </Text>
                  <Pressable onPress={() => changeMonth(1)} style={styles.calArrowBtn}>
                    <AppIcon name="chevron-right" size={20} color="#2B2250" />
                  </Pressable>
                </View>

                <View style={styles.weekLabelsRow}>
                  {DAY_LETTERS.map((letter, idx) => (
                    <Text key={idx} style={styles.weekDayHeaderLetter}>
                      {letter}
                    </Text>
                  ))}
                </View>

                <View style={styles.calGridWrap}>
                  {calendarGrid.map((cell) => {
                    if (cell.isBlank) {
                      return <View key={cell.id} style={styles.calGridCellWrap} />;
                    }
                    return (
                      <View key={cell.id} style={styles.calGridCellWrap}>
                        <View
                          style={[
                            styles.calDayCircle,
                            cell.isDone
                              ? styles.weekCircleDone
                              : cell.isCurrent
                              ? styles.weekCircleCurrent
                              : styles.calDayDefault,
                          ]}>
                          {cell.isDone ? (
                            <AppIcon name="check" size={14} color="#FFFFFF" />
                          ) : (
                            <Text
                              style={[
                                styles.calDayNumber,
                                cell.isCurrent && { color: '#FFFFFF' },
                              ]}>
                              {cell.dayNum}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* 3 Real Stat Cards */}
              <View style={styles.historyStatCard}>
                <GameAsset name="trophy" size={34} />
                <View>
                  <Text style={styles.historyStatTitle}>Current Streak</Text>
                  <Text style={styles.historyStatValue}>
                    {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              </View>

              <View style={styles.historyStatCard}>
                <GameAsset name="crown" size={34} />
                <View>
                  <Text style={styles.historyStatTitle}>Longest Streak</Text>
                  <Text style={styles.historyStatValue}>
                    {stats.bestStreak} {stats.bestStreak === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              </View>

              <View style={styles.historyStatCard}>
                <View style={styles.barChartIconWrap}>
                  <View style={[styles.barCol, { height: 10 }]} />
                  <View style={[styles.barCol, { height: 16 }]} />
                  <View style={[styles.barCol, { height: 22 }]} />
                </View>
                <View>
                  <Text style={styles.historyStatTitle}>Total Daily Puzzles</Text>
                  <Text style={styles.historyStatValue}>
                    {stats.completedDates.length} completed
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* SUBPAGE: Don't Miss Your Streak! (Reminders)                 */}
          {/* ============================================================ */}
          {subPage === 'reminder' && (
            <View style={styles.centerSection}>
              <View style={styles.bellHeroWrap}>
                <GameAsset name="sparkles" size={18} style={styles.sparkleLeft} />
                <GameAsset name="sparkles" size={18} style={styles.sparkleRight} />
                <LinearGradient
                  colors={['#B388FF', '#7C4DFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bellCircle}>
                  <GameAsset name="bell" size={56} />
                </LinearGradient>
              </View>

              <Text style={styles.heroTitle}>Don&apos;t Miss Your Streak!</Text>
              <Text style={styles.heroSubText}>
                Enable daily reminders to{'\n'}get notified when today&apos;s{'\n'}puzzle is ready.
              </Text>

              <View style={styles.reminderBenefitsCard}>
                <View style={styles.reminderBenefitRow}>
                  <View style={styles.reminderIconBox}>
                    <AppIcon name="calendar-today" size={20} color="#7B4DFF" />
                  </View>
                  <Text style={styles.reminderBenefitText}>Remind me daily (8:00 PM)</Text>
                </View>

                <View style={styles.reminderDivider} />

                <View style={styles.reminderBenefitRow}>
                  <View style={styles.reminderIconBox}>
                    <GameAsset name="fire" size={22} />
                  </View>
                  <Text style={styles.reminderBenefitText}>Keep my streak going</Text>
                </View>

                <View style={styles.reminderDivider} />

                <View style={styles.reminderBenefitRow}>
                  <View style={styles.reminderIconBox}>
                    <Image
                      source={require('@/assets/images/gift_box_hires_transparent.png')}
                      style={{ width: 24, height: 24 }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.reminderBenefitText}>
                    Unlock milestone rewards
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleToggleNotifications}
                style={({ pressed }) => [
                  styles.pinkCtaOuter,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}>
                <LinearGradient
                  colors={['#FF74A4', '#FF477E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pinkCtaGradient}>
                  <Text style={styles.pinkCtaText}>
                    {stats.streakReminderEnabled
                      ? 'Disable Notifications'
                      : 'Enable Notifications'}
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setSubPage('main');
                }}
                style={styles.maybeLaterBtn}>
                <Text style={styles.maybeLaterText}>Maybe Later</Text>
              </Pressable>
            </View>
          )}

          {/* ============================================================ */}
          {/* SUBPAGE: Milestone Reached / Milestone Detail                */}
          {/* ============================================================ */}
          {subPage === 'milestone' && (
            <View style={styles.centerSection}>
              <View style={styles.flameRibbonWrap}>
                <View style={styles.confettiLeft}>
                  <GameAsset name="party_popper" size={22} />
                  <GameAsset name="sparkles" size={18} />
                </View>
                <View style={styles.confettiRight}>
                  <GameAsset name="sparkles" size={18} />
                  <GameAsset name="confetti_ball" size={22} />
                </View>
                <View style={styles.flameOuter}>
                  <View style={styles.flameInner}>
                    <Text style={styles.flameNumberText}>{selectedMilestoneDays}</Text>
                  </View>
                </View>
                <LinearGradient
                  colors={['#8C5BFF', '#6839E8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.daysRibbon}>
                  <Text style={styles.daysRibbonText}>
                    {stats.bestStreak >= selectedMilestoneDays
                      ? 'Milestone Reached!'
                      : `${selectedMilestoneDays}-Day Milestone`}
                  </Text>
                </LinearGradient>
              </View>

              <Text style={styles.heroSubText}>
                {stats.bestStreak >= selectedMilestoneDays
                  ? `Amazing! ${selectedMilestoneDays} days in a row!`
                  : `Reach a ${selectedMilestoneDays}-day streak to unlock this reward! (${stats.currentStreak}/${selectedMilestoneDays} days)`}
              </Text>

              {/* Rewards 2-Column Card */}
              {(() => {
                const tierInfo =
                  MILESTONE_TIERS.find((t) => t.days === selectedMilestoneDays) ||
                  MILESTONE_TIERS[1];
                return (
                  <View style={styles.milestoneRewardCard}>
                    <View style={styles.milestoneRewardCol}>
                      <GameAsset name="coin" size={38} />
                      <View>
                        <Text style={styles.milestoneRewardAmount}>+{tierInfo.coins}</Text>
                        <Text style={styles.milestoneRewardLabel}>Coins</Text>
                      </View>
                    </View>

                    <View style={styles.milestoneRewardDivider} />

                    <View style={styles.milestoneRewardCol}>
                      <GameAsset name="star" size={36} />
                      <View>
                        <Text style={styles.milestoneRewardAmount}>+{tierInfo.stars}</Text>
                        <Text style={styles.milestoneRewardLabel}>Stars</Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setSubPage('main');
                }}
                style={({ pressed }) => [
                  styles.pinkCtaOuter,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}>
                <LinearGradient
                  colors={['#FF74A4', '#FF477E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pinkCtaGradient}>
                  <Text style={styles.pinkCtaText}>Continue</Text>
                </LinearGradient>
              </Pressable>

              {/* Streak Calendar Mini Section */}
              <View style={{ width: '100%', marginTop: 6 }}>
                <Text style={styles.sectionHeaderLeft}>Streak Calendar</Text>
                <View style={styles.weekCard}>
                  <View style={styles.calHeaderRow}>
                    <Pressable onPress={() => changeMonth(-1)}>
                      <AppIcon name="chevron-left" size={18} color="#4A3F78" />
                    </Pressable>
                    <Text style={styles.calMonthTitle}>
                      {MONTH_NAMES[calMonthDate.getMonth()]} {calMonthDate.getFullYear()}
                    </Text>
                    <Pressable onPress={() => changeMonth(1)}>
                      <AppIcon name="chevron-right" size={18} color="#4A3F78" />
                    </Pressable>
                  </View>
                  <View style={styles.weekLabelsRow}>
                    {DAY_LETTERS.map((letter, idx) => (
                      <Text key={idx} style={styles.weekDayHeaderLetter}>
                        {letter}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.weekCirclesRow}>
                    {week.map((dayKey, idx) => {
                      const isDone = completedSet.has(dayKey) || frozenSet.has(dayKey);
                      const isTodayCol = dayKey === today;
                      return (
                        <View
                          key={dayKey}
                          style={[
                            styles.weekCircleBase,
                            isDone
                              ? styles.weekCircleDone
                              : isTodayCol
                              ? styles.weekCircleOutlined
                              : styles.weekCircleEmpty,
                          ]}>
                          {isDone ? (
                            <AppIcon name="check" size={15} color="#FFFFFF" />
                          ) : (
                            <Text
                              style={
                                isTodayCol
                                  ? styles.weekCircleOutlinedText
                                  : styles.weekDayMutedText
                              }>
                              {DAY_LETTERS[idx]}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* MAIN PAGE STATE 1: Start Your Streak! (currentStreak === 0)  */}
          {/* ============================================================ */}
          {subPage === 'main' && isStartState && (
            <View style={styles.centerSection}>
              <View style={styles.cloudHeroWrap}>
                <View style={styles.sproutCloudBg} />
                <GameAsset name="seedling" size={56} style={{ marginTop: -8, zIndex: 2 }} />
                <View style={styles.sproutSoilMound} />
              </View>

              <Text style={styles.heroTitle}>Start Your Streak!</Text>
              <Text style={styles.heroSubText}>
                Complete today&apos;s puzzle{'\n'}to start your streak and{'\n'}earn rewards every day.
              </Text>

              {/* Real Weekly Card */}
              <View style={styles.weekCard}>
                <View style={styles.weekLabelsRow}>
                  {DAY_LETTERS.map((letter, idx) => (
                    <Text key={idx} style={styles.weekDayHeaderLetter}>
                      {letter}
                    </Text>
                  ))}
                </View>
                <View style={styles.weekCirclesRow}>
                  {week.map((dayKey) => {
                    const isDone = completedSet.has(dayKey) || frozenSet.has(dayKey);
                    return (
                      <View
                        key={dayKey}
                        style={[
                          styles.weekCircleBase,
                          isDone ? styles.weekCircleDone : styles.weekCircleEmpty,
                        ]}>
                        {isDone ? (
                          <AppIcon name="check" size={15} color="#FFFFFF" />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Play Today's Puzzle Button */}
              <Pressable
                onPress={handlePlayToday}
                style={({ pressed }) => [
                  styles.pinkCtaOuter,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}>
                <LinearGradient
                  colors={['#FF74A4', '#FF477E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pinkCtaGradient}>
                  <Text style={styles.pinkCtaText}>Play Today&apos;s Puzzle</Text>
                  <AppIcon name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>

              {/* Streak Rewards Card */}
              <View style={styles.infoBannerCard}>
                <Image
                  source={require('@/assets/images/gift_box_hires_transparent.png')}
                  style={{ width: 52, height: 52 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoBannerTitle}>Streak Rewards</Text>
                  <Text style={styles.infoBannerDesc}>
                    Play daily and earn bigger{'\n'}rewards at milestones!
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* MAIN PAGE STATE 2: Streak Lost (Sad Cloud)                   */}
          {/* ============================================================ */}
          {subPage === 'main' && isStreakLostState && (
            <View style={styles.centerSection}>
              <View style={styles.sadCloudContainer}>
                <View style={styles.sadCloudLobeLeft} />
                <View style={styles.sadCloudLobeRight} />
                <View style={styles.sadCloudCenter}>
                  <View style={styles.sadEyesRow}>
                    <View style={styles.sadEye}>
                      <View style={styles.sadEyePupil} />
                    </View>
                    <View style={styles.sadEye}>
                      <View style={styles.sadEyePupil} />
                    </View>
                  </View>
                  <Text style={styles.sadMouth}>︵</Text>
                </View>
                <View style={styles.sadPawLeft} />
                <View style={styles.sadPawRight} />
              </View>

              <Text style={styles.heroTitle}>Streak Lost</Text>
              <Text style={styles.heroSubText}>
                You missed yesterday&apos;s puzzle.{'\n'}Your streak has been reset.
              </Text>

              {/* Real Weekly Strip showing Red X on missed date */}
              <View style={styles.weekCard}>
                <View style={styles.weekLabelsRow}>
                  {DAY_LETTERS.map((letter, idx) => (
                    <Text key={idx} style={styles.weekDayHeaderLetter}>
                      {letter}
                    </Text>
                  ))}
                </View>
                <View style={styles.weekCirclesRow}>
                  {week.map((dayKey) => {
                    const isDone = completedSet.has(dayKey) || frozenSet.has(dayKey);
                    const isMissed = dayKey === stats.lastMissedStreakDate;
                    return (
                      <View
                        key={dayKey}
                        style={[
                          styles.weekCircleBase,
                          isDone
                            ? styles.weekCircleDone
                            : isMissed
                            ? styles.weekCircleMissed
                            : styles.weekCircleEmpty,
                        ]}>
                        {isDone ? (
                          <AppIcon name="check" size={15} color="#FFFFFF" />
                        ) : isMissed ? (
                          <AppIcon name="close" size={15} color="#FFFFFF" />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Start a New Streak Card */}
              <View style={styles.infoBannerCard}>
                <GameAsset name="fire" size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoBannerTitle}>Start a New Streak</Text>
                  <Text style={styles.infoBannerDesc}>
                    Complete today&apos;s puzzle{'\n'}to begin again and earn rewards.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handlePlayToday}
                style={({ pressed }) => [
                  styles.pinkCtaOuter,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}>
                <LinearGradient
                  colors={['#FF74A4', '#FF477E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pinkCtaGradient}>
                  <Text style={styles.pinkCtaText}>Play Today&apos;s Puzzle</Text>
                  <AppIcon name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* ============================================================ */}
          {/* MAIN PAGE STATE 3: Active Streak (currentStreak > 0)         */}
          {/* ============================================================ */}
          {subPage === 'main' && stats.currentStreak > 0 && (
            <View style={styles.centerSection}>
              <View style={styles.flameRibbonWrap}>
                <GameAsset name="sparkles" size={18} style={styles.sparkleLeft} />
                <GameAsset name="sparkles" size={18} style={styles.sparkleRight} />
                <View style={styles.flameOuter}>
                  <View style={styles.flameInner}>
                    <Text style={styles.flameNumberText}>{stats.currentStreak}</Text>
                  </View>
                </View>
                <LinearGradient
                  colors={['#FF6D9E', '#FF477E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.daysRibbon}>
                  <Text style={styles.daysRibbonText}>
                    {stats.currentStreak === 1 ? 'Day in a Row!' : 'Days in a Row!'}
                  </Text>
                </LinearGradient>
              </View>

              <Text style={styles.heroSubText}>
                {isDailyCompletedToday
                  ? `Awesome! Come back tomorrow\nto make it ${stats.currentStreak + 1} days.`
                  : `Keep going! Complete today's puzzle\nto make it ${stats.currentStreak + 1} days.`}
              </Text>

              {/* Real Weekly Strip Card */}
              <View style={styles.weekCard}>
                <View style={styles.weekLabelsRow}>
                  {DAY_LETTERS.map((letter, idx) => (
                    <Text key={idx} style={styles.weekDayHeaderLetter}>
                      {letter}
                    </Text>
                  ))}
                </View>
                <View style={styles.weekCirclesRow}>
                  {week.map((dayKey, idx) => {
                    const isDone = completedSet.has(dayKey) || frozenSet.has(dayKey);
                    const isTodayCol = dayKey === today;
                    return (
                      <View
                        key={dayKey}
                        style={[
                          styles.weekCircleBase,
                          isDone
                            ? styles.weekCircleDone
                            : isTodayCol
                            ? styles.weekCircleCurrent
                            : styles.weekCircleEmpty,
                        ]}>
                        {isDone ? (
                          <AppIcon name="check" size={15} color="#FFFFFF" />
                        ) : isTodayCol ? (
                          <Text style={styles.weekCircleCurrentText}>
                            {DAY_LETTERS[idx]}
                          </Text>
                        ) : (
                          <View style={styles.weekCircleDot} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {!isDailyCompletedToday && (
                <Pressable
                  onPress={handlePlayToday}
                  style={({ pressed }) => [
                    styles.pinkCtaOuter,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}>
                  <LinearGradient
                    colors={['#FF74A4', '#FF477E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pinkCtaGradient}>
                    <Text style={styles.pinkCtaText}>Play Today&apos;s Puzzle</Text>
                    <AppIcon name="arrow-forward" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </Pressable>
              )}

              {/* Next Milestone Card */}
              <Pressable
                style={styles.nextMilestoneCard}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedMilestoneDays(nextMilestone.days);
                  setSubPage('milestone');
                }}>
                <GameAsset name="trophy" size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextMilestoneSmall}>Next Milestone</Text>
                  <Text style={styles.nextMilestoneBig}>{nextMilestone.days} Days</Text>
                  <View style={styles.nextMilestoneRewardsRow}>
                    <View style={styles.inlineRewardBadge}>
                      <GameAsset name="coin" size={18} />
                      <Text style={styles.inlineRewardVal}>+{nextMilestone.coins}</Text>
                    </View>
                    <View style={styles.inlineRewardBadge}>
                      <GameAsset name="star" size={18} />
                      <Text style={styles.inlineRewardVal}>+{nextMilestone.stars}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>

              {/* 4 Milestone Tier Cards (3, 7, 14, 30 Days) */}
              <View style={styles.milestoneGridRow}>
                {MILESTONE_TIERS.map((tier) => {
                  const unlocked =
                    stats.bestStreak >= tier.days || stats.currentStreak >= tier.days;
                  const isNextTarget = nextMilestone.days === tier.days;
                  return (
                    <Pressable
                      key={tier.days}
                      onPress={() => {
                        triggerHaptic('light');
                        setSelectedMilestoneDays(tier.days);
                        setSubPage('milestone');
                      }}
                      style={[
                        styles.milestoneMiniCard,
                        isNextTarget && styles.milestoneMiniCardHighlighted,
                      ]}>
                      {unlocked || isNextTarget ? (
                        <GameAsset name="fire" size={26} />
                      ) : (
                        <AppIcon name="lock-closed" size={22} color="#5B42D6" />
                      )}
                      <Text style={styles.milestoneMiniNum}>{tier.days}</Text>
                      <Text style={styles.milestoneMiniUnit}>Days</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GameBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginTop: 6,
    marginBottom: 10,
  },
  circleBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#2B2250',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerActionMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionMiniActive: {
    backgroundColor: '#7B4DFF',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  centerSection: {
    alignItems: 'center',
    width: '100%',
  },
  cloudHeroWrap: {
    width: 130,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  sproutCloudBg: {
    position: 'absolute',
    width: 116,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  sproutEmoji: {
    fontSize: 58,
    zIndex: 2,
  },
  sproutSoilMound: {
    width: 58,
    height: 16,
    borderRadius: 10,
    backgroundColor: '#9C82E8',
    marginTop: -8,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#2B2250',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B5082',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  weekCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  weekLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  weekDayHeaderLetter: {
    width: 34,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#4A3F78',
  },
  weekCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  weekCircleBase: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCircleEmpty: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFEAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCircleDone: {
    backgroundColor: '#1EB96A',
  },
  weekCircleCurrent: {
    backgroundColor: '#7B4DFF',
  },
  weekCircleMissed: {
    backgroundColor: '#EF4444',
  },
  weekCircleOutlined: {
    backgroundColor: '#F5F1FF',
    borderWidth: 2,
    borderColor: '#7B4DFF',
  },
  weekCircleOutlinedText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7B4DFF',
  },
  weekDayMutedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C82B2',
  },
  weekCircleCurrentText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  weekCircleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C5B8F0',
  },
  pinkCtaOuter: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#FF477E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pinkCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  pinkCtaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  infoBannerCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    padding: 16,
    gap: 14,
    marginBottom: 14,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2250',
    marginBottom: 3,
  },
  infoBannerDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6494',
    lineHeight: 17,
  },
  flameRibbonWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 4,
    marginBottom: 10,
  },
  sparkleLeft: {
    position: 'absolute',
    left: 56,
    top: 18,
  },
  sparkleRight: {
    position: 'absolute',
    right: 56,
    top: 24,
  },
  confettiLeft: {
    position: 'absolute',
    left: 20,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  confettiRight: {
    position: 'absolute',
    right: 20,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  flameOuter: {
    width: 96,
    height: 106,
    borderTopLeftRadius: 52,
    borderTopRightRadius: 52,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    backgroundColor: '#FF5757',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  flameInner: {
    width: 62,
    height: 68,
    borderRadius: 32,
    backgroundColor: '#FFE066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameNumberText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#D92638',
  },
  daysRibbon: {
    marginTop: -12,
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 12,
  },
  daysRibbonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  nextMilestoneCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    padding: 15,
    gap: 14,
    marginBottom: 14,
  },
  nextMilestoneSmall: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2B2250',
  },
  nextMilestoneBig: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2B2250',
    marginVertical: 2,
  },
  nextMilestoneRewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 2,
  },
  inlineRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coinCircleTiny: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinTinyText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#8C5300',
  },
  inlineRewardVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2B2250',
  },
  milestoneGridRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  milestoneMiniCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  milestoneMiniCardHighlighted: {
    borderColor: '#E879F9',
    backgroundColor: '#FDF4FF',
  },
  milestoneMiniNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2250',
    marginTop: 4,
  },
  milestoneMiniUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6494',
  },
  milestoneRewardCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  milestoneRewardCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  milestoneRewardDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#E8E1FA',
  },
  coinCircleLarge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFB800',
    borderWidth: 2,
    borderColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinLargeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8C5300',
  },
  milestoneRewardAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2B2250',
  },
  milestoneRewardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6494',
  },
  sectionHeaderLeft: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2250',
    marginBottom: 8,
  },
  calHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  calMonthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2B2250',
  },
  sadCloudContainer: {
    width: 150,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  sadCloudLobeLeft: {
    position: 'absolute',
    left: 16,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DDD0FF',
  },
  sadCloudLobeRight: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DDD0FF',
  },
  sadCloudCenter: {
    width: 92,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#E5DAFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  sadEyesRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 4,
  },
  sadEye: {
    width: 10,
    height: 12,
    borderRadius: 5,
    backgroundColor: '#2B2250',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 2,
  },
  sadEyePupil: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  sadMouth: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2B2250',
    marginTop: -2,
  },
  sadPawLeft: {
    position: 'absolute',
    bottom: 8,
    left: 38,
    width: 20,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#CBB8FF',
  },
  sadPawRight: {
    position: 'absolute',
    bottom: 8,
    right: 38,
    width: 20,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#CBB8FF',
  },
  historyCalendarCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  calArrowBtn: {
    padding: 4,
  },
  calMonthTitleBig: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2B2250',
  },
  calGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  calGridCellWrap: {
    width: '14.28%',
    alignItems: 'center',
  },
  calDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayDefault: {
    backgroundColor: '#F3EEFF',
  },
  calDayNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3B2F68',
  },
  historyStatCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 14,
    marginBottom: 10,
  },
  historyStatTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2B2250',
  },
  historyStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5B5082',
    marginTop: 2,
  },
  barChartIconWrap: {
    width: 34,
    height: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  barCol: {
    width: 6,
    borderRadius: 3,
    backgroundColor: '#7B4DFF',
  },
  bellHeroWrap: {
    width: 140,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  bellCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  reminderBenefitsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  reminderBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  reminderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBenefitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2B2250',
  },
  reminderDivider: {
    height: 1,
    backgroundColor: '#EFE9FF',
  },
  maybeLaterBtn: {
    paddingVertical: 8,
  },
  maybeLaterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4A3F78',
  },
});
