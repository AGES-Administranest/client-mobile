import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type TermsCheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  links?: readonly TermsLink[];
};

type TermsLink = {
  label: string;
  onPress: () => void;
};

// Turns each link label found inside the sentence into a tappable piece.
function splitByLinks(label: string, links: readonly TermsLink[]) {
  if (links.length === 0) return [{ text: label, link: undefined }];
  const escaped = links.map(l =>
    l.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  return label
    .split(new RegExp(`(${escaped.join('|')})`))
    .filter(Boolean)
    .map(text => ({ text, link: links.find(l => l.label === text) }));
}

export function TermsCheckbox({
  label,
  checked,
  onChange,
  error,
  disabled = false,
  links = [],
}: TermsCheckboxProps) {
  return (
    <View className="mb-4 w-full">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked, disabled }}
        onPress={() => onChange(!checked)}
        disabled={disabled}
        className="flex-row items-start gap-3 active:opacity-70"
      >
        <View
          className={cn(
            'mt-0.5 size-5 items-center justify-center rounded-md border',
            checked
              ? 'border-button-primary bg-button-primary'
              : 'bg-label-secondary',
            !checked &&
              (error ? 'border-alert-primary' : 'border-border-primary'),
          )}
        >
          {checked ? (
            <Icon as={Check} className="size-3.5 text-label-secondary" />
          ) : null}
        </View>
        <Text className="flex-1 text-sm leading-5 text-label-primary">
          {splitByLinks(label, links).map((part, index) =>
            part.link ? (
              <Text
                key={index}
                accessibilityRole="link"
                onPress={part.link.onPress}
                className="text-sm font-medium leading-5 text-label-quartenery underline"
              >
                {part.text}
              </Text>
            ) : (
              part.text
            ),
          )}
        </Text>
      </Pressable>
      {error ? (
        <Text
          accessibilityRole="alert"
          className="ml-8 mt-1 text-sm text-alert-primary"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
