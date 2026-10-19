import { Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import {
  ConfirmDialog,
  type ConfirmDialogProps,
} from 'app/components/ui/confirm-dialog';
import { Text } from 'app/components/ui/text';

type DeleteOriginDialogProps = Omit<
  ConfirmDialogProps,
  'children' | 'icon' | 'tone' | 'confirmIcon'
> & {
  effectsLabel: string;
  /** Já traduzidos: o que mais sai junto com o registro. */
  effects: readonly string[];
};

/**
 * Confirmação para apagar um registro que gerou um lançamento automático
 * (atendimento, pedido de compra, nota fiscal), com a lista do que vai junto.
 */
function DeleteOriginDialog({
  effectsLabel,
  effects,
  ...confirm
}: DeleteOriginDialogProps) {
  return (
    <ConfirmDialog
      icon={Trash2}
      tone="danger"
      confirmIcon={Trash2}
      {...confirm}
    >
      {effects.length > 0 ? (
        <View
          accessible
          accessibilityLabel={[effectsLabel, ...effects].join(' ')}
          className="gap-2 rounded-2xl bg-details-primary px-4 py-3"
        >
          <Text className="text-[13px] font-semibold uppercase text-label-primary">
            {effectsLabel}
          </Text>
          {effects.map(effect => (
            <View key={effect} className="flex-row gap-2">
              <Text className="text-[15px] leading-[21px] text-label-primary">
                •
              </Text>
              <Text className="flex-1 text-[15px] leading-[21px] text-label-primary">
                {effect}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ConfirmDialog>
  );
}

export { DeleteOriginDialog };
