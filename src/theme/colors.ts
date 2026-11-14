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
export const DetailsFinish = '#C2E6CB';
export const DetailsWarm = '#F6F1EC';

export const LabelPrimary = '#000000';
export const LabelSecondary = '#FFFFFF';
export const LabelTertiary = '#777777';
export const LabelQuartenery = '#594236';
export const LabelMuted = '#736961';
export const LabelBody = '#38332E';
export const LabelPlaceholder = withOpacity('#111111', 50);

export const BorderPrimary = '#D4D4D4';
export const BorderWarm = '#DDD5CC';

export const AlertPrimary = '#D95743';
export const AlertSoft = withOpacity('#D95743', 20);

// Hourly calculator composition bar (US20). Pró-labore uses ButtonPrimary.
export const ChartFixedCosts = '#A07E62';
export const ChartVariableCosts = '#D2BBA0';
export const ChartSafetyMargin = '#8C9A5B';

// Hourly rate history (US22): the dashed minimum line of the evolution chart
// and its legend. Same hex as ChartFixedCosts, but not the same meaning.
export const ChartMinimum = '#A07E62';

// Hourly rate history (US22): the rise and fall of the rate from one month to
// the next. The fill sits behind the rise chip.
export const TrendUp = '#5D6B2F';
export const TrendUpFill = '#EEF1E2';
export const TrendDown = '#A34A25';

// Tooltip of the hourly rate evolution chart (US22): a dark card with the
// month, the value and the change in lighter tones.
export const TooltipSurface = '#1A100A';
export const TooltipMonth = '#CFC8C2';
export const TooltipRise = '#D7E0B4';
export const TooltipFall = '#F3B9A0';

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
    finish: DetailsFinish,
    warm: DetailsWarm,
  },
  label: {
    primary: LabelPrimary,
    secondary: LabelSecondary,
    tertiary: LabelTertiary,
    quartenery: LabelQuartenery,
    muted: LabelMuted,
    body: LabelBody,
    placeholder: LabelPlaceholder,
  },
  border: {
    primary: BorderPrimary,
    warm: BorderWarm,
  },
  alert: {
    primary: AlertPrimary,
    soft: AlertSoft,
  },
  chart: {
    fixedCosts: ChartFixedCosts,
    variableCosts: ChartVariableCosts,
    safetyMargin: ChartSafetyMargin,
    minimum: ChartMinimum,
  },
  trend: {
    up: TrendUp,
    upFill: TrendUpFill,
    down: TrendDown,
  },
  tooltip: {
    surface: TooltipSurface,
    month: TooltipMonth,
    rise: TooltipRise,
    fall: TooltipFall,
  },
} as const;
