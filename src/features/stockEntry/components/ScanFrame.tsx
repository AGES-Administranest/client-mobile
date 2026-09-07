import { StyleSheet, View } from 'react-native';

import { ButtonPrimary } from 'theme/colors';

// The brown L-shaped corners that delimit the capture area on the scan screen
// (Figma nodes 31:1020–31:1027). Purely decorative — sits over the camera view.
export function ScanFrame() {
  return (
    <View style={styles.area} pointerEvents="none">
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
    </View>
  );
}

const CORNER = 40;
const THICKNESS = 4;
const RADIUS = 6;

const styles = StyleSheet.create({
  area: {
    flex: 1,
    marginHorizontal: 32,
    marginVertical: 96,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: ButtonPrimary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: THICKNESS,
    borderLeftWidth: THICKNESS,
    borderTopLeftRadius: RADIUS,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: THICKNESS,
    borderRightWidth: THICKNESS,
    borderTopRightRadius: RADIUS,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: THICKNESS,
    borderLeftWidth: THICKNESS,
    borderBottomLeftRadius: RADIUS,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: THICKNESS,
    borderRightWidth: THICKNESS,
    borderBottomRightRadius: RADIUS,
  },
});
