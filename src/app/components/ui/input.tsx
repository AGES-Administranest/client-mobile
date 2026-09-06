import * as React from 'react';
import { TextInput } from 'react-native';

import { cn } from 'app/lib/utils';

function Input({
  className,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className={cn(
        'border border-primary rounded-md px-4 py-2 text-label-primary',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
