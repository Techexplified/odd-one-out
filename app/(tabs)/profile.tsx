import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useGame,
  HEART_REFILL_COST,
  HINT_PACK_COST,
  HINT_PACK_SIZE,
} from '@/context/GameContext';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { HeaderStats } from '@/components/HeaderStats';
import { AppIcon } from '@/components/AppIcon';
import { AVATAR_KEYS, AvatarGraphic, GameAsset, resolveAssetName } from '@/components/GameAsset';
import { GameBackground } from '@/components/GameBackground';
import { formatCountdown } from '@/utils/date';
import { confirmAction, showMessage } from '@/utils/dialog';

const AVATAR_OPTIONS = AVATAR_KEYS;

function getPlayerRankTitle(highestLevel: number): string {
  if (highestLevel >= 55) return 'Grandmaster Spotter';
  if (highestLevel >= 35) return 'Master Detective';
  if (highestLevel >= 18) return 'Sharp-Eyed Scout';
  if (highestLevel >= 7) return 'Rising Sleuth';
  return 'Eagle Eye Novice';
}

export default function ProfileScreen() {
  const {
    stats,
    badges,
    nextHeartInMs,
    updatePlayerName,
    updateAvatar,
    buyHeartRefill,
    buyHintPack,
    toggleSfx,
    toggleHaptics,
    toggleDarkMode,
    resetProgress,
  } = useGame();
  const systemScheme = useColorScheme();

  const isDark = stats.darkModeOverride !== null ? stats.darkModeOverride : systemScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(stats.playerName);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      updatePlayerName(nameInput.trim());
    }
    setIsEditingName(false);
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
        `You need ${HEART_REFILL_COST} coins for an instant refill. Solve levels or the Daily Puzzle to earn coins!`
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
        `A pack of ${HINT_PACK_SIZE} hints costs ${HINT_PACK_COST} coins. Earn more coins by solving levels!`
      );
    } else {
      showMessage('Hints Added!', `+${HINT_PACK_SIZE} hints added to your inventory.`);
    }
  };

  const handleConfirmReset = () => {
    confirmAction({
      title: 'Reset Progress?',
      message:
        'Are you sure you want to reset all your levels, streak, badges, and coins? This cannot be undone.',
      confirmText: 'Reset',
      destructive: true,
      onConfirm: resetProgress,
    });
  };

  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 100;
  const activeAvatarKey = resolveAssetName(stats.avatar || 'boy');

  return (
    <GameBackground>
      <SafeAreaView style={styles.safeArea}>
        <HeaderStats showSettings={false} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Header Card */}
          <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsAvatarModalOpen(true)}
              style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <AvatarGraphic avatar={stats.avatar} size={84} />
              </View>
              <View style={styles.editBadge}>
                <AppIcon name="pencil" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>

            {isEditingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  style={[styles.nameInput, { color: theme.text, borderColor: theme.primary }]}
                  autoFocus
                  maxLength={20}
                />
                <TouchableOpacity onPress={handleSaveName} style={styles.saveNameBtn}>
                  <Text style={styles.saveNameText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setNameInput(stats.playerName);
                  setIsEditingName(true);
                }}
                style={styles.nameDisplayRow}>
                <Text style={[styles.playerName, { color: theme.text }]}>{stats.playerName}</Text>
                <AppIcon name="create-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}

            <Text style={[styles.playerTitle, { color: theme.primary }]}>
              Level {stats.highestLevelUnlocked} • {getPlayerRankTitle(stats.highestLevelUnlocked)}
            </Text>
          </View>

          {/* 2x2 Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <GameAsset name="target" size={28} style={{ marginBottom: 6 }} />
              <Text style={[styles.statNumber, { color: theme.text }]}>{stats.gamesWon}</Text>
              <Text style={[styles.statName, { color: theme.textMuted }]}>Puzzles Solved</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <GameAsset name="chart_up" size={28} style={{ marginBottom: 6 }} />
              <Text style={[styles.statNumber, { color: theme.text }]}>{winRate}%</Text>
              <Text style={[styles.statName, { color: theme.textMuted }]}>Win Rate</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <GameAsset name="fire" size={28} style={{ marginBottom: 6 }} />
              <Text style={[styles.statNumber, { color: theme.text }]}>{stats.bestStreak} Days</Text>
              <Text style={[styles.statName, { color: theme.textMuted }]}>Best Streak</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <GameAsset name="bolt" size={28} style={{ marginBottom: 6 }} />
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {stats.fastestSolveSec !== null ? `${stats.fastestSolveSec}s` : '—'}
              </Text>
              <Text style={[styles.statName, { color: theme.textMuted }]}>Fastest Solve</Text>
            </View>
          </View>

          {/* Badges / Achievements Shelf */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Badges & Trophies</Text>
            <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
              {badges.filter((b) => b.unlocked).length} / {badges.length}
            </Text>
          </View>

          <View style={styles.badgesList}>
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  !badge.unlocked && { opacity: 0.65 },
                ]}>
                <View
                  style={[
                    styles.badgeIconCircle,
                    { backgroundColor: badge.unlocked ? '#FFF3E0' : theme.surfaceElevated },
                  ]}>
                  <GameAsset name={badge.icon} size={30} />
                </View>
                <View style={styles.badgeInfo}>
                  <View style={styles.badgeTitleRow}>
                    <Text style={[styles.badgeTitle, { color: theme.text }]}>{badge.title}</Text>
                    {badge.unlocked && (
                      <View style={styles.unlockedTag}>
                        <Text style={styles.unlockedTagText}>UNLOCKED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.badgeDesc, { color: theme.textMuted }]}>
                    {badge.description}
                  </Text>
                  <View style={[styles.badgeProgressBar, { backgroundColor: theme.surfaceElevated }]}>
                    <View
                      style={[
                        styles.badgeProgressFill,
                        {
                          width: `${Math.round(badge.progress * 100)}%`,
                          backgroundColor: badge.unlocked ? '#34C759' : theme.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Coin & Heart Shop */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Supplies & Shop</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
                Balance: {stats.coins}
              </Text>
              <GameAsset name="coin" size={16} />
            </View>
          </View>

          <View style={[styles.shopCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Refill Hearts */}
            <View style={styles.shopRow}>
              <View style={styles.shopItemIcon}>
                <GameAsset name="heart" size={26} />
              </View>
              <View style={styles.shopItemInfo}>
                <Text style={[styles.shopItemTitle, { color: theme.text }]}>
                  Instant Heart Refill ({stats.hearts}/{stats.maxHearts})
                </Text>
                <Text style={[styles.shopItemDesc, { color: theme.textMuted }]}>
                  {nextHeartInMs !== null
                    ? `Next free heart in ${formatCountdown(nextHeartInMs)}`
                    : 'All hearts full! Ready to play.'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleRefillHearts}
                style={[
                  styles.shopBuyBtn,
                  { backgroundColor: stats.hearts >= stats.maxHearts ? '#9E92B0' : '#FF2E75' },
                ]}>
                {stats.hearts >= stats.maxHearts ? (
                  <Text style={styles.shopBuyText}>FULL</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.shopBuyText}>{HEART_REFILL_COST}</Text>
                    <GameAsset name="coin" size={14} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.shopDivider, { backgroundColor: theme.border }]} />

            {/* Buy Hint Pack */}
            <View style={styles.shopRow}>
              <View style={styles.shopItemIcon}>
                <GameAsset name="bulb" size={26} />
              </View>
              <View style={styles.shopItemInfo}>
                <Text style={[styles.shopItemTitle, { color: theme.text }]}>
                  Hint Pack (+{HINT_PACK_SIZE} Hints)
                </Text>
                <Text style={[styles.shopItemDesc, { color: theme.textMuted }]}>
                  You have {stats.hintsRemaining} {stats.hintsRemaining === 1 ? 'hint' : 'hints'} in stock
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleBuyHints}
                style={[styles.shopBuyBtn, { backgroundColor: '#FFB800' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.shopBuyText, { color: '#1C1236' }]}>{HINT_PACK_COST}</Text>
                  <GameAsset name="coin" size={14} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings Toggles */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <GameAsset name="speaker" size={22} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>Sound Effects</Text>
              </View>
              <Switch
                value={stats.sfxEnabled}
                onValueChange={toggleSfx}
                trackColor={{ false: '#D1C4E9', true: theme.primary }}
              />
            </View>

            <View style={[styles.shopDivider, { backgroundColor: theme.border }]} />

            <View style={styles.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <GameAsset name="vibration" size={22} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>Haptic Vibration</Text>
              </View>
              <Switch
                value={stats.hapticsEnabled}
                onValueChange={toggleHaptics}
                trackColor={{ false: '#D1C4E9', true: theme.primary }}
              />
            </View>

            <View style={[styles.shopDivider, { backgroundColor: theme.border }]} />

            <View style={styles.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <GameAsset name="moon" size={22} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleDarkMode}
                trackColor={{ false: '#D1C4E9', true: theme.primary }}
              />
            </View>
          </View>

          {/* Reset Progress */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleConfirmReset}
            style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Reset Game Progress</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Avatar Picker Modal */}
        <Modal visible={isAvatarModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Avatar</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map((av) => (
                  <TouchableOpacity
                    key={av}
                    activeOpacity={0.7}
                    onPress={() => {
                      updateAvatar(av);
                      setIsAvatarModalOpen(false);
                    }}
                    style={[
                      styles.avatarSelectTile,
                      { backgroundColor: theme.surfaceElevated },
                      activeAvatarKey === av && { borderColor: theme.primary, borderWidth: 2 },
                    ]}>
                    <AvatarGraphic avatar={av} size={46} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setIsAvatarModalOpen(false)}
                style={styles.modalCloseBtn}>
                <Text style={[styles.modalCloseText, { color: theme.textMuted }]}>Close</Text>
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
    paddingBottom: 40,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  profileCard: {
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 84,
    height: 84,
  },
  avatarEmoji: {
    fontSize: 44,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF2E75',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 22,
    fontWeight: '900',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    borderBottomWidth: 2,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 160,
    textAlign: 'center',
  },
  saveNameBtn: {
    backgroundColor: '#FF2E75',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  saveNameText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  playerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  statName: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgesList: {
    gap: 10,
    marginBottom: 24,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
  },
  badgeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconEmoji: {
    fontSize: 26,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  unlockedTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unlockedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34C759',
  },
  badgeDesc: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  badgeProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  shopCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  shopItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopEmoji: {
    fontSize: 22,
  },
  shopItemInfo: {
    flex: 1,
  },
  shopItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  shopItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  shopBuyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  shopBuyText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  shopDivider: {
    height: 1,
    marginVertical: 10,
  },
  settingsCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  resetBtnText: {
    color: '#FF3B56',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  avatarSelectTile: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarSelectImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarSelectEmoji: {
    fontSize: 30,
  },
  modalCloseBtn: {
    marginTop: 20,
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
