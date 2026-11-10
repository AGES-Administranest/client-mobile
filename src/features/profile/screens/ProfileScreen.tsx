import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Pencil } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { SlideInModal } from 'app/components/ui/slide-in-modal';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { toCalendarDate } from 'shared/utils/calendar';
import { initials } from 'shared/utils/initials';
import { BackgroundPrimary, ButtonPrimary } from 'theme/colors';

import { EditProfileSheet } from '../components/EditProfileSheet';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { ProfileField } from '../components/ProfileField';
import {
  calculateAge,
  displayValue,
  isMissingCrmv,
  type Profile,
  type Sex,
} from '../domain/profile';
import {
  BRAZILIAN_STATES,
  type ProfileFormField,
} from '../domain/validateProfileForm';
import { useEditProfileForm } from '../hooks/useEditProfileForm';
import { useProfile } from '../hooks/useProfile';

// Browsers report no top inset, which left the back button on the edge.
const MIN_TOP_PADDING = 16;
const SAVED_NOTICE_MS = 3000;
const SEXES: Sex[] = ['FEMALE', 'MALE', 'OTHER', 'NOT_INFORMED'];

const styles = StyleSheet.create({ fill: { flex: 1 } });

type ProfileScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileScreen({ visible, onClose }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SlideInModal visible={visible} onRequestClose={onClose}>
      <View
        style={[
          styles.fill,
          {
            paddingTop: Math.max(insets.top, MIN_TOP_PADDING),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <LinearGradient
          colors={BackgroundPrimary.colors}
          locations={BackgroundPrimary.locations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <ProfileContent onClose={onClose} />
      </View>
    </SlideInModal>
  );
}

// Lives inside the Modal, so each opening reads the profile again.
function ProfileContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { state, reload, replace, wasRejected, dismissRejection } =
    useProfile();

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
        <View className="px-4 pt-4">
          <NoticeBanner tone="alert" message={t('profile.sessionExpired')} />
        </View>
      ) : state.status === 'error' ? (
        <View className="px-4 pt-4">
          <NoticeBanner
            tone="alert"
            message={t('profile.loadError')}
            actionLabel={t('common.retry')}
            onAction={reload}
          />
        </View>
      ) : (
        <ProfileDetails
          profile={state.profile}
          isStale={state.isStale}
          hasPendingEdit={state.hasPendingEdit}
          wasRejected={wasRejected}
          onDismissRejection={dismissRejection}
          onSaved={replace}
        />
      )}
    </>
  );
}

type ProfileDetailsProps = {
  profile: Profile;
  isStale: boolean;
  hasPendingEdit: boolean;
  wasRejected: boolean;
  onDismissRejection: () => void;
  onSaved: (profile: Profile, hasPendingEdit: boolean) => void;
};

function ProfileDetails({
  profile,
  isStale,
  hasPendingEdit,
  wasRejected,
  onDismissRejection,
  onSaved,
}: ProfileDetailsProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const form = useEditProfileForm({
    profile,
    visible: isEditing,
    onSaved: (saved, savedOffline) => {
      onSaved(saved, savedOffline);
      setIsEditing(false);
      setShowSaved(!savedOffline);
      AccessibilityInfo.announceForAccessibility(
        t(savedOffline ? 'profile.pendingNotice' : 'profile.editForm.saved'),
      );
    },
  });

  useEffect(() => {
    if (!showSaved) return;
    const timer = setTimeout(() => setShowSaved(false), SAVED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [showSaved]);

  const sexLabels: Record<Sex, string> = useMemo(
    () => ({
      FEMALE: t('profile.sex.FEMALE'),
      MALE: t('profile.sex.MALE'),
      OTHER: t('profile.sex.OTHER'),
      NOT_INFORMED: t('profile.sex.NOT_INFORMED'),
    }),
    [t],
  );

  const labels: Record<ProfileFormField | 'email', string> = {
    name: t('profile.fields.name'),
    crmv: t('profile.fields.crmv'),
    email: t('profile.fields.email'),
    birthDate: t('profile.editForm.birthDate'),
    sex: t('profile.fields.sex'),
    city: t('profile.fields.city'),
    state: t('profile.editForm.state'),
  };
  const placeholders: Record<ProfileFormField, string> = {
    name: t('profile.editForm.placeholders.name'),
    crmv: t('profile.editForm.placeholders.crmv'),
    birthDate: t('profile.editForm.placeholders.birthDate'),
    sex: t('profile.editForm.placeholders.sex'),
    city: t('profile.editForm.placeholders.city'),
    state: t('profile.editForm.placeholders.state'),
  };
  const errors = Object.fromEntries(
    Object.entries(form.errors).map(([field, code]) => [
      field,
      t(`profile.editForm.errors.${code}`),
    ]),
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
        {showSaved ? (
          <NoticeBanner tone="success" message={t('profile.editForm.saved')} />
        ) : null}
        {hasPendingEdit ? (
          <NoticeBanner tone="info" message={t('profile.pendingNotice')} />
        ) : null}
        {wasRejected ? (
          <NoticeBanner
            tone="alert"
            message={t('profile.rejectedNotice')}
            actionLabel={t('profile.rejectedDismiss')}
            actionPlacement="inline"
            onAction={onDismissRejection}
          />
        ) : null}
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
      </ScrollView>
      <View className="px-4 pb-4 pt-2">
        <Button
          icon={Pencil}
          shape="pill"
          className="h-[49px] w-full"
          onPress={() => setIsEditing(true)}
        >
          <Text className="font-medium">{t('profile.edit')}</Text>
        </Button>
      </View>
      <EditProfileSheet
        visible={isEditing}
        texts={{
          title: t('profile.editForm.title'),
          close: t('profile.editForm.close'),
          save: t('profile.editForm.save'),
          cancel: t('profile.editForm.cancel'),
          emailHint: t('profile.editForm.emailHint'),
          labels,
          placeholders,
        }}
        email={profile.email}
        values={form.values}
        errors={errors}
        sexOptions={SEXES.map(sex => ({ value: sex, label: sexLabels[sex] }))}
        stateOptions={BRAZILIAN_STATES.map(uf => ({ value: uf, label: uf }))}
        submitError={
          form.submitError === 'session'
            ? t('profile.sessionExpired')
            : form.submitError
            ? t('profile.editForm.saveError')
            : null
        }
        canSave={form.canSave}
        isSaving={form.isSaving}
        onChangeText={form.onChangeText}
        onChangeSex={form.onChangeSex}
        onSave={form.save}
        onCancel={() => {
          form.reset();
          setIsEditing(false);
        }}
      />
    </>
  );
}
