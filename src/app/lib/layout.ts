import { StyleSheet } from 'react-native';

// NativeWind does not apply className on Animated.View on web, so the sheets
// size themselves through style.
export const layout = StyleSheet.create({
  fill: { flex: 1 },
  sheetMaxHeight: { maxHeight: '85%' },
});

// Na web as safe areas valem 0 e o conteúdo grudava nas bordas da janela: as
// telas usam max(inset, mínimo). Nos aparelhos com notch o inset já é maior.
export const MIN_SCREEN_TOP = 24;
export const MIN_SCREEN_BOTTOM = 16;
