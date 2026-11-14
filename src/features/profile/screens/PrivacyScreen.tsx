import { FileText, Lock } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { NoticeBanner } from 'app/components/ui/notice-banner';
import { useAuth } from 'features/auth';
import { useLegalDocuments } from 'shared/hooks/useLegalDocuments';
import { useTranslation } from 'shared/i18n';

import { AcceptanceSummary } from '../components/AcceptanceSummary';
import { LegalDocumentCard } from '../components/LegalDocumentCard';
import { ProfileModalFrame } from '../components/ProfileModalFrame';
import { ProfileModalHeader } from '../components/ProfileModalHeader';
import { formatAcceptanceDate } from '../domain/privacy';

type PrivacyScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function PrivacyScreen({ visible, onClose }: PrivacyScreenProps) {
  return (
    <ProfileModalFrame visible={visible} onRequestClose={onClose}>
      <PrivacyContent onClose={onClose} />
    </ProfileModalFrame>
  );
}

function PrivacyContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { account } = useAuth();
  const legal = useLegalDocuments();

  return (
    <>
      <ProfileModalHeader
        title={t('profile.privacy.title')}
        backLabel={t('profile.back')}
        onBack={onClose}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-4 pt-6"
      >
        {legal.unavailable ? (
          <NoticeBanner tone="alert" message={t('legal.unavailable')} />
        ) : null}
        <LegalDocumentCard
          icon={Lock}
          title={t('legal.privacyPolicy.title')}
          description={t('legal.privacyPolicy.description')}
          actionLabel={t('legal.privacyPolicy.action')}
          onAction={() => legal.open('privacyPolicy')}
        />
        <LegalDocumentCard
          icon={FileText}
          title={t('legal.termsOfUse.title')}
          description={t('legal.termsOfUse.description')}
          actionLabel={t('legal.termsOfUse.action')}
          onAction={() => legal.open('termsOfUse')}
        />
      </ScrollView>
      <View className="px-4 pb-4">
        <AcceptanceSummary
          versionLabel={t('profile.privacy.acceptedVersion')}
          version={account?.termsVersion ?? t('profile.notInformed')}
          dateLabel={t('profile.privacy.acceptedAt')}
          date={
            formatAcceptanceDate(account?.termsAcceptedAt ?? null) ??
            t('profile.notInformed')
          }
          note={t('profile.privacy.acceptedNote')}
        />
      </View>
    </>
  );
}
