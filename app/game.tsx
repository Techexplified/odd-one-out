import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/AppIcon';
import { GameAsset } from '@/components/GameAsset';
import { GameBackground } from '@/components/GameBackground';
import { SolutionConfetti } from '@/components/SolutionConfetti';
import { TileGraphic } from '@/components/TileGraphic';
import {
  DailyResult,
  EndlessResult,
  EXTRA_TIME_COST,
  EXTRA_TIME_SECONDS,
  HEART_REFILL_COST,
  HINT_COST,
  LevelResult,
  STREAK_MILESTONE_DAYS,
  useGame,
} from '@/context/GameContext';
import { useGameAudio } from '@/hooks/useGameAudio';
import { showMessage } from '@/utils/dialog';
import { formatCountdown, formatLongDate, formatMMSS, weekKeys } from '@/utils/date';
import {
  generateDailyLevel,
  generateEndlessWave,
  generateLevel,
  TIER_LABEL,
} from '@/utils/gameEngine';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ENDLESS_WAVE_BONUS_SECONDS = 4;
const ENDLESS_MAX_TIME_SECONDS = 45;

type BannerStatus = 'idle' | 'correct' | 'wrong' | 'timeout';

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    level?: string;
    mode?: string;
    isDaily?: string;
    practice?: string;
  }>();

  const isDailyMode = params.mode === 'daily' || params.isDaily === 'true';
  const isEndlessMode = params.mode === 'endless';
  const {
    stats,
    today,
    nextHeartInMs,
    completeLevel,
    completeDaily,
    completeEndlessRun,
    recordEndlessWaveProgress,
    recordMistake,
    recordTimeout,
    useHint,
    useExtraTime,
    buyHeartRefill,
    triggerHaptic,
  } = useGame();

  const { playTap, playSuccess, playError } = useGameAudio();

  const initialLevel = Math.max(1, Number(params.level) || stats.currentLevel || 1);

  const [currentLevelNum, setCurrentLevelNum] = useState(initialLevel);
  const [endlessWave, setEndlessWave] = useState(1);
  const [endlessWavesCleared, setEndlessWavesCleared] = useState(0);
  const endlessStartTsRef = useRef<number>(Date.now());

  const [config, setConfig] = useState(() =>
    isDailyMode
      ? generateDailyLevel(today)
      : isEndlessMode
      ? generateEndlessWave(1)
      : generateLevel(initialLevel)
  );
  const [timeLeft, setTimeLeft] = useState(config.timeLimitSeconds);
  const [totalTimeUsedBase, setTotalTimeUsedBase] = useState(config.timeLimitSeconds);
  const [mistakes, setMistakes] = useState(0);
  const [liveScore, setLiveScore] = useState(() =>
    isEndlessMode ? 0 : isDailyMode ? stats.dailyBestScore : stats.levelBestScore[initialLevel] || 0
  );
  const [bannerStatus, setBannerStatus] = useState<BannerStatus>('idle');
  const [correctTileId, setCorrectTileId] = useState<string | null>(null);
  const [wrongTileId, setWrongTileId] = useState<string | null>(null);
  const [eliminatedIds, setEliminatedIds] = useState<string[]>([]);

  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [levelResult, setLevelResult] = useState<LevelResult | null>(null);
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);
  const [endlessResult, setEndlessResult] = useState<EndlessResult | null>(null);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAttempt = useCallback(
    (lvl: number, daily: boolean, endless = isEndlessMode) => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      const nextCfg = daily
        ? generateDailyLevel(today)
        : endless
        ? generateEndlessWave(1)
        : generateLevel(lvl);
      setConfig(nextCfg);
      setTimeLeft(nextCfg.timeLimitSeconds);
      setTotalTimeUsedBase(nextCfg.timeLimitSeconds);
      setMistakes(0);
      setEndlessWave(1);
      setEndlessWavesCleared(0);
      endlessStartTsRef.current = Date.now();
      setLiveScore(
        endless ? 0 : daily ? stats.dailyBestScore : stats.levelBestScore[lvl] || 0
      );
      setBannerStatus('idle');
      setCorrectTileId(null);
      setWrongTileId(null);
      setEliminatedIds([]);
      setIsPaused(false);
      setIsGameOver(false);
      setLevelResult(null);
      setDailyResult(null);
      setEndlessResult(null);
    },
    [today, isEndlessMode, stats.dailyBestScore, stats.levelBestScore]
  );

  // Countdown timer
  const isPlaying =
    !isPaused &&
    !isGameOver &&
    !levelResult &&
    !dailyResult &&
    !endlessResult &&
    bannerStatus !== 'correct' &&
    bannerStatus !== 'timeout' &&
    stats.hearts > 0;

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  // Handle timer reaching 00:00 ("Time's up!")
  useEffect(() => {
    if (
      timeLeft === 0 &&
      bannerStatus !== 'timeout' &&
      bannerStatus !== 'correct' &&
      !levelResult &&
      !dailyResult &&
      !endlessResult &&
      !isGameOver
    ) {
      setBannerStatus('timeout');
      playError();
      recordTimeout();
      feedbackTimerRef.current = setTimeout(() => {
        if (isEndlessMode && endlessWavesCleared > 0) {
          const elapsedSec = Math.max(1, Math.round((Date.now() - endlessStartTsRef.current) / 1000));
          const res = completeEndlessRun(endlessWavesCleared, liveScore, mistakes, elapsedSec);
          setEndlessResult(res);
        } else {
          setIsGameOver(true);
        }
      }, 1200);
    }
  }, [
    timeLeft,
    bannerStatus,
    levelResult,
    dailyResult,
    endlessResult,
    isGameOver,
    isEndlessMode,
    endlessWavesCleared,
    liveScore,
    mistakes,
    completeEndlessRun,
    playError,
    recordTimeout,
  ]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const handleTilePress = (tileId: string, isOdd: boolean) => {
    if (bannerStatus === 'correct' || bannerStatus === 'timeout') return;
    if (stats.hearts <= 0) {
      setIsGameOver(true);
      return;
    }

    if (isOdd) {
      playSuccess();
      setWrongTileId(null);
      setCorrectTileId(tileId);
      setBannerStatus('correct');

      if (isEndlessMode) {
        const wavePoints = 100 + endlessWave * 25 + timeLeft * 5;
        const nextScore = liveScore + wavePoints;
        const nextWavesCleared = endlessWavesCleared + 1;
        const nextWave = endlessWave + 1;
        setLiveScore(nextScore);
        setEndlessWavesCleared(nextWavesCleared);
        recordEndlessWaveProgress(nextWavesCleared, nextScore);

        feedbackTimerRef.current = setTimeout(() => {
          const nextCfg = generateEndlessWave(nextWave);
          setEndlessWave(nextWave);
          setConfig(nextCfg);
          setTimeLeft((t) => Math.min(ENDLESS_MAX_TIME_SECONDS, t + ENDLESS_WAVE_BONUS_SECONDS));
          setBannerStatus('idle');
          setCorrectTileId(null);
          setWrongTileId(null);
          setEliminatedIds([]);
        }, 520);
        return;
      }

      setLiveScore((s) => s + 20);

      feedbackTimerRef.current = setTimeout(() => {
        if (isDailyMode) {
          const res = completeDaily(timeLeft, totalTimeUsedBase, mistakes);
          setDailyResult(res);
        } else {
          const res = completeLevel(
            currentLevelNum,
            timeLeft,
            totalTimeUsedBase,
            mistakes
          );
          setLevelResult(res);
        }
      }, 850);
    } else {
      playError();
      setWrongTileId(tileId);
      setBannerStatus('wrong');
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      const remainingHearts = recordMistake();
      if (remainingHearts <= 0) {
        feedbackTimerRef.current = setTimeout(() => {
          if (isEndlessMode && endlessWavesCleared > 0) {
            const elapsedSec = Math.max(1, Math.round((Date.now() - endlessStartTsRef.current) / 1000));
            const res = completeEndlessRun(endlessWavesCleared, liveScore, nextMistakes, elapsedSec);
            setEndlessResult(res);
          } else {
            setIsGameOver(true);
          }
        }, 900);
      } else {
        feedbackTimerRef.current = setTimeout(() => {
          setBannerStatus((curr) => (curr === 'wrong' ? 'idle' : curr));
          setWrongTileId(null);
        }, 1200);
      }
    }
  };

  const handleUseHint = () => {
    if (bannerStatus === 'correct' || bannerStatus === 'timeout' || isGameOver) return;
    const nonOddCandidates = config.tiles.filter(
      (t) => !t.isOdd && !eliminatedIds.includes(t.id)
    );
    if (nonOddCandidates.length === 0) {
      showMessage(
        'No Wrong Tiles Left',
        'All wrong tiles have already been eliminated! Tap the odd one to win.'
      );
      return;
    }
    const res = useHint();
    if (!res) {
      showMessage(
        'Not Enough Coins',
        `You need ${HINT_COST} coins to use a Hint.`
      );
      return;
    }
    playTap();
    // Shuffle the non-odd candidates to eliminate random wrong choices
    const shuffled = [...nonOddCandidates].sort(() => Math.random() - 0.5);
    // Eliminate up to 3 wrong choices per hint
    const countToEliminate = Math.min(3, shuffled.length);
    const toRemove = shuffled.slice(0, countToEliminate).map((t) => t.id);
    setEliminatedIds((prev) => [...prev, ...toRemove]);
  };

  const handleUseExtraTime = () => {
    if (bannerStatus === 'correct') return;
    const ok = useExtraTime();
    if (!ok) {
      showMessage(
        'Not Enough Coins',
        `You need ${EXTRA_TIME_COST} coins to add +${EXTRA_TIME_SECONDS}s.`
      );
      return;
    }
    playTap();
    if (feedbackTimerRef.current && bannerStatus === 'timeout') {
      clearTimeout(feedbackTimerRef.current);
      setBannerStatus('idle');
      setIsGameOver(false);
    }
    setTimeLeft((t) => t + EXTRA_TIME_SECONDS);
    setTotalTimeUsedBase((b) => b + EXTRA_TIME_SECONDS);
  };

  const handleShareDaily = async () => {
    if (!dailyResult) return;
    triggerHaptic('light');
    try {
      await Share.share({
        message: `Odd One Out — Daily Puzzle (${formatLongDate(today)})\nScore: ${dailyResult.score}\nTime: ${formatMMSS(dailyResult.timeTakenSec)}\nAccuracy: ${dailyResult.accuracy}%\nStreak: ${dailyResult.streak} Days in a row!`,
      });
    } catch {
      // ignore
    }
  };

  // Calculate responsive tile dimensions
  const screenW = Math.min(Dimensions.get('window').width, 460);
  const boardPadding = 14;
  const tileGap = 8;
  const availableGridW = screenW - 36 - boardPadding * 2;
  const tileSize = Math.floor(
    (availableGridW - tileGap * (config.gridCols - 1)) / config.gridCols
  );

  const week = useMemo(() => weekKeys(today), [today]);
  const completedSet = useMemo(() => new Set(stats.completedDates), [stats.completedDates]);
  const oddSolutionTile = useMemo(
    () => config.tiles.find((t) => t.isOdd) || config.tiles[0],
    [config.tiles]
  );

  /* ================================================================== */
  /* IMAGE 1 SCREEN 4: Result (Daily Completed)                         */
  /* ================================================================== */
  if (dailyResult) {
    const daysIntoCycle = dailyResult.streak % STREAK_MILESTONE_DAYS;
    const daysToNextReward = STREAK_MILESTONE_DAYS - daysIntoCycle;

    return (
      <GameBackground>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <SolutionConfetti
            solutionTile={oddSolutionTile}
            variant="shower"
            count={36}
            triggerKey={`daily-${today}-${dailyResult.score}`}
          />
          <ScrollView
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Top Purple Daily Puzzle Badge */}
            <LinearGradient
              colors={['#9C6BFF', '#7B4DFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyTopPill}>
              <AppIcon name="calendar-today" size={16} color="#FFFFFF" />
              <Text style={styles.dailyTopPillText}>Daily Puzzle</Text>
            </LinearGradient>

            {/* Crown + Completed! Ribbon */}
            <View style={styles.ribbonSection}>
              <View style={styles.confettiLeft}>
                <GameAsset name="party_popper" size={22} />
                <GameAsset name="sparkles" size={18} />
              </View>
              <View style={styles.confettiRight}>
                <GameAsset name="sparkles" size={18} />
                <GameAsset name="confetti_ball" size={22} />
              </View>
              <GameAsset name="crown" size={62} style={styles.crownHero} />
              <LinearGradient
                colors={['#E056FD', '#9B51E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.completedRibbon}>
                <Text style={styles.completedRibbonText}>Completed!</Text>
              </LinearGradient>
              <Text style={styles.resultDateText}>{formatLongDate(today)}</Text>
            </View>

            {/* 3-Column Stats Card (Score | Time | Accuracy) */}
            <View style={styles.resultStatsCard}>
              <View style={styles.resultStatCol}>
                <GameAsset name="star" size={26} />
                <Text style={styles.resultStatLabel}>Score</Text>
                <Text style={styles.resultStatValue}>{dailyResult.score}</Text>
                {dailyResult.isNewBest && (
                  <View style={styles.newBestPill}>
                    <Text style={styles.newBestPillText}>New Best!</Text>
                  </View>
                )}
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatCol}>
                <AppIcon name="schedule" size={26} color="#6D56D6" />
                <Text style={styles.resultStatLabel}>Time</Text>
                <Text style={styles.resultStatValue}>
                  {formatMMSS(dailyResult.timeTakenSec)}
                </Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatCol}>
                <GameAsset name="target" size={26} />
                <Text style={styles.resultStatLabel}>Accuracy</Text>
                <Text style={styles.resultStatValue}>{dailyResult.accuracy}%</Text>
              </View>
            </View>

            {/* Rewards Section */}
            <Text style={styles.rewardsHeading}>Rewards</Text>
            <View style={styles.rewardsInlineRow}>
              <View style={styles.rewardItemInline}>
                <GameAsset name="coin" size={26} />
                <Text style={styles.rewardAmountText}>
                  +{dailyResult.coinsEarned}
                </Text>
              </View>
              <View style={styles.rewardItemInline}>
                <GameAsset name="star" size={26} />
                <Text style={styles.rewardAmountText}>+{dailyResult.starsEarned}</Text>
              </View>
            </View>

            {/* Streak Card */}
            <View style={styles.dailyResultStreakCard}>
              <View style={{ flex: 1 }}>
                <View style={styles.streakRowHeader}>
                  <GameAsset name="fire" size={30} />
                  <View>
                    <Text style={styles.streakCountTitle}>
                      {dailyResult.streak} {dailyResult.streak === 1 ? 'Day' : 'Days'}
                    </Text>
                    <Text style={styles.streakCountSub}>in a row!</Text>
                  </View>
                </View>
                <View style={styles.weekCirclesRow}>
                  {week.map((dayKey, idx) => {
                    const isDone = completedSet.has(dayKey) || dayKey === today;
                    return (
                      <View
                        key={dayKey}
                        style={[
                          styles.dayDot,
                          isDone ? styles.dayDotDone : styles.dayDotPending,
                        ]}>
                        {isDone ? (
                          <AppIcon name="check" size={13} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.dayDotLetter}>{DAY_LETTERS[idx]}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.streakVerticalDivider} />

              <View style={styles.streakGiftCol}>
                <Image
                  source={require('@/assets/images/gift_box_hires_transparent.png')}
                  style={{ width: 46, height: 46, marginBottom: 4 }}
                  resizeMode="contain"
                />
                <Text style={styles.streakGiftText}>
                  Next reward{'\n'}in {daysToNextReward}{' '}
                  {daysToNextReward === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>

            {/* Share Result Pink Button */}
            <Pressable
              onPress={handleShareDaily}
              style={({ pressed }) => [
                styles.primaryPinkBtnOuter,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}>
              <LinearGradient
                colors={['#FF74A4', '#FF477E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryPinkBtnGradient}>
                <Text style={styles.primaryPinkBtnText}>Share Result</Text>
                <AppIcon name="share" size={18} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>

            {/* Bottom 2 Secondary Buttons: View Leaderboard | Back to Home */}
            <View style={styles.bottomDualRow}>
              <Pressable
                style={styles.secondaryWhiteBtn}
                onPress={() => {
                  triggerHaptic('light');
                  router.replace('/(tabs)/leaderboard');
                }}>
                <GameAsset name="trophy" size={20} />
                <Text style={styles.secondaryWhiteBtnText}>View Leaderboard</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryWhiteBtn}
                onPress={() => {
                  triggerHaptic('light');
                  router.replace('/(tabs)');
                }}>
                <AppIcon name="home" size={20} color="#7B4DFF" />
                <Text style={styles.secondaryWhiteBtnText}>Back to Home</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GameBackground>
    );
  }

  /* ================================================================== */
  /* IMAGE 2 SCREEN 6: Level Complete! (Campaign Result)                */
  /* ================================================================== */
  if (levelResult) {
    return (
      <GameBackground>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <SolutionConfetti
            solutionTile={oddSolutionTile}
            variant="shower"
            count={36}
            triggerKey={`lvl-${currentLevelNum}-${levelResult.score}`}
          />
          <ScrollView
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}>
            {/* 3 Big Gold Stars Arc */}
            <View style={styles.starsArcWrap}>
              <View style={styles.confettiLeft}>
                <GameAsset name="party_popper" size={22} />
                <GameAsset name="sparkles" size={18} />
              </View>
              <View style={styles.confettiRight}>
                <GameAsset name="sparkles" size={18} />
                <GameAsset name="confetti_ball" size={22} />
              </View>
              <GameAsset
                name="star"
                size={44}
                style={[
                  styles.starSide,
                  levelResult.stars < 1 && styles.starDimmed,
                ]}
              />
              <GameAsset
                name="star"
                size={58}
                style={[
                  styles.starCenter,
                  levelResult.stars < 2 && styles.starDimmed,
                ]}
              />
              <GameAsset
                name="star"
                size={44}
                style={[
                  styles.starSide,
                  levelResult.stars < 3 && styles.starDimmed,
                ]}
              />
            </View>

            {/* Pink Ribbon: Level Complete! */}
            <LinearGradient
              colors={['#FF6B9D', '#E93B78']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.levelCompleteRibbon}>
              <Text style={styles.completedRibbonText}>Level Complete!</Text>
            </LinearGradient>

            <Text style={styles.levelCompleteSubTitle}>Level {currentLevelNum}</Text>
            <Text style={styles.levelCompleteTierText}>{TIER_LABEL[config.tier]}</Text>

            {/* 3-Column Stats Card (Score | Time | Accuracy) */}
            <View style={styles.resultStatsCard}>
              <View style={styles.resultStatCol}>
                <GameAsset name="crown" size={26} />
                <Text style={styles.resultStatValue}>
                  {levelResult.score.toLocaleString()}
                </Text>
                <Text style={styles.resultStatLabel}>Score</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatCol}>
                <AppIcon name="schedule" size={26} color="#6D56D6" />
                <Text style={styles.resultStatValue}>
                  {formatMMSS(levelResult.timeTakenSec)}
                </Text>
                <Text style={styles.resultStatLabel}>Time</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatCol}>
                <GameAsset name="target" size={26} />
                <Text style={styles.resultStatValue}>{levelResult.accuracy}%</Text>
                <Text style={styles.resultStatLabel}>Accuracy</Text>
              </View>
            </View>

            {/* Rewards Card */}
            <View style={styles.rewardsBoxCard}>
              <Text style={styles.rewardsBoxTitle}>Rewards</Text>
              <View style={styles.rewardsInlineRow}>
                <View style={styles.rewardItemInline}>
                  <GameAsset name="coin" size={26} />
                  <Text style={styles.rewardAmountText}>
                    +{levelResult.coinsEarned}
                  </Text>
                </View>
                <View style={styles.resultStatDivider} />
                <View style={styles.rewardItemInline}>
                  <GameAsset name="star" size={26} />
                  <Text style={styles.rewardAmountText}>+{levelResult.starsEarned}</Text>
                </View>
              </View>
            </View>

            {/* Next Level Pink Button */}
            <Pressable
              onPress={() => {
                triggerHaptic('medium');
                const nextLvl = currentLevelNum + 1;
                setCurrentLevelNum(nextLvl);
                startAttempt(nextLvl, false);
              }}
              style={({ pressed }) => [
                styles.primaryPinkBtnOuter,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}>
              <LinearGradient
                colors={['#FF74A4', '#FF477E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryPinkBtnGradient}>
                <Text style={styles.primaryPinkBtnText}>Next Level</Text>
                <AppIcon name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>

            {/* Play Again | Home */}
            <View style={styles.bottomDualRow}>
              <Pressable
                style={styles.secondaryWhiteBtn}
                onPress={() => {
                  triggerHaptic('light');
                  startAttempt(currentLevelNum, false);
                }}>
                <AppIcon name="refresh" size={20} color="#7B4DFF" />
                <Text style={styles.secondaryWhiteBtnText}>Play Again</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryWhiteBtn}
                onPress={() => {
                  triggerHaptic('light');
                  router.replace('/(tabs)');
                }}>
                <AppIcon name="home" size={20} color="#7B4DFF" />
                <Text style={styles.secondaryWhiteBtnText}>Home</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GameBackground>
    );
  }

  /* ================================================================== */
  /* ENDLESS MODE RESULT SCREEN                                         */
  /* ================================================================== */
  if (endlessResult) {
    return (
      <GameBackground>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <SolutionConfetti
            solutionTile={oddSolutionTile}
            variant="shower"
            count={36}
            triggerKey={`endless-${endlessResult.wavesCleared}-${endlessResult.score}`}
          />
          <ScrollView
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Top Endless Pill */}
            <LinearGradient
              colors={['#A855F7', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyTopPill}>
              <GameAsset name="bolt" size={16} />
              <Text style={styles.dailyTopPillText}>Endless Mode</Text>
            </LinearGradient>

            {/* Crown + Endless Run Complete! Ribbon */}
            <View style={styles.ribbonSection}>
              <View style={styles.confettiLeft}>
                <GameAsset name="party_popper" size={22} />
                <GameAsset name="sparkles" size={18} />
              </View>
              <View style={styles.confettiRight}>
                <GameAsset name="sparkles" size={18} />
                <GameAsset name="confetti_ball" size={22} />
              </View>
              <GameAsset name="trophy" size={62} style={styles.crownHero} />
              <LinearGradient
                colors={['#A855F7', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.completedRibbon}>
                <Text style={styles.completedRibbonText}>
                  {endlessResult.wavesCleared} {endlessResult.wavesCleared === 1 ? 'Wave' : 'Waves'} Cleared!
                </Text>
              </LinearGradient>
              <Text style={styles.resultDateText}>
                Best Record: Wave {stats.endlessBestWave} • {stats.endlessBestScore.toLocaleString()} pts
              </Text>
            </View>

            {/* 3-Column Stats Card (Score | Waves | Accuracy) */}
            <View style={styles.resultStatsCard}>
              <View style={styles.resultStatCol}>
                <GameAsset name="crown" size={26} />
                <Text style={styles.resultStatValue}>
                  {endlessResult.score.toLocaleString()}
                </Text>
                <Text style={styles.resultStatLabel}>Score</Text>
                {endlessResult.isNewBestScore && (
                  <View style={styles.newBestPill}>
                    <Text style={styles.newBestPillText}>New Best!</Text>
                  </View>
                )}
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatCol}>
                <GameAsset name="bolt" size={26} />
                <Text style={styles.resultStatValue}>{endlessResult.wavesCleared}</Text>
                <Text style={styles.resultStatLabel}>Waves</Text>
                {endlessResult.isNewBestWave && (
                  <View style={styles.newBestPill}>
                    <Text style={styles.newBestPillText}>Record!</Text>
                  </View>
                )}
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatCol}>
                <GameAsset name="target" size={26} />
                <Text style={styles.resultStatValue}>{endlessResult.accuracy}%</Text>
                <Text style={styles.resultStatLabel}>Accuracy</Text>
              </View>
            </View>

            {/* Rewards Card */}
            <View style={styles.rewardsBoxCard}>
              <Text style={styles.rewardsBoxTitle}>Rewards Earned</Text>
              <View style={styles.rewardsInlineRow}>
                <View style={styles.rewardItemInline}>
                  <GameAsset name="coin" size={26} />
                  <Text style={styles.rewardAmountText}>
                    +{endlessResult.coinsEarned}
                  </Text>
                </View>
                <View style={styles.resultStatDivider} />
                <View style={styles.rewardItemInline}>
                  <GameAsset name="star" size={26} />
                  <Text style={styles.rewardAmountText}>+{endlessResult.starsEarned}</Text>
                </View>
              </View>
            </View>

            {/* Play Endless Again Button */}
            <Pressable
              onPress={() => {
                triggerHaptic('medium');
                startAttempt(1, false, true);
              }}
              style={({ pressed }) => [
                styles.primaryPinkBtnOuter,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}>
              <LinearGradient
                colors={['#FF74A4', '#FF477E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryPinkBtnGradient}>
                <AppIcon name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.primaryPinkBtnText}>Play Endless Again</Text>
              </LinearGradient>
            </Pressable>

            {/* View Leaderboard | Home */}
            <View style={styles.bottomDualRow}>
              <Pressable
                style={styles.secondaryWhiteBtn}
                onPress={() => {
                  triggerHaptic('light');
                  router.replace('/(tabs)/leaderboard');
                }}>
                <GameAsset name="trophy" size={20} />
                <Text style={styles.secondaryWhiteBtnText}>Leaderboard</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryWhiteBtn}
                onPress={() => {
                  triggerHaptic('light');
                  router.replace('/(tabs)');
                }}>
                <AppIcon name="home" size={20} color="#7B4DFF" />
                <Text style={styles.secondaryWhiteBtnText}>Home</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GameBackground>
    );
  }

  /* ================================================================== */
  /* GAMEPLAY SCREEN (Image 1 Screen 3 & Image 2 Screens 1–5)           */
  /* ================================================================== */
  return (
    <GameBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.gameContainer}>
          {/* ROW 1: Back Button | Mode/Level Pill | Hearts Pill */}
          <View style={styles.topHeaderRow}>
            <Pressable
              style={styles.circleIconBtn}
              onPress={() => {
                triggerHaptic('light');
                setIsPaused(true);
              }}>
              <AppIcon name="arrow-back" size={22} color="#2B2250" />
            </Pressable>

            {isDailyMode ? (
              <LinearGradient
                colors={['#9B6BFF', '#7B4DFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dailyHeaderPill}>
                <AppIcon name="calendar-today" size={15} color="#FFFFFF" />
                <Text style={styles.dailyHeaderPillText}>Daily Puzzle</Text>
              </LinearGradient>
            ) : isEndlessMode ? (
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setIsPaused(true);
                }}>
                <LinearGradient
                  colors={['#A855F7', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dailyHeaderPill}>
                  <GameAsset name="bolt" size={15} />
                  <Text style={styles.dailyHeaderPillText}>
                    ENDLESS • WAVE {endlessWave}
                  </Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setIsPaused(true);
                }}>
                <LinearGradient
                  colors={['#6271F8', '#4A56E2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.levelBadgePill}>
                  <Text style={styles.levelBadgeText}>LEVEL {currentLevelNum}</Text>
                </LinearGradient>
              </Pressable>
            )}

            {/* 3 Hearts Pill */}
            <View style={styles.heartsPill}>
              {Array.from({ length: stats.maxHearts }, (_, i) => {
                const active = i < stats.hearts;
                return (
                  <AppIcon
                    key={i}
                    name="favorite"
                    size={19}
                    color={active ? '#FF477E' : '#DED6F4'}
                  />
                );
              })}
            </View>
          </View>

          {/* ROW 2: Daily Timer Row OR Campaign 3-Pill Stats Bar */}
          {isDailyMode ? (
            <View style={styles.dailySubRow}>
              <Pressable
                style={styles.circleIconBtn}
                onPress={() => {
                  triggerHaptic('light');
                  setIsPaused(true);
                }}>
                <AppIcon name="pause" size={20} color="#2B2250" />
              </Pressable>

              <LinearGradient
                colors={['#FF6D9B', '#FF477E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dailyTimerPill}>
                <AppIcon name="schedule" size={18} color="#FFFFFF" />
                <Text style={styles.dailyTimerText}>{formatMMSS(timeLeft)}</Text>
              </LinearGradient>

              <View style={{ width: 40 }} />
            </View>
          ) : (
            <View style={styles.campaignStatsRow}>
              {/* Score Pill */}
              <View style={styles.campaignStatPill}>
                <GameAsset name="crown" size={20} />
                <View>
                  <Text style={styles.campaignStatNumber}>{liveScore}</Text>
                  <Text style={styles.campaignStatSub}>Score</Text>
                </View>
              </View>

              {/* Time Pill */}
              <Pressable
                style={styles.campaignStatPill}
                onPress={() => {
                  triggerHaptic('light');
                  setIsPaused(true);
                }}>
                <View style={styles.pinkClockCircle}>
                  <AppIcon name="schedule" size={15} color="#FFFFFF" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.campaignStatNumber,
                      { color: '#FF3874' },
                    ]}>
                    {formatMMSS(timeLeft)}
                  </Text>
                  <Text style={styles.campaignStatSub}>Time</Text>
                </View>
              </Pressable>

              {/* Coins Pill */}
              <View style={styles.campaignStatPill}>
                <GameAsset name="coin" size={20} />
                <View>
                  <Text style={styles.campaignStatNumber}>{stats.coins}</Text>
                  <Text style={styles.campaignStatSub}>Coins</Text>
                </View>
              </View>
            </View>
          )}

          {/* ROW 3: Dynamic Status Banner */}
          {bannerStatus === 'correct' ? (
            <LinearGradient
              colors={['#35D475', '#21B55D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBanner}>
              <View style={styles.bannerIconCircleWhite}>
                <AppIcon name="check" size={16} color="#21B55D" />
              </View>
              <Text style={styles.statusBannerTextLight}>
                {isEndlessMode ? `Wave Cleared! +${ENDLESS_WAVE_BONUS_SECONDS}s` : 'Correct!'}
              </Text>
            </LinearGradient>
          ) : bannerStatus === 'wrong' ? (
            <LinearGradient
              colors={['#FF5282', '#E53464']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBanner}>
              <View style={styles.bannerIconCircleWhite}>
                <AppIcon name="close" size={16} color="#E53464" />
              </View>
              <Text style={styles.statusBannerTextLight}>Oops! Try again!</Text>
            </LinearGradient>
          ) : bannerStatus === 'timeout' ? (
            <LinearGradient
              colors={['#FF5288', '#D9388A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBanner}>
              <View style={styles.bannerIconCircleWhite}>
                <AppIcon name="schedule" size={16} color="#D9388A" />
              </View>
              <Text style={styles.statusBannerTextLight}>Time&apos;s up!</Text>
            </LinearGradient>
          ) : isDailyMode ? (
            <View style={styles.dailyWhitePromptBanner}>
              <Text style={styles.dailyWhitePromptText}>Find the odd one out!</Text>
            </View>
          ) : (
            <LinearGradient
              colors={['#7E57FF', '#5D3AE6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBanner}>
              <GameAsset name="sparkles" size={16} />
              <Text style={styles.statusBannerTextUppercase}>
                FIND THE ODD ONE OUT!
              </Text>
            </LinearGradient>
          )}

          {/* MAIN GRID BOARD */}
          <View style={styles.boardCard}>
            <View style={[styles.tilesWrap, { gap: tileGap }]}>
              {config.tiles.map((tile) => {
                const isSelectedCorrect = correctTileId === tile.id;
                const isSelectedWrong = wrongTileId === tile.id;
                const isEliminated = eliminatedIds.includes(tile.id);
                const isTimeoutReveal = bannerStatus === 'timeout' && tile.isOdd;

                return (
                  <Pressable
                    key={tile.id}
                    disabled={isEliminated}
                    onPress={() => handleTilePress(tile.id, tile.isOdd)}
                    style={[
                      styles.tileCell,
                      {
                        width: tileSize,
                        height: tileSize * (isDailyMode ? 0.96 : 0.88),
                      },
                      isSelectedCorrect && styles.tileCellCorrect,
                      isSelectedWrong && styles.tileCellWrong,
                      isTimeoutReveal && styles.tileCellHinted,
                      isEliminated && styles.tileCellEliminated,
                    ]}>
                    <TileGraphic
                      tile={tile}
                      size={tileSize * 0.88}
                      fontSize={Math.round(tileSize * 0.5)}
                    />

                    {/* Red X badge on wrong tile (matches Image 2 Screen 3) */}
                    {isSelectedWrong && (
                      <View style={styles.wrongCornerBadge}>
                        <AppIcon name="close" size={11} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* BOTTOM POWER-UP BAR: Hint (20) | +10s (20) */}
          <View style={styles.powerUpRow}>
            <Pressable
              onPress={handleUseHint}
              style={({ pressed }) => [
                styles.powerUpCard,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}>
              <GameAsset name="bulb" size={32} />
              <View>
                <Text style={styles.powerUpTitle}>Hint</Text>
                <View style={styles.powerUpCostRow}>
                  <GameAsset name="coin" size={16} />
                  <Text style={styles.powerUpCostText}>
                    {stats.hintsRemaining > 0 ? `Free (${stats.hintsRemaining})` : HINT_COST}
                  </Text>
                </View>
              </View>
            </Pressable>

            <Pressable
              onPress={handleUseExtraTime}
              style={({ pressed }) => [
                styles.powerUpCard,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}>
              <View style={styles.timerPowerIconCircle}>
                <AppIcon name="schedule" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.powerUpTitle}>+{EXTRA_TIME_SECONDS}s</Text>
                <View style={styles.powerUpCostRow}>
                  <GameAsset name="coin" size={16} />
                  <Text style={styles.powerUpCostText}>{EXTRA_TIME_COST}</Text>
                </View>
              </View>
            </Pressable>
          </View>

          {bannerStatus === 'correct' && (
            <SolutionConfetti
              solutionTile={oddSolutionTile}
              variant="burst"
              count={30}
              triggerKey={`burst-${correctTileId}-${endlessWave}`}
            />
          )}
        </View>

        {/* ============================================================ */}
        {/* IMAGE 2 SCREEN 5: Paused Modal                               */}
        {/* ============================================================ */}
        <Modal
          visible={isPaused}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPaused(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.pauseCard}>
              <View style={styles.pauseHeaderRow}>
                <View style={{ width: 32 }} />
                <Text style={styles.pauseTitle}>Paused</Text>
                <Pressable
                  style={styles.pauseCloseBtn}
                  onPress={() => {
                    triggerHaptic('light');
                    setIsPaused(false);
                  }}>
                  <AppIcon name="close" size={18} color="#4A3F78" />
                </Pressable>
              </View>

              {/* 1. Resume (Pink Gradient) */}
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setIsPaused(false);
                }}
                style={({ pressed }) => [
                  styles.pauseResumeOuter,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}>
                <LinearGradient
                  colors={['#FF74A4', '#FF477E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pauseResumeGradient}>
                  <View style={styles.resumePlayCircle}>
                    <AppIcon name="play-arrow" size={18} color="#FF477E" />
                  </View>
                  <Text style={styles.pauseResumeText}>Resume</Text>
                </LinearGradient>
              </Pressable>

              {/* 2. Restart Level */}
              <Pressable
                style={styles.pauseOptionBtn}
                onPress={() => {
                  triggerHaptic('medium');
                  startAttempt(currentLevelNum, isDailyMode);
                }}>
                <AppIcon name="refresh" size={22} color="#7B4DFF" />
                <Text style={styles.pauseOptionText}>Restart Level</Text>
              </Pressable>

              {/* 3. Settings */}
              <Pressable
                style={styles.pauseOptionBtn}
                onPress={() => {
                  triggerHaptic('light');
                  setIsPaused(false);
                  router.push('/settings');
                }}>
                <AppIcon name="settings" size={22} color="#7B4DFF" />
                <Text style={styles.pauseOptionText}>Settings</Text>
              </Pressable>

              {/* 4. Exit to Home */}
              <Pressable
                style={styles.pauseOptionBtn}
                onPress={() => {
                  triggerHaptic('light');
                  if (isEndlessMode && endlessWavesCleared > 0) {
                    const elapsedSec = Math.max(
                      1,
                      Math.round((Date.now() - endlessStartTsRef.current) / 1000)
                    );
                    completeEndlessRun(endlessWavesCleared, liveScore, mistakes, elapsedSec);
                  }
                  setIsPaused(false);
                  router.replace('/(tabs)');
                }}>
                <AppIcon name="home" size={22} color="#7B4DFF" />
                <Text style={styles.pauseOptionText}>Exit to Home</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ============================================================ */}
        {/* Out of Time / Out of Hearts Modal                            */}
        {/* ============================================================ */}
        <Modal
          visible={isGameOver}
          transparent
          animationType="fade"
          onRequestClose={() => setIsGameOver(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.pauseCard}>
              <Text style={styles.pauseTitle}>
                {stats.hearts <= 0 ? 'Out of Hearts!' : "Time's Up!"}
              </Text>
              <Text style={styles.gameOverSub}>
                {stats.hearts <= 0
                  ? nextHeartInMs !== null
                    ? `Next heart in ${formatCountdown(nextHeartInMs)}`
                    : 'Refill your hearts to keep playing!'
                  : `Hint: ${config.hintDescription}`}
              </Text>

              {stats.hearts <= 0 ? (
                <Pressable
                  onPress={() => {
                    const res = buyHeartRefill();
                    if (res === 'ok') {
                      startAttempt(currentLevelNum, isDailyMode);
                    } else if (res === 'insufficient') {
                      showMessage(
                        'Not Enough Coins',
                        `You need ${HEART_REFILL_COST} coins to refill hearts.`
                      );
                    }
                  }}
                  style={styles.pauseResumeOuter}>
                  <LinearGradient
                    colors={['#FF74A4', '#FF477E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.pauseResumeGradient}>
                    <Text style={styles.pauseResumeText}>
                      Refill Hearts ({HEART_REFILL_COST}
                    </Text>
                    <GameAsset name="coin" size={16} />
                    <Text style={styles.pauseResumeText}>)</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => startAttempt(currentLevelNum, isDailyMode)}
                  style={styles.pauseResumeOuter}>
                  <LinearGradient
                    colors={['#FF74A4', '#FF477E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.pauseResumeGradient}>
                    <AppIcon name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.pauseResumeText}>Try Again</Text>
                  </LinearGradient>
                </Pressable>
              )}

              <Pressable
                style={styles.pauseOptionBtn}
                onPress={handleUseExtraTime}>
                <AppIcon name="schedule" size={20} color="#7B4DFF" />
                <Text style={styles.pauseOptionText}>
                  Continue +{EXTRA_TIME_SECONDS}s ({EXTRA_TIME_COST} Coins)
                </Text>
              </Pressable>

              <Pressable
                style={styles.pauseOptionBtn}
                onPress={() => {
                  setIsGameOver(false);
                  router.replace('/(tabs)');
                }}>
                <AppIcon name="home" size={20} color="#7B4DFF" />
                <Text style={styles.pauseOptionText}>Exit to Home</Text>
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
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  gameContainer: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 14,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2B2250',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dailyHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  dailyHeaderPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  levelBadgePill: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 999,
    shadowColor: '#4A56E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  heartsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 3,
  },
  dailySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dailyTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },
  dailyTimerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  campaignStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  campaignStatPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 6,
  },
  campaignStatNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2B2250',
  },
  campaignStatSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7A709E',
    marginTop: -2,
  },
  pinkClockCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF477E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinCircleTiny: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFB800',
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinTinyText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8C5300',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 12,
    gap: 8,
  },
  bannerIconCircleWhite: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerTextLight: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  statusBannerTextUppercase: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  sparkleGlyph: {
    color: '#FFD54F',
    fontSize: 14,
  },
  dailyWhitePromptBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dailyWhitePromptText: {
    color: '#2B2250',
    fontSize: 16,
    fontWeight: '900',
  },
  boardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 26,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 14,
  },
  tilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tileCell: {
    borderRadius: 16,
    backgroundColor: '#FAF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileCellCorrect: {
    backgroundColor: '#E5FBEE',
    borderColor: '#25C965',
    shadowColor: '#25C965',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  tileCellWrong: {
    backgroundColor: '#FFE8EF',
    borderColor: '#FF4B7D',
  },
  tileCellHinted: {
    borderColor: '#FFB800',
    backgroundColor: '#FFF9E6',
  },
  tileCellEliminated: {
    opacity: 0.16,
    backgroundColor: '#EEECF5',
    borderColor: 'transparent',
  },
  wrongCornerBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerUpRow: {
    flexDirection: 'row',
    gap: 12,
  },
  powerUpCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  powerUpMainIcon: {
    fontSize: 30,
  },
  timerPowerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7B4DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerUpTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2250',
  },
  powerUpCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  powerUpCostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4A3F78',
  },
  /* Pause Modal (Image 2 Screen 5) */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 16, 48, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  pauseCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  pauseHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pauseTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2B2250',
  },
  pauseCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseResumeOuter: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  pauseResumeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  resumePlayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseResumeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  pauseOptionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F0FF',
    borderRadius: 18,
    paddingVertical: 14,
    gap: 10,
  },
  pauseOptionText: {
    color: '#2B2250',
    fontSize: 15,
    fontWeight: '800',
  },
  gameOverSub: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6E6494',
    textAlign: 'center',
    marginBottom: 4,
  },
  /* Celebration Result Screens (Image 1 Screen 4 & Image 2 Screen 6) */
  resultScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
  },
  dailyTopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
    marginBottom: 8,
  },
  dailyTopPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  ribbonSection: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  confettiLeft: {
    position: 'absolute',
    left: 16,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  confettiRight: {
    position: 'absolute',
    right: 16,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  crownHero: {
    marginBottom: -10,
    zIndex: 2,
  },
  completedRibbon: {
    paddingHorizontal: 38,
    paddingVertical: 11,
    borderRadius: 16,
    shadowColor: '#9B51E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  levelCompleteRibbon: {
    paddingHorizontal: 34,
    paddingVertical: 11,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#E93B78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completedRibbonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  resultDateText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#5D5386',
  },
  starsArcWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
    width: '100%',
  },
  starSide: {
    marginBottom: 0,
  },
  starCenter: {
    marginBottom: 8,
  },
  starDimmed: {
    opacity: 0.25,
  },
  levelCompleteSubTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2B2250',
  },
  levelCompleteTierText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1EA664',
    marginBottom: 14,
  },
  resultStatsCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 14,
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  resultStatCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  resultStatDivider: {
    width: 1,
    height: 54,
    backgroundColor: '#E8E1FA',
  },
  resultStatEmoji: {
    fontSize: 24,
  },
  resultStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6494',
  },
  resultStatValue: {
    fontSize: 21,
    fontWeight: '900',
    color: '#2B2250',
  },
  newBestPill: {
    backgroundColor: '#8B5CF6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  newBestPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  rewardsHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2250',
    marginBottom: 8,
  },
  rewardsBoxCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardsBoxTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2B2250',
    marginBottom: 8,
  },
  rewardsInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 14,
  },
  rewardItemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinCircleSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFB800',
    borderWidth: 2,
    borderColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInnerSymbol: {
    fontSize: 15,
    fontWeight: '900',
    color: '#8C5300',
  },
  rewardAmountText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2B2250',
  },
  dailyResultStreakCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    padding: 15,
    marginBottom: 16,
  },
  streakRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  streakCountTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2B2250',
  },
  streakCountSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6494',
  },
  weekCirclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotDone: {
    backgroundColor: '#22C55E',
  },
  dayDotPending: {
    backgroundColor: '#ECE6FF',
  },
  dayDotLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7D72A8',
  },
  streakVerticalDivider: {
    width: 1,
    height: 64,
    backgroundColor: '#E8E1FA',
    marginHorizontal: 12,
  },
  streakGiftCol: {
    alignItems: 'center',
    width: 88,
  },
  streakGiftText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A5080',
    textAlign: 'center',
    lineHeight: 14,
  },
  primaryPinkBtnOuter: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#FF477E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryPinkBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  primaryPinkBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  bottomDualRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  secondaryWhiteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 18,
    paddingVertical: 13,
    gap: 6,
  },
  secondaryWhiteBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2B2250',
  },
});
