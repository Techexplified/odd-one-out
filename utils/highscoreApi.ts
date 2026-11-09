import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerStats } from '@/types/game';

const PLAYER_ID_KEY = '@oddoneout_device_player_id_v1';
const PENDING_SYNC_KEY = '@oddoneout_pending_highscore_sync_v1';
const CACHED_LEADERBOARDS_KEY = '@oddoneout_cached_leaderboards_v1';
const DEFAULT_BACKEND_PORT = 4000;

export type SyncStatus = 'synced' | 'syncing' | 'offline';

export interface HighScoreSyncPayload {
  playerId: string;
  playerName: string;
  avatar: string;
  highScore: number;
  allTimeScore: number;
  dailyScore: number;
  dailyDateKey: string;
  endlessBestScore: number;
  endlessBestWave: number;
  stars: number;
  highestLevelUnlocked: number;
  queuedAt: string;
}

export interface RemoteLeaderboardEntry {
  id: string;
  playerId: string;
  name: string;
  avatar: string;
  score: number;
  rank: number;
  endlessBestWave?: number;
  stars?: number;
  updatedAt: string;
}

export interface RemoteLeaderboardsResponse {
  dateKey: string;
  daily: RemoteLeaderboardEntry[];
  allTime: RemoteLeaderboardEntry[];
  endless: RemoteLeaderboardEntry[];
  updatedAt: string;
}

type SyncListener = (state: {
  status: SyncStatus;
  hasPendingSync: boolean;
  leaderboards: RemoteLeaderboardsResponse | null;
  playerId: string | null;
}) => void;

let cachedPlayerId: string | null = null;
let currentSyncStatus: SyncStatus = 'offline';
let hasPendingFlag = false;
let latestLeaderboards: RemoteLeaderboardsResponse | null = null;
let inFlightSyncPromise: Promise<RemoteLeaderboardsResponse | null> | null = null;
const listeners = new Set<SyncListener>();

