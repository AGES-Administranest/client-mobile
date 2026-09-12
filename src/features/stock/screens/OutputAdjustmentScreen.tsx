import { View } from 'react-native';

import { ScreenBackground } from 'app/components/ui/screen-background';

import { OutputAdjustmentForm } from '../components/OutputAdjustmentForm';

function OutputAdjustmentScreen() {
  return (
    <ScreenBackground>
      <View className="flex-1">
        <OutputAdjustmentForm />
      </View>
    </ScreenBackground>
  );
}

export { OutputAdjustmentScreen };
