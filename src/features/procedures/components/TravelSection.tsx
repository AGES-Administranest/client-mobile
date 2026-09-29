import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { LabelPlaceholder } from 'theme/colors';

export type TravelSectionTexts = {
  title: string;
  emptyMessage: string;
  register: string;
  collapse: string;
  vehicleLabel: string;
  vehiclePlaceholder: string;
  distanceLabel: string;
  distancePlaceholder: string;
  confirm: string;
};

type TravelSectionProps = {
  editable: boolean;
  texts: TravelSectionTexts;
};

// Deslocamento ainda não é registrado de verdade: é só a UI do Figma, sem
// serviço nem persistência. "Confirmar" apenas fecha o formulário de novo.
export function TravelSection({ editable, texts }: TravelSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-wide text-label-primary">
          {texts.title}
        </Text>
        {editable ? (
          <Pressable
            onPress={() => setExpanded(current => !current)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? texts.collapse : texts.register}
            hitSlop={8}
          >
            <Text className="text-xs font-semibold text-label-quartenery">
              {expanded ? texts.collapse : texts.register}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {expanded ? (
        <View className="gap-3 pt-2">
          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase text-label-primary">
              {texts.vehicleLabel}
            </Text>
            <View className="h-11 justify-center rounded-xl border border-border-primary bg-white px-3">
              <Text style={{ color: LabelPlaceholder }} className="text-sm">
                {texts.vehiclePlaceholder}
              </Text>
            </View>
          </View>
          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase text-label-primary">
              {texts.distanceLabel}
            </Text>
            <View className="h-11 justify-center rounded-xl border border-border-primary bg-white px-3">
              <Text style={{ color: LabelPlaceholder }} className="text-sm">
                {texts.distancePlaceholder}
              </Text>
            </View>
          </View>
          <Button
            shape="pill"
            className="h-[49px] w-full"
            onPress={() => setExpanded(false)}
          >
            <Text className="font-semibold">{texts.confirm}</Text>
          </Button>
        </View>
      ) : (
        <View className="mt-2 rounded-2xl border border-dashed border-border-primary bg-white px-3.5 py-3">
          <Text className="text-[13px]" style={{ color: LabelPlaceholder }}>
            {texts.emptyMessage}
          </Text>
        </View>
      )}
    </View>
  );
}
