import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/AppIcon';
import { AvatarGraphic, GameAsset } from '@/components/GameAsset';
import { GameBackground } from '@/components/GameBackground';
import { HeaderStats } from '@/components/HeaderStats';
import { useGame } from '@/context/GameContext';
import { formatHMS, formatLongDate, msUntilNextDay } from '@/utils/date';
import {
  computePlayerScores,
  flushPendingHighScoreSync,
  getCachedDevicePlayerId,
  getDevicePlayerId,
  getSyncState,
  RemoteLeaderboardsResponse,
  subscribeHighScoreSync,
  SyncStatus,
} from '@/utils/highscoreApi';

type TabMode = 'allTime' | 'daily' | 'endless';

interface Competitor {
  id: string;
  name: string;
  score: number;
  avatar: string;
  isUser?: boolean;
}

function AvatarCircle({
  avatar,
  size,
}: {
  avatar: string;
  size: number;
}) {
  return <AvatarGraphic avatar={avatar} size={size} />;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { stats, today, isDailyCompletedToday, triggerHaptic } = useGame();

  const {
    dailyScore: userDailyScore,
    allTimeScore: userAllTimeScore,
    endlessBestScore: userEndlessScore,
  } = useMemo(() => computePlayerScores(stats, today), [stats, today]);

  const [tab, setTab] = useState<TabMode>('allTime');
  const [userPickedTab, setUserPickedTab] = useState(false);
  const [msLeft, setMsLeft] = useState(() => msUntilNextDay());
  const [remoteBoards, setRemoteBoards] = useState<RemoteLeaderboardsResponse | null>(
    () => getSyncState().leaderboards
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncState().status);
  const [devicePlayerId, setDevicePlayerId] = useState<string | null>(() =>
    getCachedDevicePlayerId()
  );

  useEffect(() => {
    if (userPickedTab) return;
    if (userAllTimeScore > 0) {
      setTab('allTime');
    } else if (isDailyCompletedToday && userDailyScore > 0) {
      setTab('daily');
    } else if (userEndlessScore > 0) {
      setTab('endless');
    }
  }, [userPickedTab, isDailyCompletedToday, userDailyScore, userAllTimeScore, userEndlessScore]);

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(msUntilNextDay());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = subscribeHighScoreSync((state) => {
      setSyncStatus(state.status);
      if (state.playerId) {
        setDevicePlayerId(state.playerId);
      }
      if (state.leaderboards) {
        setRemoteBoards(state.leaderboards);
      }
    });
    return unsub;
  }, []);

  // Sync whenever any score or profile field changes
  useEffect(() => {
    let active = true;
    (async () => {
      const pid = await getDevicePlayerId();
      if (active) setDevicePlayerId(pid);
      const synced = await flushPendingHighScoreSync(stats, today);
      if (active && synced) {
        setRemoteBoards(synced);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    today,
    userAllTimeScore,
    userDailyScore,
    stats.highScore,
    stats.endlessBestScore,
    stats.playerName,
    stats.avatar,
    stats.stars,
  ]);

  // Also refresh & flush whenever the Leaderboard tab gains focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      flushPendingHighScoreSync(stats, today).then((synced) => {
        if (active && synced) {
          setRemoteBoards(synced);
        }
      });
      return () => {
        active = false;
      };
    }, [stats, today])
  );

  const activeUserScore =
    tab === 'daily'
      ? userDailyScore
      : tab === 'endless'
      ? userEndlessScore
      : userAllTimeScore;

  // Build ranked leaderboard from SQLite backend (with automatic offline local fallback)
  const rankedBoard = useMemo(() => {
    const activePid = devicePlayerId || getCachedDevicePlayerId();
    const remoteList =
      tab === 'daily'
        ? remoteBoards?.daily
        : tab === 'endless'
        ? remoteBoards?.endless
        : remoteBoards?.allTime;
    const mapped: Competitor[] = (remoteList || []).map((entry) => ({
      id: entry.id,
      name: entry.name,
      score: entry.score,
      avatar: entry.avatar,
      isUser: Boolean(activePid && entry.playerId === activePid),
    }));

    const hasUserIdx = mapped.findIndex((e) => e.isUser);
    if (hasUserIdx >= 0) {
      mapped[hasUserIdx] = {
        ...mapped[hasUserIdx],
        name: stats.playerName || 'You',
        avatar: stats.avatar || 'boy',
        score: activeUserScore > 0 ? activeUserScore : mapped[hasUserIdx].score,
      };
    } else if (activeUserScore > 0) {
      mapped.push({
        id: activePid || 'user-self',
        name: stats.playerName || 'You',
        score: activeUserScore,
        avatar: stats.avatar || 'boy',
        isUser: true,
      });
    }

    const nonZero = mapped.filter((e) => e.score > 0);
    nonZero.sort((a, b) => b.score - a.score);
    return nonZero.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }, [
    tab,
    remoteBoards,
    devicePlayerId,
    activeUserScore,
    stats.playerName,
    stats.avatar,
  ]);

  const userRankedEntry = useMemo(
    () => rankedBoard.find((e) => e.isUser) || null,
    [rankedBoard]
  );

  // Show empty state if there are no rankings yet or if Daily tab is selected and today's puzzle isn't completed
  const showEmptyDailyState =
    (tab === 'daily' && !isDailyCompletedToday && rankedBoard.length === 0) ||
    rankedBoard.length === 0;

  const firstPlace = rankedBoard[0];
  const secondPlace = rankedBoard[1];
  const thirdPlace = rankedBoard[2];
  const listRows = rankedBoard.slice(3, 8);

  return (
    <GameBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <HeaderStats />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Top Segmented Toggle (All-Time | Daily | Endless) */}
          <View style={styles.segmentedBar}>
            <Pressable
              style={styles.segmentHalf}
              onPress={() => {
                triggerHaptic('light');
                setUserPickedTab(true);
                setTab('allTime');
              }}>
              {tab === 'allTime' ? (
                <LinearGradient
                  colors={['#8B5CF6', '#6D3FE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentActiveFill}>
                  <Text style={styles.segmentActiveText}>All-Time</Text>
                </LinearGradient>
              ) : (
                <View style={styles.segmentInactiveFill}>
                  <Text style={styles.segmentInactiveText}>All-Time</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={styles.segmentHalf}
              onPress={() => {
                triggerHaptic('light');
                setUserPickedTab(true);
                setTab('daily');
              }}>
              {tab === 'daily' ? (
                <LinearGradient
                  colors={['#8B5CF6', '#6D3FE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentActiveFill}>
                  <Text style={styles.segmentActiveText}>Daily</Text>
                </LinearGradient>
              ) : (
                <View style={styles.segmentInactiveFill}>
                  <Text style={styles.segmentInactiveText}>Daily</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={styles.segmentHalf}
              onPress={() => {
                triggerHaptic('light');
                setUserPickedTab(true);
                setTab('endless');
              }}>
              {tab === 'endless' ? (
                <LinearGradient
                  colors={['#8B5CF6', '#6D3FE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentActiveFill}>
                  <Text style={styles.segmentActiveText}>Endless</Text>
                </LinearGradient>
              ) : (
                <View style={styles.segmentInactiveFill}>
                  <Text style={styles.segmentInactiveText}>Endless</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Connection & Auto-Sync Status Pill */}
          <Pressable
            style={[
              styles.syncStatusPill,
              syncStatus === 'synced'
                ? styles.syncPillOnline
                : syncStatus === 'syncing'
                ? styles.syncPillSyncing
                : styles.syncPillOffline,
            ]}
            onPress={() => {
              triggerHaptic('light');
              flushPendingHighScoreSync(stats, today);
            }}>
            <View
              style={[
                styles.syncDot,
                {
                  backgroundColor:
                    syncStatus === 'synced'
                      ? '#16A34A'
                      : syncStatus === 'syncing'
                      ? '#7C3AED'
                      : '#F59E0B',
                },
              ]}
            />
            <Text style={styles.syncStatusText}>
              {syncStatus === 'synced'
                ? 'Synced • Live Highscore DB'
                : syncStatus === 'syncing'
                ? 'Syncing highscores...'
                : 'Offline Mode • Saved locally (auto-syncs when connected)'}
            </Text>
          </Pressable>

          {showEmptyDailyState ? (
            /* ============================================================ */
            /* Empty State (before any scores are posted)                   */
            /* ============================================================ */
            <View style={styles.centerStateWrap}>
              <View style={styles.trophyHeroWrap}>
                <View style={styles.confettiSideLeft}>
                  <GameAsset name="blossom" size={20} />
                  <GameAsset name="sparkles" size={18} />
                </View>
                <View style={styles.confettiSideRight}>
                  <GameAsset name="sparkles" size={18} />
                  <GameAsset name="blossom" size={20} />
                </View>
                <GameAsset name="trophy" size={88} />
              </View>

              <Text style={styles.stateTitle}>No Rankings Yet</Text>
              <Text style={styles.stateSubtitle}>
                {tab === 'daily'
                  ? "Complete today's Daily Puzzle\nto post your score and get on\ntoday's leaderboard!"
                  : tab === 'endless'
                  ? 'Clear waves in Endless Mode\nto post your best survival score\non the Endless leaderboard!'
                  : 'Complete a level, Daily Puzzle, or\nEndless run to post the first\nhighscore on the leaderboard!'}
              </Text>

              <Pressable
                onPress={() => {
                  triggerHaptic('medium');
                  if (tab === 'daily') {
                    router.push('/daily');
                  } else if (tab === 'endless') {
                    router.push({
                      pathname: '/game' as any,
                      params: { mode: 'endless' },
                    });
                  } else {
                    router.push({
                      pathname: '/game' as any,
                      params: { level: String(stats.currentLevel || 1) },
                    });
                  }
                }}
                style={({ pressed }) => [
                  styles.pinkBtnOuter,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}>
                <LinearGradient
                  colors={['#FF74A4', '#FF477E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pinkBtnGradient}>
                  <Text style={styles.pinkBtnText}>
                    {tab === 'daily'
                      ? "Play Today's Puzzle"
                      : tab === 'endless'
                      ? 'Play Endless Mode'
                      : 'Start Playing'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            /* ============================================================ */
            /* Live Ranked Podium + List + Pinned "You" Row                 */
            /* ============================================================ */
            <>
              {tab === 'daily' && (
                <View style={styles.dateTimerSubRow}>
                  <Text style={styles.dateSubText}>{formatLongDate(today)}</Text>
                  <View style={styles.timerInlineBadge}>
                    <View style={styles.pinkClockDot}>
                      <AppIcon name="schedule" size={11} color="#FFFFFF" />
                    </View>
                    <Text style={styles.timerSubText}>
                      {formatHMS(msLeft)} left
                    </Text>
                  </View>
                </View>
              )}

              {/* Top 3 Podium */}
              <View style={styles.podiumRow}>
                {/* 2nd Place (Left) */}
                {secondPlace && (
                  <View style={styles.podiumCol}>
                    <GameAsset name="crown" size={24} style={styles.podiumCrownSmall} />
                    <View style={[styles.podiumAvatarRing, styles.ringPurple]}>
                      <AvatarCircle avatar={secondPlace.avatar} size={46} />
                    </View>
                    <Text style={styles.podiumPlayerName} numberOfLines={1}>
                      {secondPlace.isUser ? 'You' : secondPlace.name}
                    </Text>
                    <LinearGradient
                      colors={['#DCE3FC', '#B9C6F5']}
                      style={[styles.pedestalBox, styles.pedestalSecond]}>
                      <Text style={styles.pedestalScoreText}>
                        {secondPlace.score.toLocaleString()}
                      </Text>
                    </LinearGradient>
                  </View>
                )}

                {/* 1st Place (Center) */}
                {firstPlace && (
                  <View style={styles.podiumColCenter}>
                    <GameAsset name="crown" size={30} style={styles.podiumCrownLarge} />
                    <View style={[styles.podiumAvatarRingLarge, styles.ringPurple]}>
                      <AvatarCircle avatar={firstPlace.avatar} size={56} />
                    </View>
                    <Text style={styles.podiumPlayerNameFirst} numberOfLines={1}>
                      {firstPlace.isUser ? 'You' : firstPlace.name}
                    </Text>
                    <LinearGradient
                      colors={['#FFE066', '#F5B81C']}
                      style={[styles.pedestalBox, styles.pedestalFirst]}>
                      {tab === 'allTime' && (
                        <Text style={styles.pedestalRankWatermark}>1</Text>
                      )}
                      <Text style={styles.pedestalScoreTextFirst}>
                        {firstPlace.score.toLocaleString()}
                      </Text>
                    </LinearGradient>
                  </View>
                )}

                {/* 3rd Place (Right) */}
                {thirdPlace && (
                  <View style={styles.podiumCol}>
                    <GameAsset name="crown" size={24} style={styles.podiumCrownSmall} />
                    <View style={[styles.podiumAvatarRing, styles.ringPink]}>
                      <AvatarCircle avatar={thirdPlace.avatar} size={46} />
                    </View>
                    <Text style={styles.podiumPlayerName} numberOfLines={1}>
                      {thirdPlace.isUser ? 'You' : thirdPlace.name}
                    </Text>
                    <LinearGradient
                      colors={['#FFD29D', '#F4A656']}
                      style={[styles.pedestalBox, styles.pedestalThird]}>
                      <Text style={styles.pedestalScoreText}>
                        {thirdPlace.score.toLocaleString()}
                      </Text>
                    </LinearGradient>
                  </View>
                )}
              </View>

              {/* White List Container (Ranks 4+) */}
              <View style={styles.listCard}>
                {listRows.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <View
                      style={[
                        styles.rankRow,
                        item.isUser && styles.rankRowHighlighted,
                      ]}>
                      <Text style={styles.rankIndexText}>{item.rank}</Text>
                      <AvatarCircle avatar={item.avatar} size={36} />
                      <Text
                        style={[
                          styles.rankNameText,
                          item.isUser && { color: '#E11D48', fontWeight: '900' },
                        ]}>
                        {item.isUser ? `You (${item.name})` : item.name}
                      </Text>
                      <Text style={styles.rankScoreText}>
                        {item.score.toLocaleString()}
                      </Text>
                    </View>
                    {idx < listRows.length - 1 && (
                      <View style={styles.rankDivider} />
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* Pinned Pink "You" Card Reflecting Real Score & Rank */}
              <View style={styles.youCard}>
                <Text style={styles.youRankText}>
                  {userRankedEntry ? `#${userRankedEntry.rank}` : '--'}
                </Text>
                <AvatarCircle avatar={stats.avatar || 'boy'} size={36} />
                <Text style={styles.youLabelText}>
                  You ({stats.playerName})
                </Text>
                <Text style={styles.youScoreText}>
                  {activeUserScore.toLocaleString()}
                </Text>
              </View>
            </>
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 110,
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    padding: 4,
    gap: 6,
    marginBottom: 10,
  },
  segmentHalf: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentActiveFill: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentInactiveFill: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F3EEFF',
  },
  segmentActiveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  segmentInactiveText: {
    color: '#2B2250',
    fontSize: 14,
    fontWeight: '800',
  },
  dateTimerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dateSubText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2B2250',
  },
  timerInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinkClockDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF477E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerSubText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6494',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
  },
  podiumColCenter: {
    flex: 1.12,
    alignItems: 'center',
  },
  podiumCrownSmall: {
    marginBottom: -4,
    zIndex: 2,
  },
  podiumCrownLarge: {
    marginBottom: -6,
    zIndex: 2,
  },
  podiumAvatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
    zIndex: 2,
  },
  podiumAvatarRingLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
    zIndex: 2,
  },
  podiumPlayerName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2B2250',
    marginBottom: 4,
  },
  podiumPlayerNameFirst: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2B2250',
    marginBottom: 4,
  },
  ringPurple: {
    borderColor: '#7B4DFF',
  },
  ringPink: {
    borderColor: '#EC4899',
  },
  pedestalBox: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  pedestalSecond: {
    height: 62,
  },
  pedestalFirst: {
    height: 82,
  },
  pedestalThird: {
    height: 56,
  },
  pedestalRankWatermark: {
    fontSize: 20,
    fontWeight: '900',
    color: 'rgba(140, 83, 0, 0.35)',
    marginBottom: 2,
  },
  pedestalScoreText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2250',
  },
  pedestalScoreTextFirst: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2B2250',
  },
  listCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
    shadowColor: '#4A3F78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  rankRowHighlighted: {
    backgroundColor: 'rgba(255, 214, 232, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  rankDivider: {
    height: 1,
    backgroundColor: '#F0EBFF',
  },
  rankIndexText: {
    width: 22,
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2250',
  },
  rankNameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#2B2250',
  },
  rankScoreText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B2250',
  },
  youCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD6E8',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  youRankText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E11D48',
  },
  youLabelText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    color: '#E11D48',
  },
  youScoreText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2B2250',
  },
  centerStateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  trophyHeroWrap: {
    width: 150,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confettiSideLeft: {
    position: 'absolute',
    left: 2,
    top: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  confettiSideRight: {
    position: 'absolute',
    right: 2,
    top: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bigGoldTrophy: {
    fontSize: 82,
  },
  stateTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#2B2250',
    textAlign: 'center',
    marginBottom: 8,
  },
  stateSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B5082',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  pinkBtnOuter: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#FF477E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pinkBtnGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinkBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  syncStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
    gap: 6,
  },
  syncPillOnline: {
    backgroundColor: 'rgba(220, 252, 231, 0.9)',
  },
  syncPillSyncing: {
    backgroundColor: 'rgba(243, 232, 255, 0.9)',
  },
  syncPillOffline: {
    backgroundColor: 'rgba(254, 243, 199, 0.92)',
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B2F63',
  },
});
