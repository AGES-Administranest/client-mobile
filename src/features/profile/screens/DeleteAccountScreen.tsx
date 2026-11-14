import {
  Building2,
  Calculator,
  Car,
  ChartNoAxesColumn,
  FileText,
  Info,
  Package,
  TriangleAlert,
  WifiOff,
  Wrench,
} from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { DeletionDialog } from '../components/DeletionDialog';
import { DeletionSuccessCard } from '../components/DeletionSuccessCard';
import { PasswordField } from '../components/PasswordField';
import { ProfileModalFrame } from '../components/ProfileModalFrame';
import { ProfileModalHeader } from '../components/ProfileModalHeader';
import {
  RemovedDataCard,
  type RemovedDataItem,
} from '../components/RemovedDataCard';
import {
  useDeleteAccount,
  type DeleteAccountState,
} from '../hooks/useDeleteAccount';

type DeleteAccountScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function DeleteAccountScreen({
  visible,
  onClose,
}: DeleteAccountScreenProps) {
  const deletion = useDeleteAccount(visible);

  return (
    <ProfileModalFrame
      visible={visible}
      onRequestClose={deletion.phase === 'done' ? deletion.finish : onClose}
    >
      <DeleteAccountContent deletion={deletion} onClose={onClose} />
    </ProfileModalFrame>
  );
}

type DeleteAccountContentProps = {
  deletion: DeleteAccountState;
  onClose: () => void;
};

function DeleteAccountContent({
  deletion,
  onClose,
}: DeleteAccountContentProps) {
  const { t } = useTranslation();
  const { phase } = deletion;

  const removedItems: readonly RemovedDataItem[] = [
    {
      key: 'appointments',
      label: t('profile.deleteAccount.items.appointments'),
      icon: Building2,
    },
    {
      key: 'invoices',
      label: t('profile.deleteAccount.items.invoices'),
      icon: FileText,
    },
    {
      key: 'finance',
      label: t('profile.deleteAccount.items.finance'),
      icon: Calculator,
    },
    {
      key: 'stock',
      label: t('profile.deleteAccount.items.stock'),
      icon: Package,
    },
    {
      key: 'vehicles',
      label: t('profile.deleteAccount.items.vehicles'),
      icon: Car,
    },
    {
      key: 'equipment',
      label: t('profile.deleteAccount.items.equipment'),
      icon: Wrench,
    },
    {
      key: 'reports',
      label: t('profile.deleteAccount.items.reports'),
      icon: ChartNoAxesColumn,
    },
  ];

  if (phase === 'done') {
    return (
      <View className="flex-1 justify-center px-6">
        <DeletionSuccessCard
          title={t('profile.deleteAccount.success.title')}
          message={t('profile.deleteAccount.success.message')}
          actionLabel={t('profile.deleteAccount.success.action')}
          onAction={deletion.finish}
        />
      </View>
    );
  }

  return (
    <>
      <ProfileModalHeader
        title={t('profile.deleteAccount.title')}
        backLabel={t('profile.back')}
        onBack={onClose}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-4 pt-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-2 px-2">
          <View className="size-16 items-center justify-center rounded-full bg-alert-soft">
            <Icon as={TriangleAlert} size={28} className="text-alert-primary" />
          </View>
          <Text
            accessibilityRole="header"
            className="text-center text-2xl font-bold text-label-primary"
          >
            {t('profile.deleteAccount.heading')}
          </Text>
          <Text className="text-center text-sm leading-5 text-label-muted">
            {t('profile.deleteAccount.description')}
          </Text>
        </View>
        <RemovedDataCard
          title={t('profile.deleteAccount.removedTitle')}
          items={removedItems}
        />
        <View className="flex-row items-start gap-3 rounded-2xl bg-details-warm p-4">
          <Icon as={Info} size={18} className="mt-0.5 text-label-quartenery" />
          <Text className="flex-1 text-sm leading-5 text-label-muted">
            {t('profile.deleteAccount.retentionNotice')}
          </Text>
        </View>
        <Text className="text-base text-label-body">
          {t('profile.deleteAccount.confirmPrompt')}
        </Text>
        <PasswordField
          label={t('profile.deleteAccount.passwordLabel')}
          placeholder={t('profile.deleteAccount.passwordPlaceholder')}
          showLabel={t('profile.deleteAccount.showPassword')}
          hideLabel={t('profile.deleteAccount.hidePassword')}
          value={deletion.password}
          onChangeText={deletion.setPassword}
          onSubmit={deletion.submit}
          editable={phase === 'idle'}
        />
      </ScrollView>
      <View className="px-4 pb-4 pt-2">
        <Button
          shape="pill"
          disabled={!deletion.canSubmit}
          onPress={deletion.submit}
          accessibilityLabel={t('profile.deleteAccount.submit')}
          className="h-[49px] w-full bg-button-secondary active:opacity-80"
        >
          <Text className="font-medium text-label-secondary">
            {t('profile.deleteAccount.submit')}
          </Text>
        </Button>
      </View>

      <DeletionDialog
        visible={phase === 'deleting'}
        isLoading
        title={t('profile.deleteAccount.deleting.title')}
        message={t('profile.deleteAccount.deleting.message')}
        onRequestClose={deletion.dismiss}
      />
      <DeletionDialog
        visible={phase === 'wrongPassword'}
        title={t('profile.deleteAccount.wrongPassword.title')}
        message={t('profile.deleteAccount.wrongPassword.message')}
        primaryLabel={t('profile.deleteAccount.tryAgain')}
        onPrimary={deletion.dismiss}
        onRequestClose={deletion.dismiss}
      />
      <DeletionDialog
        visible={phase === 'offline'}
        icon={WifiOff}
        title={t('profile.deleteAccount.offline.title')}
        message={t('profile.deleteAccount.offline.message')}
        primaryLabel={t('profile.deleteAccount.tryAgain')}
        onPrimary={deletion.submit}
        secondaryLabel={t('profile.deleteAccount.cancel')}
        onSecondary={deletion.dismiss}
        onRequestClose={deletion.dismiss}
      />
      <DeletionDialog
        visible={phase === 'failed'}
        title={t('profile.deleteAccount.failed.title')}
        message={t('profile.deleteAccount.failed.message')}
        primaryLabel={t('profile.deleteAccount.tryAgain')}
        onPrimary={deletion.dismiss}
        onRequestClose={deletion.dismiss}
      />
    </>
  );
}
