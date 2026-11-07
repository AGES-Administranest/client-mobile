import { useId, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Polyline,
  Stop,
} from 'react-native-svg';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import {
  BorderWarm,
  LabelMuted,
  LabelQuartenery,
  LabelSecondary,
} from 'theme/colors';

import type { TrendTone } from './TrendChip';

export type EvolutionChartPoint = {
  id: string;
  // 0..1 across the plot, oldest month on the left.
  x: number;
  // 0..1 from the lowest to the highest tick.
  y: number;
  // The second series at this month, `null` where it has none.
  secondaryY: number | null;
  label: string;
  accessibilityLabel: string;
};

export type EvolutionChartTick = { y: number; label: string };

export type EvolutionChartTooltip = {
  month: string;
  value: string;
  change: { label: string; tone: TrendTone } | null;
};

export type HourlyRateEvolutionChartProps = {
  points: EvolutionChartPoint[];
  ticks: EvolutionChartTick[];
  selectedId: string | null;
  tooltip: EvolutionChartTooltip | null;
  onSelect: (id: string) => void;
};

const HEIGHT = 214;
// The tooltip stacks three lines (15 + 20 + 15) with a 1px gap between them
// and 6px of padding above and below.
export const TOOLTIP_HEIGHT = 15 + 20 + 15 + 2 + 12;
const SELECTED_HALO_RADIUS = 8;
// The highest point sits at PLOT_TOP, so its halo must start below the tooltip
// that is drawn over it.
export const PLOT_TOP = TOOLTIP_HEIGHT + SELECTED_HALO_RADIUS;
const PLOT_BOTTOM = 180;
const LABELS_TOP = 198;
const TICK_LABELS_WIDTH = 38;
const PLOT_RIGHT_INSET = 14;
const MONTH_LABEL_WIDTH = 30;
const TOOLTIP_WIDTH = 112;
const MAX_COLUMN_WIDTH = 96;
// Until the first layout pass, and wherever there is none (tests).
const DEFAULT_WIDTH = 318;
const DASH = '3 4';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const placed = (left: number, top: number, width?: number) => ({
  position: 'absolute' as const,
  left,
  top,
  width,
});

const column = (left: number, width: number) => ({
  position: 'absolute' as const,
  left,
  top: 0,
  width,
  height: HEIGHT,
});

