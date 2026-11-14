import { ArrowLeft, Pencil, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { toCalendarDate } from 'shared/utils/calendar';
import { initials } from 'shared/utils/initials';
import { ButtonPrimary } from 'theme/colors';

import { DeleteAccountScreen } from './DeleteAccountScreen';
import { PrivacyScreen } from './PrivacyScreen';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { ProfileField } from '../components/ProfileField';
import { ProfileMenuItem } from '../components/ProfileMenuItem';
import { ProfileModalFrame } from '../components/ProfileModalFrame';
import {
  calculateAge,
  displayValue,
  isMissingCrmv,
  type Profile,
  type Sex,
} from '../domain/profile';
import { useProfile } from '../hooks/useProfile';

type ProfileScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileScreen({ visible, onClose }: ProfileScreenProps) {
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  return (
    <ProfileModalFrame visible={visible} onRequestClose={onClose}>
      <ProfileContent
        onClose={onClose}
        onOpenPrivacy={() => setPrivacyVisible(true)}
        onOpenDeleteAccount={() => setDeleteVisible(true)}
      />
      <PrivacyScreen
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
      />
      <DeleteAccountScreen
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
      />
    </ProfileModalFrame>
  );
}

type ProfileContentProps = {
  onClose: () => void;
  onOpenPrivacy: () => void;
  onOpenDeleteAccount: () => void;
};

// Lives inside the Modal, so each opening reads the profile again.
function ProfileContent({
  onClose,
  onOpenPrivacy,
  onOpenDeleteAccount,
}: ProfileContentProps) {
  const { t } = useTranslation();
  const { state, reload } = useProfile();
  const accountLinks = (
    <View className="gap-2">
      <ProfileMenuItem
        icon={ShieldCheck}
        label={t('profile.privacy.menu')}
        onPress={onOpenPrivacy}
      />
      <ProfileMenuItem
        icon={Trash2}
        label={t('profile.deleteAccount.menu')}
        tone="danger"
        onPress={onOpenDeleteAccount}
      />
    </View>
  );

  return (
    <>
      <View className="h-11 justify-center px-5">
        <Text
          accessibilityRole="header"
          className="text-center text-[26px] font-bold leading-[30px] text-label-primary"
        >
          {t('profile.title')}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('profile.back')}
          hitSlop={8}
          className="absolute left-5 size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
        </Pressable>
      </View>

      {state.status === 'loading' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ButtonPrimary} />
        </View>
      ) : state.status === 'sessionExpired' ? (
        <View className="gap-4 px-4 pt-4">
          <NoticeBanner tone="alert" message={t('profile.sessionExpired')} />
          {accountLinks}
        </View>
      ) : state.status === 'error' ? (
        <View className="gap-4 px-4 pt-4">
          <NoticeBanner
            tone="alert"
            message={t('profile.loadError')}
            actionLabel={t('common.retry')}
            onAction={reload}
          />
          {accountLinks}
        </View>
      ) : (
        <ProfileDetails
          profile={state.profile}
          isStale={state.isStale}
          accountLinks={accountLinks}
        />
      )}
    </>
  );
}

type ProfileDetailsProps = {
  profile: Profile;
  isStale: boolean;
  accountLinks: ReactNode;
};

function ProfileDetails({
  profile,
  isStale,
  accountLinks,
}: ProfileDetailsProps) {
  const { t } = useTranslation();
  const sexLabels: Record<Sex, string> = useMemo(
    () => ({
      FEMALE: t('profile.sex.FEMALE'),
      MALE: t('profile.sex.MALE'),
      OTHER: t('profile.sex.OTHER'),
      NOT_INFORMED: t('profile.sex.NOT_INFORMED'),
    }),
    [t],
  );

  const notInformed = t('profile.notInformed');
  const age = calculateAge(profile.birthDate, toCalendarDate(new Date()));

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 px-4 pb-4 pt-2"
      >
        <ProfileAvatar initials={initials(profile.name)} />
        {isStale ? (
          <NoticeBanner tone="info" message={t('profile.staleNotice')} />
        ) : null}
        {isMissingCrmv(profile) ? (
          <NoticeBanner tone="warning" message={t('profile.crmvNotice')} />
        ) : null}
        <View>
          <ProfileField
            label={t('profile.fields.name')}
            value={displayValue(profile.name, notInformed)}
          />
          <ProfileField
            label={t('profile.fields.crmv')}
            value={displayValue(profile.crmv, notInformed)}
          />
          <ProfileField
            label={t('profile.fields.email')}
            value={displayValue(profile.email, notInformed)}
          />
          <ProfileField
            label={t('profile.fields.age')}
            value={age === null ? notInformed : t('profile.ageValue', { age })}
          />
          <ProfileField
            label={t('profile.fields.sex')}
            value={profile.sex ? sexLabels[profile.sex] : notInformed}
          />
          <ProfileField
            label={t('profile.fields.city')}
            value={displayValue(profile.city, notInformed)}
          />
          <ProfileField
            label={t('profile.fields.state')}
            value={displayValue(profile.state, notInformed)}
          />
        </View>
        {accountLinks}
      </ScrollView>
      <View className="px-4 pb-4 pt-2">
        {/* Editing is US24: PATCH /users/me does not exist yet. */}
        <Button disabled icon={Pencil} shape="pill" className="h-[49px] w-full">
          <Text className="font-medium">{t('profile.edit')}</Text>
        </Button>
      </View>
    </>
  );
}
