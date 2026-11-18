import { LogIn, UserPlus } from 'lucide-react-native';

import { useLegalDocuments } from 'shared/hooks/useLegalDocuments';
import { useTranslation } from 'shared/i18n';
import { CRMV_MAX_LENGTH } from 'shared/utils/crmv';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { FormMessage } from '../components/FormMessage';
import { SexField } from '../components/SexField';
import { TermsCheckbox } from '../components/TermsCheckbox';
import { TextField } from '../components/TextField';
import type { SignUpSex } from '../domain/validateAuthForm';
import { fieldErrorKey } from '../hooks/authMessageKeys';
import { useSignUpForm } from '../hooks/useSignUpForm';

const SEXES: SignUpSex[] = ['FEMALE', 'MALE', 'OTHER', 'NOT_INFORMED'];

type SignUpScreenProps = {
  onBack: () => void;
  onLogin: () => void;
  onNeedsConfirmation: (email: string, password: string) => void;
};

export function SignUpScreen({
  onBack,
  onLogin,
  onNeedsConfirmation,
}: SignUpScreenProps) {
  const { t } = useTranslation();
  const legal = useLegalDocuments();
  const { form, errors, setField, submit, isSubmitting, errorKey } =
    useSignUpForm({ onNeedsConfirmation });

  const fieldError = (field: keyof typeof errors) => {
    const key = fieldErrorKey(errors[field]);
    return key ? t(key) : undefined;
  };

  return (
    <AuthLayout
      title={t('auth.signUp.title')}
      description={t('auth.signUp.description')}
      backLabel={t('auth.back')}
      onBack={onBack}
    >
      <TextField
        label={t('auth.fields.name')}
        value={form.name}
        onChangeText={value => setField('name', value)}
        error={fieldError('name')}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        editable={!isSubmitting}
      />
      <TextField
        label={t('auth.fields.email')}
        value={form.email}
        onChangeText={value => setField('email', value)}
        error={fieldError('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        editable={!isSubmitting}
      />
      <TextField
        label={t('auth.fields.crmv')}
        placeholder={t('auth.fields.crmvPlaceholder')}
        value={form.crmv}
        onChangeText={value => setField('crmv', value)}
        error={fieldError('crmv')}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={CRMV_MAX_LENGTH}
        returnKeyType="next"
        editable={!isSubmitting}
      />
      <SexField
        label={t('auth.fields.sex')}
        value={form.sex}
        options={SEXES.map(sex => ({
          value: sex,
          label: t(`profile.sex.${sex}`),
        }))}
        disabled={isSubmitting}
        onChange={value => setField('sex', value)}
      />
      <TextField
        label={t('auth.fields.password')}
        value={form.password}
        onChangeText={value => setField('password', value)}
        error={fieldError('password')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        editable={!isSubmitting}
      />
      <TextField
        label={t('auth.fields.passwordConfirmation')}
        value={form.passwordConfirmation}
        onChangeText={value => setField('passwordConfirmation', value)}
        error={fieldError('passwordConfirmation')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={submit}
        editable={!isSubmitting}
      />
      <TermsCheckbox
        label={t('auth.terms.checkbox')}
        checked={form.acceptedTerms}
        onChange={value => setField('acceptedTerms', value)}
        error={fieldError('acceptedTerms')}
        disabled={isSubmitting}
        links={[
          {
            label: t('legal.privacyPolicy.link'),
            onPress: () => legal.open('privacyPolicy'),
          },
          {
            label: t('legal.termsOfUse.link'),
            onPress: () => legal.open('termsOfUse'),
          },
        ]}
        linksError={legal.unavailable ? t('legal.unavailable') : undefined}
      />

      <FormMessage message={errorKey ? t(errorKey) : null} />

      <AuthButton
        label={t('auth.signUp.submit')}
        icon={UserPlus}
        onPress={submit}
        isLoading={isSubmitting}
        className="mt-2"
      />
      <AuthButton
        variant="link"
        label={t('auth.signUp.hasAccount')}
        icon={LogIn}
        onPress={onLogin}
        disabled={isSubmitting}
        className="mt-2"
      />
    </AuthLayout>
  );
}