// Line chart of one series by month, with a second one on the same axis when
// the points carry it. Each month owns a whole column of the chart as its
// touch target, so a 7px dot is never what has to be hit.
export function HourlyRateEvolutionChart({
  points,
  ticks,
  selectedId,
  tooltip,
  onSelect,
}: HourlyRateEvolutionChartProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const gradientId = `evolution-area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const plotWidth = width - TICK_LABELS_WIDTH - PLOT_RIGHT_INSET;
  const toX = (x: number) => TICK_LABELS_WIDTH + x * plotWidth;
  const toY = (y: number) => PLOT_BOTTOM - y * (PLOT_BOTTOM - PLOT_TOP);

  const placedPoints = points.map(point => ({
    ...point,
    px: toX(point.x),
    py: toY(point.y),
  }));
  const selected = placedPoints.find(point => point.id === selectedId);
  const line = placedPoints.map(point => `${point.px},${point.py}`).join(' ');
  const area = [
    `M${placedPoints[0].px},${PLOT_BOTTOM}`,
    ...placedPoints.map(point => `L${point.px},${point.py}`),
    `L${placedPoints[placedPoints.length - 1].px},${PLOT_BOTTOM}`,
    'Z',
  ].join(' ');
  const secondaryLine = placedPoints
    .filter(point => point.secondaryY !== null)
    .map(point => `${point.px},${toY(point.secondaryY as number)}`)
    .join(' ');
  const columnWidth = Math.min(
    points.length > 1 ? plotWidth / (points.length - 1) : plotWidth,
    MAX_COLUMN_WIDTH,
  );

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} className="h-[214px] w-full">
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={LabelQuartenery} stopOpacity={0.22} />
              <Stop offset="1" stopColor={LabelQuartenery} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {ticks.map((tick, index) => (
            <Line
              key={tick.label}
              x1={TICK_LABELS_WIDTH}
              x2={width}
              y1={toY(tick.y)}
              y2={toY(tick.y)}
              stroke={BorderWarm}
              strokeWidth={1}
              strokeDasharray={index === 0 ? undefined : DASH}
            />
          ))}

          <Path d={area} fill={`url(#${gradientId})`} />

          {selected ? (
            <Line
              x1={selected.px}
              x2={selected.px}
              y1={selected.py}
              y2={PLOT_BOTTOM}
              stroke={LabelQuartenery}
              strokeWidth={1}
              strokeDasharray={DASH}
            />
          ) : null}

          {secondaryLine ? (
            <Polyline
              points={secondaryLine}
              fill="none"
              stroke={LabelMuted}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          ) : null}

          <Polyline
            points={line}
            fill="none"
            stroke={LabelQuartenery}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {placedPoints.map(point =>
            point.id === selectedId ? null : (
              <Circle
                key={point.id}
                cx={point.px}
                cy={point.py}
                r={3.5}
                fill={LabelSecondary}
                stroke={LabelQuartenery}
                strokeWidth={2}
              />
            ),
          )}
          {selected ? (
            <>
              <Circle
                cx={selected.px}
                cy={selected.py}
                r={SELECTED_HALO_RADIUS}
                fill={LabelQuartenery}
                fillOpacity={0.15}
              />
              <Circle
                cx={selected.px}
                cy={selected.py}
                r={5}
                fill={LabelQuartenery}
                stroke={LabelSecondary}
                strokeWidth={2}
              />
            </>
          ) : null}
        </Svg>

        {ticks.map(tick => (
          <Text
            key={tick.label}
            className="text-[10px] leading-3 text-label-muted"
            style={placed(0, toY(tick.y) - 6)}
          >
            {tick.label}
          </Text>
        ))}
        {placedPoints.map(point => (
          <Text
            key={point.id}
            className={cn(
              'text-center text-[10px] leading-3',
              point.id === selectedId
                ? 'font-semibold text-label-primary'
                : 'text-label-muted',
            )}
            style={placed(
              point.px - MONTH_LABEL_WIDTH / 2,
              LABELS_TOP,
              MONTH_LABEL_WIDTH,
            )}
          >
            {point.label}
          </Text>
        ))}
      </View>

      {placedPoints.map(point => (
        <Pressable
          key={point.id}
          accessibilityRole="button"
          accessibilityLabel={point.accessibilityLabel}
          accessibilityState={{ selected: point.id === selectedId }}
          onPress={() => onSelect(point.id)}
          testID={`chart-column-${point.id}`}
          style={column(
            clamp(point.px - columnWidth / 2, 0, width - columnWidth),
            columnWidth,
          )}
        />
      ))}

      {selected && tooltip ? (
        <View
          pointerEvents="none"
          className="gap-px rounded-lg bg-tooltip-surface px-2.5 py-1.5 shadow-[0px_6px_7px_rgba(0,0,0,0.25)]"
          style={placed(
            clamp(selected.px - TOOLTIP_WIDTH / 2, 0, width - TOOLTIP_WIDTH),
            0,
            TOOLTIP_WIDTH,
          )}
        >
          <Text className="text-[10px] leading-[15px] text-tooltip-month">
            {tooltip.month}
          </Text>
          <Text className="text-sm font-bold leading-5 text-white">
            {tooltip.value}
          </Text>
          {tooltip.change ? (
            <Text
              className={cn(
                'text-[10px] leading-[15px]',
                tooltip.change.tone === 'down'
                  ? 'text-tooltip-fall'
                  : tooltip.change.tone === 'up'
                  ? 'text-tooltip-rise'
                  : 'text-tooltip-month',
              )}
            >
              {tooltip.change.label}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
