import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export type GameAssetName =
  // UI & Reward 3D Icons
  | 'fire'
  | 'star'
  | 'glowing_star'
  | 'crown'
  | 'trophy'
  | 'target'
  | 'bulb'
  | 'seedling'
  | 'leaf'
  | 'blossom'
  | 'lock'
  | 'coin'
  | 'money_bag'
  | 'heart'
  | 'red_heart'
  | 'calendar'
  | 'sparkles'
  | 'party_popper'
  | 'confetti_ball'
  | 'gamepad'
  | 'mobile'
  | 'speaker'
  | 'vibration'
  | 'moon'
  | 'bell'
  | 'book'
  | 'trash'
  | 'magnifying_glass'
  | 'chart'
  | 'chart_up'
  | 'bolt'
  | 'eye'
  | 'snowflake'
  | 'stopwatch'
  | 'gift'
  // Avatars & Characters
  | 'boy'
  | 'cat'
  | 'dog'
  | 'fox'
  | 'panda'
  | 'rabbit'
  | 'lion'
  | 'tiger'
  | 'koala'
  | 'unicorn'
  | 'frog'
  | 'owl'
  | 'butterfly';

export const GAME_ASSET_SOURCES: Record<GameAssetName, any> = {
  fire: require('@/assets/images/icons/fire.png'),
  star: require('@/assets/images/icons/star.png'),
  glowing_star: require('@/assets/images/icons/glowing_star.png'),
  crown: require('@/assets/images/icons/crown.png'),
  trophy: require('@/assets/images/icons/trophy.png'),
  target: require('@/assets/images/icons/target.png'),
  bulb: require('@/assets/images/icons/bulb.png'),
  seedling: require('@/assets/images/icons/seedling.png'),
  leaf: require('@/assets/images/icons/leaf.png'),
  blossom: require('@/assets/images/icons/blossom.png'),
  lock: require('@/assets/images/icons/lock.png'),
  coin: require('@/assets/images/icons/coin.png'),
  money_bag: require('@/assets/images/icons/money_bag.png'),
  heart: require('@/assets/images/icons/heart.png'),
  red_heart: require('@/assets/images/icons/red_heart.png'),
  calendar: require('@/assets/images/icons/calendar.png'),
  sparkles: require('@/assets/images/icons/sparkles.png'),
  party_popper: require('@/assets/images/icons/party_popper.png'),
  confetti_ball: require('@/assets/images/icons/confetti_ball.png'),
  gamepad: require('@/assets/images/icons/gamepad.png'),
  mobile: require('@/assets/images/icons/mobile.png'),
  speaker: require('@/assets/images/icons/speaker.png'),
  vibration: require('@/assets/images/icons/vibration.png'),
  moon: require('@/assets/images/icons/moon.png'),
  bell: require('@/assets/images/icons/bell.png'),
  book: require('@/assets/images/icons/book.png'),
  trash: require('@/assets/images/icons/trash.png'),
  magnifying_glass: require('@/assets/images/icons/magnifying_glass.png'),
  chart: require('@/assets/images/icons/chart.png'),
  chart_up: require('@/assets/images/icons/chart_up.png'),
  bolt: require('@/assets/images/icons/bolt.png'),
  eye: require('@/assets/images/icons/eye.png'),
  snowflake: require('@/assets/images/icons/snowflake.png'),
  stopwatch: require('@/assets/images/icons/stopwatch.png'),
  gift: require('@/assets/images/gift_box_hires_transparent.png'),

  // Avatars
  boy: require('@/assets/images/avatar_boy_hires_circle.png'),
  cat: require('@/assets/images/tiles/cat.png'),
  dog: require('@/assets/images/tiles/dog.png'),
  fox: require('@/assets/images/tiles/fox.png'),
  panda: require('@/assets/images/tiles/panda.png'),
  rabbit: require('@/assets/images/tiles/rabbit.png'),
  lion: require('@/assets/images/tiles/lion.png'),
  tiger: require('@/assets/images/tiles/tiger.png'),
  koala: require('@/assets/images/tiles/koala.png'),
  unicorn: require('@/assets/images/tiles/unicorn.png'),
  frog: require('@/assets/images/tiles/frog.png'),
  owl: require('@/assets/images/tiles/owl.png'),
  butterfly: require('@/assets/images/butterfly_hires_transparent.png'),
};

// Legacy key / symbol fallback map for persisted player stats
const LEGACY_KEY_MAP: Record<string, GameAssetName> = {
  '\u{1F431}': 'cat',
  '\u{1F436}': 'dog',
  '\u{1F98A}': 'fox',
  '\u{1F43C}': 'panda',
  '\u{1F430}': 'rabbit',
  '\u{1F981}': 'lion',
  '\u{1F42F}': 'tiger',
  '\u{1F428}': 'koala',
  '\u{1F984}': 'unicorn',
  '\u{1F438}': 'frog',
  '\u{1F989}': 'owl',
  '\u{1F98B}': 'butterfly',
  '\u{1F331}': 'seedling',
  '\u{1F441}\u{FE0F}': 'eye',
  '\u{1F441}': 'eye',
  '\u{26A1}': 'bolt',
  '\u{1F525}': 'fire',
  '\u{1F4B0}': 'money_bag',
  '\u{1F451}': 'crown',
  '\u{1F3C6}': 'trophy',
};

export function resolveAssetName(key: string): GameAssetName {
  if (key in GAME_ASSET_SOURCES) {
    return key as GameAssetName;
  }
  if (key in LEGACY_KEY_MAP) {
    return LEGACY_KEY_MAP[key];
  }
  return 'sparkles';
}

interface GameAssetProps {
  name: GameAssetName | string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function GameAsset({ name, size = 24, style }: GameAssetProps) {
  const resolved = resolveAssetName(name);
  const source = GAME_ASSET_SOURCES[resolved];
  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

export const AVATAR_KEYS: GameAssetName[] = [
  'boy',
  'cat',
  'dog',
  'fox',
  'panda',
  'rabbit',
  'lion',
  'tiger',
  'koala',
  'unicorn',
  'frog',
  'owl',
  'butterfly',
];

interface AvatarGraphicProps {
  avatar?: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}

export function AvatarGraphic({ avatar = 'boy', size, style }: AvatarGraphicProps) {
  const resolved = resolveAssetName(avatar || 'boy');
  if (resolved === 'boy') {
    return (
      <Image
        source={GAME_ASSET_SOURCES.boy}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style as StyleProp<ImageStyle>,
        ]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarBadge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}>
      <Image
        source={GAME_ASSET_SOURCES[resolved]}
        style={{ width: Math.round(size * 0.78), height: Math.round(size * 0.78) }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarBadge: {
    backgroundColor: '#EDE7F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
