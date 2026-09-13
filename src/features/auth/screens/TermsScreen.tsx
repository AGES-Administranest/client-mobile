import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { FormMessage } from '../components/FormMessage';
import { TermsCheckbox } from '../components/TermsCheckbox';
import { fieldErrorKey } from '../hooks/authMessageKeys';
import { useAcceptTerms } from '../hooks/useAcceptTerms';

// Between sign in and the app, for an account without consent to the current
// terms. Going back means leaving the account: there is no use without it.
export function TermsScreen() {
  const { t } = useTranslation();
  const {
    name,
    checked,
    checkError,
    setChecked,
    submit,
    signOut,
    isSubmitting,
    errorKey,
  } = useAcceptTerms();

  const checkErrorKey = fieldErrorKey(checkError);

  return (
    <AuthLayout
      title={t('auth.terms.title')}
      description={t('auth.terms.description', { name })}
      backLabel={t('auth.terms.signOut')}
      onBack={signOut}
    >
      <TermsCheckbox
        label={t('auth.terms.checkbox')}
        checked={checked}
        onChange={setChecked}
        error={checkErrorKey ? t(checkErrorKey) : undefined}
        disabled={isSubmitting}
      />

      <FormMessage message={errorKey ? t(errorKey) : null} />

      <AuthButton
        label={t('auth.terms.submit')}
        onPress={submit}
        isLoading={isSubmitting}
        className="mt-2"
      />
      <AuthButton
        variant="link"
        label={t('auth.terms.signOut')}
        onPress={signOut}
        disabled={isSubmitting}
        className="mt-2"
      />
    </AuthLayout>
  );
}
