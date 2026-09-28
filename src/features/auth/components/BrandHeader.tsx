import { Image, View } from 'react-native';

import { Text } from 'app/components/ui/text';

import logo from '../assets/logo.png';

const LOGO_WIDTH = 220;
const COMPACT_LOGO_WIDTH = 140;
const LOGO_ASPECT_RATIO = 220 / 180;

type BrandHeaderProps = {
  name: string;
  tagline: string;
  compact?: boolean;
};

export function BrandHeader({
  name,
  tagline,
  compact = false,
}: BrandHeaderProps) {
  return (
    <View className="items-center">
      <Image
        source={logo}
        accessibilityIgnoresInvertColors
        style={{
          width: compact ? COMPACT_LOGO_WIDTH : LOGO_WIDTH,
          aspectRatio: LOGO_ASPECT_RATIO,
        }}
        resizeMode="contain"
      />
      <Text
        className={
          compact
            ? 'text-xl font-bold uppercase text-label-quartenery'
            : 'mt-[15px] text-[28px] font-bold uppercase text-label-quartenery'
        }
      >
        {name}
      </Text>
      <Text className="text-sm font-medium text-label-quartenery">
        {tagline}
      </Text>
    </View>
  );
}
