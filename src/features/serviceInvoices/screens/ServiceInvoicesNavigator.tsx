import { LinearGradient } from 'expo-linear-gradient';
import { useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SlideInModal } from 'app/components/ui/slide-in-modal';
import { MIN_SCREEN_BOTTOM, MIN_SCREEN_TOP } from 'app/lib/layout';
import { BackgroundPrimary } from 'theme/colors';

import { ServiceInvoiceCorrectionScreen } from './ServiceInvoiceCorrectionScreen';
import { ServiceInvoiceDetailScreen } from './ServiceInvoiceDetailScreen';
import { ServiceInvoiceListScreen } from './ServiceInvoiceListScreen';
import type { ServiceInvoiceRecord } from '../domain/serviceInvoiceRecord.types';

export type ServiceInvoiceRoute =
  | { name: 'list' }
  | { name: 'detail'; invoiceId: string }
  | { name: 'correction'; record: ServiceInvoiceRecord };

type ServiceInvoicesNavigatorProps = {
  stack: ServiceInvoiceRoute[];
  onPush: (route: ServiceInvoiceRoute) => void;
  onPop: () => void;
  onAddInvoice?: () => void;
  overlay?: ReactNode;
};

export function ServiceInvoicesNavigator({
  stack,
  onPush,
  onPop,
  onAddInvoice,
  overlay,
}: ServiceInvoicesNavigatorProps) {
  const insets = useSafeAreaInsets();
  const lastRoute = useRef<ServiceInvoiceRoute | null>(null);
  const top = stack[stack.length - 1] ?? null;
  if (top) lastRoute.current = top;
  const route = top ?? lastRoute.current;

  return (
    <SlideInModal visible={top !== null} onRequestClose={onPop}>
      <View
        className="flex-1"
        style={{
          paddingTop: Math.max(insets.top, MIN_SCREEN_TOP),
          paddingBottom: Math.max(insets.bottom, MIN_SCREEN_BOTTOM),
        }}
      >
        <LinearGradient
          colors={BackgroundPrimary.colors}
          locations={BackgroundPrimary.locations}
          style={StyleSheet.absoluteFill}
        />
        {route?.name === 'list' ? (
          <ServiceInvoiceListScreen
            onOpenInvoice={invoiceId => onPush({ name: 'detail', invoiceId })}
            onAddInvoice={onAddInvoice}
            onBack={onPop}
          />
        ) : null}
        {route?.name === 'detail' ? (
          <ServiceInvoiceDetailScreen
            invoiceId={route.invoiceId}
            onBack={onPop}
            onCorrect={record => onPush({ name: 'correction', record })}
            onDeleted={onPop}
          />
        ) : null}
        {route?.name === 'correction' ? (
          <ServiceInvoiceCorrectionScreen
            record={route.record}
            onCancel={onPop}
            onCorrected={onPop}
          />
        ) : null}
        {top ? overlay : null}
      </View>
    </SlideInModal>
  );
}