function notifyListeners() {
  const snapshot = {
    status: currentSyncStatus,
    hasPendingSync: hasPendingFlag,
    leaderboards: latestLeaderboards,
    playerId: cachedPlayerId,
  };
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeHighScoreSync(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({
    status: currentSyncStatus,
    hasPendingSync: hasPendingFlag,
    leaderboards: latestLeaderboards,
    playerId: cachedPlayerId,
  });
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncState() {
  return {
    status: currentSyncStatus,
    hasPendingSync: hasPendingFlag,
    leaderboards: latestLeaderboards,
    playerId: cachedPlayerId,
  };
}

export function getCachedDevicePlayerId(): string | null {
  return cachedPlayerId;
}

/** Returns a stable persistent playerId for this device installation. */
export async function getDevicePlayerId(): Promise<string> {
  if (cachedPlayerId) return cachedPlayerId;
  try {
    const existing = await AsyncStorage.getItem(PLAYER_ID_KEY);
    if (existing) {
      cachedPlayerId = existing;
      return existing;
    }
    const created = `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(PLAYER_ID_KEY, created);
    cachedPlayerId = created;
    return created;
  } catch {
    const fallback = 'player-local';
    cachedPlayerId = fallback;
    return fallback;
  }
}

/** Resolves the Express backend base URL across Expo Go, Android Emulator, iOS Simulator, and Web. */
export function getBackendBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL.replace(/\/$/, '');
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${DEFAULT_BACKEND_PORT}`;
    }
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_BACKEND_PORT}`;
  }
  return `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 2500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Computes the player's authoritative Daily, All-Time, and Endless scores from `PlayerStats`. */
export function computePlayerScores(stats: PlayerStats, todayKey: string) {
  const levelSum = Object.values(stats.levelBestScore || {}).reduce((acc, v) => acc + v, 0);
  const runsSum = (stats.runs || [])
    .filter((r) => r.level > 0)
    .reduce((acc, r) => Math.max(acc, r.score), 0);

  const cumulativeScore = levelSum + (stats.dailyBestScore || 0) + (stats.endlessBestScore || 0);
  const allTimeScore = Math.max(stats.highScore || 0, cumulativeScore, runsSum);

  const todayDailyRuns = (stats.runs || []).filter(
    (r) => r.level === 0 && (r.dateKey === todayKey || r.playedAt.startsWith(todayKey))
  );
  const bestRunToday =
    todayDailyRuns.length > 0 ? Math.max(...todayDailyRuns.map((r) => r.score)) : 0;
  const solvedToday = stats.completedDates.includes(todayKey) || bestRunToday > 0;
  const dailyScore = solvedToday
    ? Math.max(bestRunToday, stats.dailyLastScore || 0, stats.dailyBestScore || 0)
    : 0;

  const endlessBestScore = stats.endlessBestScore || 0;
  const endlessBestWave = stats.endlessBestWave || 0;

  return {
    highScore: Math.max(stats.highScore || 0, allTimeScore),
    allTimeScore,
    dailyScore,
    endlessBestScore,
    endlessBestWave,
  };
}

export function buildPayloadFromStats(
  playerId: string,
  stats: PlayerStats,
  todayKey: string
): HighScoreSyncPayload {
  const scores = computePlayerScores(stats, todayKey);

  return {
    playerId,
    playerName: stats.playerName || 'Little Detective',
    avatar: stats.avatar || 'boy',
    highScore: scores.highScore,
    allTimeScore: scores.allTimeScore,
    dailyScore: scores.dailyScore,
    dailyDateKey: todayKey,
    endlessBestScore: scores.endlessBestScore,
    endlessBestWave: scores.endlessBestWave,
    stars: stats.stars || 0,
    highestLevelUnlocked: stats.highestLevelUnlocked || 1,
    queuedAt: new Date().toISOString(),
  };
}

/** Merges two offline payloads so maximum personal bests are never lost while offline. */
function mergePayloads(
  prev: HighScoreSyncPayload | null,
  next: HighScoreSyncPayload
): HighScoreSyncPayload {
  if (!prev || prev.playerId !== next.playerId) return next;
  const sameDate = prev.dailyDateKey === next.dailyDateKey;
  return {
    playerId: next.playerId,
    playerName: next.playerName || prev.playerName,
    avatar: next.avatar || prev.avatar,
    highScore: Math.max(prev.highScore || 0, next.highScore || 0),
    allTimeScore: Math.max(prev.allTimeScore || 0, next.allTimeScore || 0),
    dailyScore: sameDate
      ? Math.max(prev.dailyScore || 0, next.dailyScore || 0)
      : next.dailyScore || 0,
    dailyDateKey: next.dailyDateKey,
    endlessBestScore: Math.max(prev.endlessBestScore || 0, next.endlessBestScore || 0),
    endlessBestWave: Math.max(prev.endlessBestWave || 0, next.endlessBestWave || 0),
    stars: Math.max(prev.stars || 0, next.stars || 0),
    highestLevelUnlocked: Math.max(
      prev.highestLevelUnlocked || 1,
      next.highestLevelUnlocked || 1
    ),
    queuedAt: next.queuedAt,
  };
}

async function readPendingPayload(): Promise<HighScoreSyncPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HighScoreSyncPayload;
  } catch {
    return null;
  }
}

async function writePendingPayload(payload: HighScoreSyncPayload | null): Promise<void> {
  try {
    if (!payload) {
      await AsyncStorage.removeItem(PENDING_SYNC_KEY);
      hasPendingFlag = false;
    } else {
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(payload));
      hasPendingFlag = true;
    }
  } catch {
    // ignore storage errors
  }
}

