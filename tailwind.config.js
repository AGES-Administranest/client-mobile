/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Direct access to any palette entry, regardless of which
        // semantic slot (if any) it's also aliased to above.
        'button-primary': 'hsl(var(--palette-button-primary))',
        'button-secondary': 'hsl(var(--palette-button-secondary))',
        'background-modal': 'hsl(var(--palette-background-modal))',
        'details-primary': 'hsl(var(--palette-details-primary))',
        'details-tertiary': 'hsl(var(--palette-details-tertiary))',
        'label-primary': 'hsl(var(--palette-label-primary))',
        'label-secondary': 'hsl(var(--palette-label-secondary))',
        'label-tertiary': 'hsl(var(--palette-label-tertiary))',
        'border-primary': 'hsl(var(--palette-border-primary))',
        'alert-primary': 'hsl(var(--palette-alert-primary))',
        // Colors from src/theme/colors.ts with no plain-hex CSS var equivalent
        // (opacity baked in, or duplicate of an existing token).
        'background-shade': 'rgba(80, 78, 78, 0.33)',
        'details-secondary': 'rgba(250, 222, 132, 0.5)',
        'label-quartenery': 'hsl(var(--palette-button-primary))',
        'label-placeholder': 'rgba(17, 17, 17, 0.5)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
