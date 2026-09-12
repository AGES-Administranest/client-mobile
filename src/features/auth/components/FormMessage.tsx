import { Text } from 'app/components/ui/text';

type FormMessageProps = {
  message: string | null;
  tone?: 'error' | 'info';
};

export function FormMessage({ message, tone = 'error' }: FormMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <Text
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      className={
        tone === 'error'
          ? 'mb-3 w-full text-center text-sm text-alert-primary'
          : 'mb-3 w-full text-center text-sm text-label-quartenery'
      }
    >
      {message}
    </Text>
  );
}
