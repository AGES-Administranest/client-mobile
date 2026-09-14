import { Bell, ChevronLeft, LogOut, UserRound } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { OptionsModal } from 'app/components/ui/options-modal';
import { useAuth } from 'features/auth';
import {
  inventoryAlertDataFromItems,
  InventoryNotificationsScreen,
  type InventoryAlertData,
} from 'features/inventory';
import { fetchItems } from 'features/materials';
import { useTranslation } from 'shared/i18n';

export function HomeScreen() {
  const { t } = useTranslation();
  const { session, account, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [accountVisible, setAccountVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [inventory, setInventory] = useState<InventoryAlertData>({
    items: [],
    lots: [],
  });

  const openNotifications = useCallback(() => {
    setNotificationsVisible(true);
    if (!session) return;
    setNotificationStatus('loading');
    fetchItems(session.idToken)
      .then(backendItems => {
        setInventory(inventoryAlertDataFromItems(backendItems));
        setNotificationStatus('ready');
      })
      .catch(error => {
        console.warn('[HomeScreen] inventory load failed', error);
        setNotificationStatus('error');
      });
  }, [session]);

  return (
    <View className="flex-1 items-center justify-center">
      <Pressable
        onPress={openNotifications}
        accessibilityRole="button"
        accessibilityLabel={t('inventory.notifications.title')}
        hitSlop={8}
        className="absolute left-4 top-3 h-11 w-11 items-center justify-center rounded-full bg-details-primary active:opacity-70"
      >
        <Icon as={Bell} className="size-5 text-label-quartenery" />
      </Pressable>
      <Pressable
        onPress={() => setAccountVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('auth.account.menu')}
        hitSlop={8}
        className="absolute right-4 top-3 h-11 w-11 items-center justify-center rounded-full bg-details-primary active:opacity-70"
      >
        <Icon as={UserRound} className="size-5 text-label-quartenery" />
      </Pressable>
      <Text className="text-2xl font-semibold">{t('tabbar.day')}</Text>
      <Modal
        visible={notificationsVisible}
        animationType="slide"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View
          className="flex-1 bg-background-modal"
          style={{ paddingTop: insets.top }}
        >
          <Pressable
            onPress={() => setNotificationsVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.back')}
            hitSlop={8}
            className="ml-3 h-11 w-11 items-center justify-center"
          >
            <Icon as={ChevronLeft} className="size-7 text-label-quartenery" />
          </Pressable>
          <InventoryNotificationsScreen
            status={notificationStatus}
            userId={account?.id ?? ''}
            items={inventory.items}
            lots={inventory.lots}
          />
        </View>
      </Modal>
      <OptionsModal
        visible={accountVisible}
        onClose={() => setAccountVisible(false)}
        options={[
          {
            labelKey: 'auth.account.signOut',
            icon: LogOut,
            variant: 'outline',
            onPress: () => {
              setAccountVisible(false);
              signOut();
            },
          },
        ]}
      />
    </View>
  );
}
