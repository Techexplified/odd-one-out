import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { GameTile } from '@/types/game';

export const SPRITE_MAP: Record<string, any> = {
  lemon: require('@/assets/images/lemon_normal_clean.png'),
  lemon_odd: require('@/assets/images/lemon_odd_clean.png'),
  butterfly: require('@/assets/images/butterfly_hires_transparent.png'),
  butterfly_odd: require('@/assets/images/butterfly_odd_clean.png'),
  butterfly_daily_odd: require('@/assets/images/butterfly_daily_odd_clean.png'),
  apple: require('@/assets/images/apple_normal_clean.png'),
  apple_odd: require('@/assets/images/apple_odd_clean.png'),
  dog: require('@/assets/images/tiles/dog.png'),
  dog_odd: require('@/assets/images/tiles/dog_odd.png'),
  cat: require('@/assets/images/tiles/cat.png'),
  star: require('@/assets/images/icons/star.png'),
  moon: require('@/assets/images/icons/moon.png'),
  sunflower: require('@/assets/images/tiles/sunflower.png'),
  sunflower_odd: require('@/assets/images/tiles/sunflower_odd.png'),
  rose: require('@/assets/images/tiles/rose.png'),
  blossom_white: require('@/assets/images/tiles/blossom_white.png'),
  donut: require('@/assets/images/tiles/donut.png'),
  donut_odd: require('@/assets/images/tiles/donut_odd.png'),
  cookie: require('@/assets/images/tiles/cookie.png'),
  cookie_odd: require('@/assets/images/tiles/cookie_odd.png'),
  cow: require('@/assets/images/tiles/cow.png'),
  pig: require('@/assets/images/tiles/pig.png'),
  frog: require('@/assets/images/tiles/frog.png'),
  frog_odd: require('@/assets/images/tiles/frog_odd.png'),
  turtle: require('@/assets/images/tiles/turtle.png'),
  strawberry: require('@/assets/images/tiles/strawberry.png'),
  strawberry_odd: require('@/assets/images/tiles/strawberry_odd.png'),
  cherries: require('@/assets/images/tiles/cherries.png'),
  chick_front: require('@/assets/images/tiles/chick_front.png'),
  chick_side: require('@/assets/images/tiles/chick_side.png'),
  maple_leaf: require('@/assets/images/tiles/maple_leaf.png'),
  fallen_leaf: require('@/assets/images/tiles/fallen_leaf.png'),
  smile_open: require('@/assets/images/tiles/smile_open.png'),
  smile_big: require('@/assets/images/tiles/smile_big.png'),
  smile_eyes: require('@/assets/images/tiles/smile_eyes.png'),
  smile_beam: require('@/assets/images/tiles/smile_beam.png'),
  bear: require('@/assets/images/tiles/bear.png'),
  koala: require('@/assets/images/tiles/koala.png'),
  monkey_eyes: require('@/assets/images/tiles/monkey_eyes.png'),
  monkey_ears: require('@/assets/images/tiles/monkey_ears.png'),
  avocado: require('@/assets/images/tiles/avocado.png'),
  full_moon: require('@/assets/images/tiles/full_moon.png'),
  waning_moon: require('@/assets/images/tiles/waning_moon.png'),
  clock_3: require('@/assets/images/tiles/clock_3.png'),
  clock_4: require('@/assets/images/tiles/clock_4.png'),
  clock_1: require('@/assets/images/tiles/clock_1.png'),
  clock_130: require('@/assets/images/tiles/clock_130.png'),
  mushroom: require('@/assets/images/tiles/mushroom.png'),
  mushroom_odd: require('@/assets/images/tiles/mushroom_odd.png'),
  evergreen_tree: require('@/assets/images/tiles/evergreen_tree.png'),
  cat_smile: require('@/assets/images/tiles/cat_smile.png'),
  cat_grin: require('@/assets/images/tiles/cat_grin.png'),
  key: require('@/assets/images/tiles/key.png'),
  owl: require('@/assets/images/tiles/owl.png'),
  owl_odd: require('@/assets/images/tiles/owl_odd.png'),
};

interface TileGraphicProps {
  tile: GameTile;
  size: number;
  fontSize?: number;
}

export function TileGraphic({ tile, size, fontSize = 28 }: TileGraphicProps) {
  // Destructure outside inline styles so Reanimated's worklet Babel plugin
  // never mistakes `tile.value` for a SharedValue `.value` access.
  const { type: tileType, value: tileVal, rotationDeg } = tile;
  const spriteSource = SPRITE_MAP[tileVal];

  if ((tileType === 'sprite' || spriteSource) && spriteSource) {
    const isButterfly = tileVal.startsWith('butterfly');
    const spriteDim = isButterfly ? size * 0.86 : size * 0.78;
    return (
      <Image
        source={spriteSource}
        style={[
          {
            width: spriteDim,
            height: spriteDim,
          },
          rotationDeg ? { transform: [{ rotate: `${rotationDeg}deg` }] } : null,
        ]}
        resizeMode="contain"
      />
    );
  }

  if (tileType === 'color') {
    const swatchDim = size * 0.76;
    return (
      <View
        style={[
          styles.colorSwatch,
          {
            width: swatchDim,
            height: swatchDim,
            backgroundColor: tileVal,
          },
        ]}
      />
    );
  }

  return (
    <Text
      style={[
        styles.glyph,
        { fontSize },
        tileType === 'text' ? styles.textGlyph : null,
        rotationDeg ? { transform: [{ rotate: `${rotationDeg}deg` }] } : null,
      ]}>
      {tileVal}
    </Text>
  );
}

const styles = StyleSheet.create({
  colorSwatch: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#1E1638',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
  glyph: {
    textAlign: 'center',
  },
  textGlyph: {
    fontWeight: '900',
    color: '#2B2250',
  },
});
