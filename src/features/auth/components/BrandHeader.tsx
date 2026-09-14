import { Image, useWindowDimensions, View } from 'react-native';

import { Text } from 'app/components/ui/text';

import logo from '../assets/logo.png';

type BrandHeaderProps = {
  name: string;
  tagline: string;
  compact?: boolean;
};

const LOGO_ASPECT_RATIO = 285 / 141;

export function BrandHeader({
  name,
  tagline,
  compact = false,
}: BrandHeaderProps) {
  const { width } = useWindowDimensions();
  const scale = compact ? 0.35 : 0.6;
  const logoWidth = Math.min(Math.max(width * scale, 120), 320);

  return (
    <View className="items-center">
      <Image
        source={logo}
        accessibilityIgnoresInvertColors
        style={{ width: logoWidth, aspectRatio: LOGO_ASPECT_RATIO }}
        resizeMode="contain"
      />
      <Text
        className={
          compact
            ? 'mt-3 text-xl font-extrabold uppercase tracking-[2px] text-label-quartenery'
            : 'mt-5 text-[26px] font-extrabold uppercase tracking-[2.5px] text-label-quartenery'
        }
      >
        {name}
      </Text>
      <Text className="mt-1.5 text-[15px] tracking-[0.4px] text-label-quartenery">
        {tagline}
      </Text>
    </View>
  );
}
