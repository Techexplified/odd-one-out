import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/context/GameContext';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { HeaderStats } from '@/components/HeaderStats';
import { AppIcon } from '@/components/AppIcon';
import { GameAsset } from '@/components/GameAsset';
import { GameBackground } from '@/components/GameBackground';
import { TileGraphic } from '@/components/TileGraphic';
import { DifficultyTier } from '@/types/game';
import {
  COINS_PER_STAR,
  getLevelMeta,
  LEVELS_PER_TIER,
  previewTiles,
  TIER_LABEL,
  tierForLevel,
  tierRange,
} from '@/utils/gameEngine';

type LevelScreenTab = DifficultyTier | 'endless';

export default function LevelsScreen() {
  const router = useRouter();
  const { stats, triggerHaptic } = useGame();
  const systemScheme = useColorScheme();
  const [selectedTier, setSelectedTier] = useState<LevelScreenTab>(() =>
    stats.currentLevel > 75 ? 'endless' : tierForLevel(stats.currentLevel)
  );
  const [endlessPage, setEndlessPage] = useState(() =>
    Math.max(0, Math.floor((Math.max(76, stats.currentLevel) - 76) / LEVELS_PER_TIER))
  );
  const [modalLevel, setModalLevel] = useState<number | null>(null);

  const isDark = stats.darkModeOverride !== null ? stats.darkModeOverride : systemScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const isEndlessTab = selectedTier === 'endless';
  const activeDiffTier: DifficultyTier = isEndlessTab ? 'hard' : selectedTier;
  const { start: baseStart, end: baseEnd } = tierRange(activeDiffTier);
  const tierStart = isEndlessTab ? 76 + endlessPage * LEVELS_PER_TIER : baseStart;
  const tierEnd = isEndlessTab ? tierStart + LEVELS_PER_TIER - 1 : baseEnd;
  const gridLevels = Array.from({ length: LEVELS_PER_TIER }, (_, i) => tierStart + i);

  // Wireframe challenge accent indices (1-based within tier)
  const challengePositions: Record<DifficultyTier, number[]> = {
    easy: [3, 5, 6, 9, 13, 17],
    medium: [4, 8, 12, 18, 22],
    hard: [3, 7, 14, 19, 25],
  };

  // Dynamic completion stats for the selected tier
  let completedInTier = 0;
  let earnedStarsInTier = 0;
  for (let lvl = tierStart; lvl <= tierEnd; lvl++) {
    const s = stats.levelStars[lvl] || 0;
    if (s > 0) completedInTier++;
    earnedStarsInTier += s;
  }

  const handleSelectTier = (tier: LevelScreenTab) => {
    triggerHaptic('light');
    setSelectedTier(tier);
  };

  const handleStartEndlessSurvival = () => {
    triggerHaptic('medium');
    router.push({
      pathname: '/game' as any,
      params: { mode: 'endless' },
    });
  };

  const handleTilePress = (lvl: number, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    triggerHaptic('light');
    setModalLevel(lvl);
  };

  const handleStartLevel = () => {
    if (modalLevel !== null) {
      triggerHaptic('medium');
      const lvl = modalLevel;
      setModalLevel(null);
      router.push({
        pathname: '/game' as any,
        params: { level: String(lvl) },
      });
    }
  };

  const handleProgressCardPress = () => {
    triggerHaptic('light');
    // Find first uncompleted unlocked level in this tier, or fallback to tierStart
    for (let lvl = tierStart; lvl <= tierEnd; lvl++) {
      if (lvl <= stats.highestLevelUnlocked && !(stats.levelStars[lvl] > 0)) {
        setModalLevel(lvl);
        return;
      }
    }
    if (tierStart <= stats.highestLevelUnlocked) {
      setModalLevel(tierStart);
    }
  };

  const modalMeta = modalLevel !== null ? getLevelMeta(modalLevel) : null;
  const modalPreview = modalLevel !== null ? previewTiles(modalLevel, 12) : [];
  const modalEarnedStars = modalLevel !== null ? stats.levelStars[modalLevel] || 0 : 0;
  const modalBestScore = modalLevel !== null ? stats.levelBestScore[modalLevel] || 0 : 0;
  const modalRemainingCoins = Math.max(0, 3 - modalEarnedStars) * COINS_PER_STAR;
  const isLemonTheme = modalMeta?.theme === 'Lemon';

  // Subtitle for completion progress card
  const getProgressSubtitle = () => {
    if (isEndlessTab) {
      return `Infinite levels unlocked! Keep pushing your limits (${tierStart}–${tierEnd}).`;
    }
    if (completedInTier >= LEVELS_PER_TIER) {
      return `Great! You finished all ${TIER_LABEL[activeDiffTier]} levels!`;
    }
    if (tierStart > stats.highestLevelUnlocked) {
      const prevTier = activeDiffTier === 'hard' ? 'Medium' : 'Easy';
      return `Complete ${prevTier} levels to unlock ${TIER_LABEL[activeDiffTier]}.`;
    }
    const remaining = LEVELS_PER_TIER - completedInTier;
    return `Keep going! ${remaining} ${remaining === 1 ? 'level' : 'levels'} left in ${TIER_LABEL[activeDiffTier]}.`;
  };

  const isHardTierLocked = tierRange('hard').start > stats.highestLevelUnlocked;

  return (
    <GameBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <HeaderStats showBack onBack={() => router.back()} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Header Title with Sparkles */}
          <View style={styles.titleRow}>
            <GameAsset name="sparkles" size={20} />
            <Text style={[styles.screenTitle, { color: isDark ? '#FFF' : '#1C1236' }]}>Levels</Text>
            <GameAsset name="sparkles" size={20} />
          </View>

          {/* Difficulty Segmented Tabs */}
          <View style={styles.tabsContainer}>
            {/* Easy Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectTier('easy')}
              style={[
                styles.tabPill,
                selectedTier === 'easy'
                  ? styles.tabEasyActive
                  : [
                      styles.tabInactive,
                      { backgroundColor: isDark ? theme.surface : '#FFFFFF', borderColor: theme.border },
                    ],
              ]}>
              <GameAsset name="leaf" size={18} />
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTier === 'easy' ? '#1E6B37' : theme.textMuted },
                ]}>
                Easy
              </Text>
            </TouchableOpacity>

            {/* Medium Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectTier('medium')}
              style={[
                styles.tabPill,
                selectedTier === 'medium'
                  ? styles.tabMediumActive
                  : [
                      styles.tabInactive,
                      { backgroundColor: isDark ? theme.surface : '#FFFFFF', borderColor: theme.border },
                    ],
              ]}>
              <GameAsset name="blossom" size={18} />
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTier === 'medium' ? '#FFFFFF' : theme.textMuted },
                ]}>
                Medium
              </Text>
            </TouchableOpacity>

            {/* Hard Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectTier('hard')}
              style={[
                styles.tabPill,
                selectedTier === 'hard'
                  ? styles.tabHardActive
                  : [
                      styles.tabInactive,
                      { backgroundColor: isDark ? theme.surface : '#FFFFFF', borderColor: theme.border },
                    ],
              ]}>
              <GameAsset name={isHardTierLocked ? 'lock' : 'fire'} size={17} />
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTier === 'hard' ? '#FFFFFF' : theme.textMuted },
                ]}>
                Hard
              </Text>
            </TouchableOpacity>

            {/* Endless Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectTier('endless')}
              style={[
                styles.tabPill,
                selectedTier === 'endless'
                  ? styles.tabEndlessActive
                  : [
                      styles.tabInactive,
                      { backgroundColor: isDark ? theme.surface : '#FFFFFF', borderColor: theme.border },
                    ],
              ]}>
              <GameAsset name="bolt" size={17} />
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTier === 'endless' ? '#FFFFFF' : theme.textMuted },
                ]}>
                Endless
              </Text>
            </TouchableOpacity>
          </View>

          {/* Endless Mode Survival Arena Hero Banner */}
          {isEndlessTab && (
            <View style={[styles.endlessArenaCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
              <View style={styles.endlessArenaHeader}>
                <View style={styles.endlessBadgeCircle}>
                  <GameAsset name="bolt" size={28} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.endlessArenaTitle, { color: isDark ? '#FFF' : '#1C1236' }]}>
                    Endless Survival Mode
                  </Text>
                  <Text style={[styles.endlessArenaSub, { color: theme.textMuted }]}>
                    Infinite waves • +4s per wave • Scaling 4×4 to 5×5 grids
                  </Text>
                </View>
              </View>

              <View style={styles.endlessStatsBanner}>
                <View style={styles.endlessStatCol}>
                  <Text style={styles.endlessStatVal}>{stats.endlessBestWave || 0}</Text>
                  <Text style={styles.endlessStatLbl}>Best Wave</Text>
                </View>
                <View style={styles.endlessStatDivider} />
                <View style={styles.endlessStatCol}>
                  <Text style={styles.endlessStatVal}>
                    {(stats.endlessBestScore || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.endlessStatLbl}>Best Score</Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStartEndlessSurvival}
                style={styles.modalPlayBtnWrapper}>
                <LinearGradient
                  colors={['#A855F7', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalPlayBtn}>
                  <View style={styles.modalPlayCircle}>
                    <AppIcon name="play-arrow" size={20} color="#A855F7" />
                  </View>
                  <Text style={styles.modalPlayBtnText}>Start Endless Survival</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Infinite Campaign Levels 76+ Page Selector */}
              <View style={styles.endlessPagerRow}>
                <TouchableOpacity
                  disabled={endlessPage <= 0}
                  onPress={() => {
                    triggerHaptic('light');
                    setEndlessPage((p) => Math.max(0, p - 1));
                  }}
                  style={[styles.pagerBtn, endlessPage <= 0 && { opacity: 0.35 }]}>
                  <AppIcon name="chevron-back" size={18} color="#7C4DFF" />
                </TouchableOpacity>
                <Text style={[styles.pagerTitle, { color: isDark ? '#FFF' : '#1C1236' }]}>
                  Master Levels {tierStart}–{tierEnd}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic('light');
                    setEndlessPage((p) => p + 1);
                  }}
                  style={styles.pagerBtn}>
                  <AppIcon name="chevron-forward" size={18} color="#7C4DFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 5x5 Levels Grid (25 tiles per tier) */}
          <View style={styles.gridContainer}>
            {gridLevels.map((lvl, index) => {
              const displayNum = isEndlessTab ? lvl : index + 1;
              const isUnlocked = lvl <= stats.highestLevelUnlocked;
              const isCurrent = lvl === stats.currentLevel;
              const earnedStars = stats.levelStars[lvl] || 0;
              const isRedNumber = challengePositions[activeDiffTier].includes(index + 1);

              const activeBorderStyle =
                selectedTier === 'easy'
                  ? styles.tileActiveEasy
                  : selectedTier === 'medium'
                  ? styles.tileActiveMedium
                  : styles.tileActiveHard;

              return (
                <TouchableOpacity
                  key={`tile-${lvl}`}
                  activeOpacity={0.7}
                  onPress={() => handleTilePress(lvl, isUnlocked)}
                  disabled={!isUnlocked}
                  style={[
                    styles.tile,
                    isUnlocked
                      ? [
                          styles.tileUnlocked,
                          { backgroundColor: isDark ? theme.surface : '#FFFFFF', borderColor: theme.border },
                          isCurrent && activeBorderStyle,
                        ]
                      : [
                          styles.tileLocked,
                          {
                            backgroundColor: isDark ? '#201A30' : '#EAE4F2',
                            borderColor: isDark ? '#2B2240' : '#DDD4E6',
                          },
                        ],
                  ]}>
                  {isUnlocked ? (
                    <>
                      <Text
                        style={[
                          styles.levelNum,
                          {
                            color: isRedNumber
                              ? '#FF2E75'
                              : isDark
                              ? '#FFFFFF'
                              : '#1C1236',
                          },
                        ]}>
                        {displayNum}
                      </Text>
                      {/* 3 Stars Row reflecting actual earned stars */}
                      <View style={styles.tileStars}>
                        {[1, 2, 3].map((starIdx) => (
                          <GameAsset
                            key={starIdx}
                            name="star"
                            size={10}
                            style={{ opacity: starIdx <= earnedStars ? 1 : 0.22 }}
                          />
                        ))}
                      </View>
                    </>
                  ) : (
                    <AppIcon name="lock-closed" size={17} color="#9E92B0" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Completion Progress Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleProgressCardPress}
            style={[styles.progressCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
            <GameAsset name="trophy" size={32} />
            <View style={styles.progressInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.progressTitle, { color: isDark ? '#FFF' : '#1C1236' }]}>
                  {completedInTier}/{LEVELS_PER_TIER} Completed • {earnedStarsInTier}/{LEVELS_PER_TIER * 3}
                </Text>
                <GameAsset name="star" size={15} />
              </View>
              <Text style={[styles.progressSubtitle, { color: theme.textMuted }]}>
                {getProgressSubtitle()}
              </Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color="#7C4DFF" />
          </TouchableOpacity>

          {/* Bottom spacing to reveal scenic flower garden from background */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Level Detail / Start Modal */}
        <Modal visible={modalLevel !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
              {/* Header: Title and Close button */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : '#1C1236' }]}>
                    Level {modalLevel}
                  </Text>
                  {modalBestScore > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <Text style={[styles.modalBestText, { color: theme.textMuted, marginTop: 0 }]}>
                        Best: {modalBestScore.toLocaleString()} pts ({modalEarnedStars}/3
                      </Text>
                      <GameAsset name="star" size={11} />
                      <Text style={[styles.modalBestText, { color: theme.textMuted, marginTop: 0 }]}>)</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setModalLevel(null)}
                  style={styles.modalCloseButton}>
                  <AppIcon name="close" size={18} color="#7C4DFF" />
                </TouchableOpacity>
              </View>

              {/* 3x4 Mini Preview Grid */}
              <View style={[styles.previewContainer, { backgroundColor: isDark ? theme.surfaceElevated : '#F8F3FA' }]}>
                {isLemonTheme ? (
                  <View style={styles.previewGrid}>
                    {Array.from({ length: 12 }, (_, idx) => (
                      <Image
                        key={idx}
                        source={
                          idx === 9
                            ? require('@/assets/images/lemon_odd_clean.png')
                            : require('@/assets/images/lemon_normal_clean.png')
                        }
                        style={styles.lemonImg}
                        resizeMode="contain"
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.previewGrid}>
                    {modalPreview.map((tile) => {
                      const { id: tileId, type: tileType, value: tileVal } = tile;
                      const previewBg =
                        tileType === 'color'
                          ? tileVal
                          : isDark
                          ? theme.surface
                          : '#FFFFFF';
                      return (
                        <View
                          key={tileId}
                          style={[
                            styles.previewTileBox,
                            {
                              backgroundColor: previewBg,
                              borderColor: theme.border,
                            },
                          ]}>
                          <TileGraphic tile={tile} size={42} fontSize={22} />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* 3 Info Columns (Theme, Difficulty, Time Limit) */}
              {modalMeta && (
                <View style={styles.infoRow}>
                  <View style={styles.infoCol}>
                    <GameAsset name="blossom" size={22} style={{ marginBottom: 2 }} />
                    <Text style={styles.infoLabel}>Theme</Text>
                    <Text
                      style={[styles.infoVal, { color: isDark ? '#FFF' : '#1C1236' }]}
                      numberOfLines={1}>
                      {modalMeta.theme}
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <GameAsset name="chart" size={22} style={{ marginBottom: 2 }} />
                    <Text style={styles.infoLabel}>Difficulty</Text>
                    <Text
                      style={[
                        styles.infoVal,
                        {
                          color:
                            modalMeta.tier === 'easy'
                              ? '#2E7D32'
                              : modalMeta.tier === 'medium'
                              ? '#FF2E75'
                              : '#6C38E8',
                        },
                      ]}>
                      {TIER_LABEL[modalMeta.tier]} ({modalMeta.gridSize}×{modalMeta.gridSize})
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <GameAsset name="stopwatch" size={22} style={{ marginBottom: 2 }} />
                    <Text style={styles.infoLabel}>Time Limit</Text>
                    <Text style={[styles.infoVal, { color: isDark ? '#FFF' : '#1C1236' }]}>
                      {modalMeta.timeLimitSeconds} seconds
                    </Text>
                  </View>
                </View>
              )}

              {/* Possible Rewards Container */}
              <View style={[styles.rewardsBox, { backgroundColor: isDark ? theme.surfaceElevated : '#F8F4FA' }]}>
                <Text style={styles.rewardsHeader}>
                  {modalEarnedStars === 3 ? 'All 3 Stars Earned! Replay for High Score' : 'Possible Rewards'}
                </Text>
                <View style={styles.rewardsRow}>
                  <View style={styles.rewardItem}>
                    <GameAsset name="coin" size={20} />
                    <Text style={[styles.rewardCount, { color: isDark ? '#FFF' : '#1C1236' }]}>
                      {modalRemainingCoins > 0 ? `Up to ${modalRemainingCoins}` : 'Cleared'}
                    </Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <GameAsset name="star" size={20} />
                    <Text style={[styles.rewardCount, { color: isDark ? '#FFF' : '#1C1236' }]}>1-3</Text>
                  </View>
                </View>
              </View>

              {/* Play Level Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStartLevel}
                style={styles.modalPlayBtnWrapper}>
                <LinearGradient
                  colors={['#FF3B7A', '#FF2366']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalPlayBtn}>
                  <View style={styles.modalPlayCircle}>
                    <AppIcon name="play-arrow" size={20} color="#FF2E75" />
                  </View>
                  <Text style={styles.modalPlayBtnText}>Play Level {modalLevel}</Text>
                </LinearGradient>
              </TouchableOpacity>
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
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    gap: 8,
  },
  sparkleIcon: {
    fontSize: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 10,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tabEasyActive: {
    backgroundColor: '#D4F6E2',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  tabMediumActive: {
    backgroundColor: '#FF4D8B',
    borderWidth: 1.5,
    borderColor: '#FF2E75',
  },
  tabHardActive: {
    backgroundColor: '#6C38E8',
    borderWidth: 1.5,
    borderColor: '#512DA8',
  },
  tabEndlessActive: {
    backgroundColor: '#A855F7',
    borderWidth: 1.5,
    borderColor: '#7E22CE',
  },
  endlessArenaCard: {
    borderRadius: 22,
    padding: 16,
    marginTop: 6,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  endlessArenaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  endlessBadgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endlessArenaTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  endlessArenaSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  endlessStatsBanner: {
    flexDirection: 'row',
    backgroundColor: '#F8F4FA',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  endlessStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  endlessStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7E22CE',
  },
  endlessStatLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E7BA8',
    marginTop: 2,
  },
  endlessStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5DCF0',
  },
  endlessPagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 6,
  },
  pagerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  tabInactive: {
    borderWidth: 1,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '800',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  tile: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    padding: 2,
  },
  tileUnlocked: {
    borderWidth: 1,
  },
  tileLocked: {
    borderWidth: 1,
  },
  tileActiveEasy: {
    backgroundColor: '#E6F9EE',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  tileActiveMedium: {
    backgroundColor: '#FFF0F5',
    borderColor: '#FF4D8B',
    borderWidth: 2,
  },
  tileActiveHard: {
    backgroundColor: '#F0EBFC',
    borderColor: '#6C38E8',
    borderWidth: 2,
  },
  levelNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  tileStars: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 1,
  },
  starGlyph: {
    fontSize: 8,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  trophyIcon: {
    fontSize: 28,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 28, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalBestText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 220,
    justifyContent: 'space-between',
    gap: 10,
  },
  lemonImg: {
    width: 42,
    height: 42,
  },
  previewTileBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: {
    fontSize: 24,
  },
  previewGlyph: {
    fontSize: 20,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  infoCol: {
    alignItems: 'center',
    flex: 1,
  },
  infoEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: '#9E8EB0',
    fontWeight: '700',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  rewardsBox: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardsHeader: {
    fontSize: 11,
    color: '#9E8EB0',
    fontWeight: '700',
    marginBottom: 6,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 28,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardIcon: {
    fontSize: 18,
  },
  rewardCount: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalPlayBtnWrapper: {
    width: '100%',
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#FF2E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 26,
    gap: 12,
  },
  modalPlayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPlayTriangle: {
    color: '#FF2E75',
    fontSize: 16,
    marginLeft: 2,
  },
  modalPlayBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
});