export async function loadCachedLeaderboards(): Promise<RemoteLeaderboardsResponse | null> {
  if (latestLeaderboards) return latestLeaderboards;
  try {
    const raw = await AsyncStorage.getItem(CACHED_LEADERBOARDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RemoteLeaderboardsResponse;
    latestLeaderboards = parsed;
    return parsed;
  } catch {
    return null;
  }
}

async function saveCachedLeaderboards(data: RemoteLeaderboardsResponse | null): Promise<void> {
  latestLeaderboards = data;
  try {
    if (!data) {
      await AsyncStorage.removeItem(CACHED_LEADERBOARDS_KEY);
    } else {
      await AsyncStorage.setItem(CACHED_LEADERBOARDS_KEY, JSON.stringify(data));
    }
  } catch {
    // ignore storage errors
  }
}

function mergePlayerIntoBoard(
  entries: RemoteLeaderboardEntry[],
  playerEntry: RemoteLeaderboardEntry | null
): RemoteLeaderboardEntry[] {
  const existingForPlayer = playerEntry
    ? entries.find((e) => e.playerId === playerEntry.playerId)
    : undefined;
  const filtered = entries.filter(
    (e) => !playerEntry || e.playerId !== playerEntry.playerId
  );
  if (playerEntry) {
    const bestScore = Math.max(playerEntry.score, existingForPlayer?.score || 0);
    if (bestScore > 0) {
      filtered.push({
        ...playerEntry,
        score: bestScore,
      });
    }
  }
  filtered.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return filtered.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Builds an optimistic/offline leaderboard combining any cached remote players
 * with the device player's live local scores.
 */
export async function buildOfflineFallbackLeaderboards(
  stats: PlayerStats,
  todayKey: string,
  baseData?: RemoteLeaderboardsResponse | null
): Promise<RemoteLeaderboardsResponse> {
  const playerId = await getDevicePlayerId();
  const payload = buildPayloadFromStats(playerId, stats, todayKey);
  const cached = baseData ?? (await loadCachedLeaderboards());
  const nowIso = new Date().toISOString();

  const dailyUser: RemoteLeaderboardEntry | null =
    payload.dailyScore > 0
      ? {
          id: playerId,
          playerId,
          name: payload.playerName,
          avatar: payload.avatar,
          score: payload.dailyScore,
          rank: 1,
          stars: payload.stars,
          updatedAt: nowIso,
        }
      : null;

  const allTimeUser: RemoteLeaderboardEntry | null =
    payload.allTimeScore > 0
      ? {
          id: playerId,
          playerId,
          name: payload.playerName,
          avatar: payload.avatar,
          score: payload.allTimeScore,
          rank: 1,
          stars: payload.stars,
          updatedAt: nowIso,
        }
      : null;

  const endlessUser: RemoteLeaderboardEntry | null =
    payload.endlessBestScore > 0
      ? {
          id: playerId,
          playerId,
          name: payload.playerName,
          avatar: payload.avatar,
          score: payload.endlessBestScore,
          rank: 1,
          endlessBestWave: payload.endlessBestWave,
          stars: payload.stars,
          updatedAt: nowIso,
        }
      : null;

  const baseDaily = cached && cached.dateKey === todayKey ? cached.daily : [];
  const baseAllTime = cached ? cached.allTime : [];
  const baseEndless = cached ? cached.endless : [];

  return {
    dateKey: todayKey,
    daily: mergePlayerIntoBoard(baseDaily, dailyUser),
    allTime: mergePlayerIntoBoard(baseAllTime, allTimeUser),
    endless: mergePlayerIntoBoard(baseEndless, endlessUser),
    updatedAt: nowIso,
  };
}

/**
 * Optimistically updates the local leaderboard cache immediately and pushes the player's
 * latest highscores to the Express SQLite backend (`POST /api/highscores`).
 */
export async function syncPlayerHighScore(
  stats: PlayerStats,
  todayKey: string
): Promise<RemoteLeaderboardsResponse | null> {
  const playerId = await getDevicePlayerId();
  const freshPayload = buildPayloadFromStats(playerId, stats, todayKey);

  // 1. Immediately update optimistic leaderboard so UI reflects new score in 0ms
  const optimistic = await buildOfflineFallbackLeaderboards(stats, todayKey, latestLeaderboards);
  await saveCachedLeaderboards(optimistic);

  // 2. Persist merged payload in pending offline queue until server confirms
  const existingPending = await readPendingPayload();
  const merged = mergePayloads(existingPending, freshPayload);
  await writePendingPayload(merged);

  currentSyncStatus = 'syncing';
  notifyListeners();

  try {
    const res = await fetchWithTimeout(`${getBackendBaseUrl()}/api/highscores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const serverData = (await res.json()) as RemoteLeaderboardsResponse;
    // Merge local stats into serverData in case local score was updated during request
    const mergedBoards = await buildOfflineFallbackLeaderboards(stats, todayKey, serverData);
    await writePendingPayload(null);
    await saveCachedLeaderboards(mergedBoards);
    currentSyncStatus = 'synced';
    notifyListeners();
    return mergedBoards;
  } catch {
    currentSyncStatus = 'offline';
    notifyListeners();
    return optimistic;
  }
}

/**
 * Flushes any queued offline highscore updates when connectivity returns,
 * or refreshes the leaderboard from the SQLite backend.
 */
export async function flushPendingHighScoreSync(
  stats?: PlayerStats,
  todayKey?: string
): Promise<RemoteLeaderboardsResponse | null> {
  if (inFlightSyncPromise) {
    return inFlightSyncPromise;
  }

  const run = async (): Promise<RemoteLeaderboardsResponse | null> => {
    const key = todayKey || new Date().toISOString().slice(0, 10);

    // Always ensure optimistic local scores are merged into cached boards right away
    if (stats) {
      const optimistic = await buildOfflineFallbackLeaderboards(stats, key, latestLeaderboards);
      latestLeaderboards = optimistic;
      notifyListeners();
    }

    try {
      const pending = await readPendingPayload();
      if (pending) {
        currentSyncStatus = 'syncing';
        notifyListeners();
        const payloadToSend =
          stats && cachedPlayerId
            ? mergePayloads(pending, buildPayloadFromStats(cachedPlayerId, stats, key))
            : pending;

        const res = await fetchWithTimeout(`${getBackendBaseUrl()}/api/highscores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadToSend),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as RemoteLeaderboardsResponse;
        const finalBoards = stats
          ? await buildOfflineFallbackLeaderboards(stats, key, data)
          : data;
        await writePendingPayload(null);
        await saveCachedLeaderboards(finalBoards);
        currentSyncStatus = 'synced';
        notifyListeners();
        return finalBoards;
      }

      if (stats) {
        const scores = computePlayerScores(stats, key);
        if (scores.allTimeScore > 0 || scores.dailyScore > 0 || scores.endlessBestScore > 0) {
          return await syncPlayerHighScore(stats, key);
        }
      }

      return await fetchBackendLeaderboards(key, stats);
    } catch {
      currentSyncStatus = 'offline';
      if (stats) {
        const fallback = await buildOfflineFallbackLeaderboards(stats, key, latestLeaderboards);
        await saveCachedLeaderboards(fallback);
      }
      notifyListeners();
      return latestLeaderboards;
    }
  };

  inFlightSyncPromise = run().finally(() => {
    inFlightSyncPromise = null;
  });
  return inFlightSyncPromise;
}

