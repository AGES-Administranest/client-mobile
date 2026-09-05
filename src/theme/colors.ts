const withOpacity = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
};

export const ButtonPrimary = '#594236';
export const ButtonSecondary = '#A33423';

export const BackgroundPrimary = {
  type: 'linear' as const,
  colors: ['#F3EFFF', '#F7F3F0', '#FBF6E8'] as const,
  locations: [0, 0.5, 1] as const,
};

export const BackgroundModal = '#FEFBF5';
export const BackgroundShade = withOpacity('#504E4E', 33);

export const DetailsPrimary = '#F0F0F7';
export const DetailsSecondary = withOpacity('#FADE84', 50);
export const DetailsTertiary = '#FADE84';

export const LabelPrimary = '#000000';
export const LabelSecondary = '#FFFFFF';
export const LabelTertiary = '#777777';
export const LabelQuartenery = '#594236';
export const LabelPlaceholder = withOpacity('#111111', 50);

export const BorderPrimary = '#D4D4D4';

export const AlertPrimary = '#D95743';

export const Colors = {
  button: {
    primary: ButtonPrimary,
    secondary: ButtonSecondary,
  },
  background: {
    primary: BackgroundPrimary,
    modal: BackgroundModal,
    shade: BackgroundShade,
  },
  details: {
    primary: DetailsPrimary,
    secondary: DetailsSecondary,
    tertiary: DetailsTertiary,
  },
  label: {
    primary: LabelPrimary,
    secondary: LabelSecondary,
    tertiary: LabelTertiary,
    quartenery: LabelQuartenery,
    placeholder: LabelPlaceholder,
  },
  border: {
    primary: BorderPrimary,
  },
  alert: {
    primary: AlertPrimary,
  },
} as const;