/** Fetches ranked leaderboards from the Express backend (`GET /api/highscores`) with offline fallback. */
export async function fetchBackendLeaderboards(
  dateKey: string,
  fallbackStats?: PlayerStats
): Promise<RemoteLeaderboardsResponse | null> {
  try {
    const res = await fetchWithTimeout(
      `${getBackendBaseUrl()}/api/highscores?dateKey=${encodeURIComponent(dateKey)}&limit=25`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as RemoteLeaderboardsResponse;
    const finalBoards = fallbackStats
      ? await buildOfflineFallbackLeaderboards(fallbackStats, dateKey, data)
      : data;
    await saveCachedLeaderboards(finalBoards);
    currentSyncStatus = 'synced';
    notifyListeners();
    return finalBoards;
  } catch {
    currentSyncStatus = 'offline';
    if (fallbackStats) {
      const fallback = await buildOfflineFallbackLeaderboards(
        fallbackStats,
        dateKey,
        latestLeaderboards
      );
      await saveCachedLeaderboards(fallback);
      notifyListeners();
      return fallback;
    }
    const cached = await loadCachedLeaderboards();
    notifyListeners();
    return cached;
  }
}

/** Deletes the player's highscore entry on the backend and clears local sync caches when progress is reset. */
export async function deleteBackendHighScore(): Promise<void> {
  await writePendingPayload(null);
  await saveCachedLeaderboards(null);
  try {
    const playerId = await getDevicePlayerId();
    await fetchWithTimeout(
      `${getBackendBaseUrl()}/api/highscores/${encodeURIComponent(playerId)}`,
      {
        method: 'DELETE',
      }
    );
    await fetchWithTimeout(`${getBackendBaseUrl()}/api/highscores/reset`, {
      method: 'POST',
    }).catch(() => {});
    currentSyncStatus = 'synced';
  } catch {
    currentSyncStatus = 'offline';
  }
  notifyListeners();
}
