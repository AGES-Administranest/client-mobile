import { useId, useState } from 'react';
import {
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
} from 'react-native';
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
  ChartMinimum,
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
  // 0..1 like `y`: the minimum of the month, on the same axis.
  minimumY: number;
  label: string;
  accessibilityLabel: string;
};

export type EvolutionChartTick = { y: number; label: string };

export type EvolutionChartTooltip = {
  month: string;
  value: string;
  change: { label: string; tone: TrendTone } | null;
  // An extra line, for a month whose rate is its minimum.
  note: string | null;
};

export type HourlyRateEvolutionChartProps = {
  points: EvolutionChartPoint[];
  ticks: EvolutionChartTick[];
  selectedId: string | null;
  tooltip: EvolutionChartTooltip | null;
  // Draws the dashed minimum line; off when it would sit under the rate line.
  showMinimum: boolean;
  // Some month of the window has a tooltip note: the plot starts lower to
  // make room for the extra line in all of them.
  tooltipHasNote: boolean;
  // The month labels carry the year ("Nov/25"), which needs a wider box.
  monthLabelsHaveYear: boolean;
  onSelect: (id: string) => void;
};

// Layout read from the Figma frame "Gráfico · evolução" (node 2486:4133),
// 318 x 214, unless noted.
const HEIGHT = 214;
// Tooltip (node 2486:4166): three lines (15 + 20 + 15) with a 1px gap between
// them and 6px of padding above and below.
export const TOOLTIP_HEIGHT = 15 + 20 + 15 + 2 + 12;
const TOOLTIP_WIDTH = 112;
// In a window where some month has the note, "Igual ao mínimo (sem margem)"
// must fit on one line; the other windows keep the Figma's 112px.
const TOOLTIP_NOTE_WIDTH = 176;
// Halo of the selected point (node 2486:4158), a 16px circle.
const SELECTED_HALO_RADIUS = 8;
// The Figma puts the top grid line at y=64, right where the tooltip ends, so
// the halo of the highest point touches it. Here the highest point sits 8px
// lower (72) so that the halo starts below the tooltip that is drawn over it.
export const PLOT_TOP = TOOLTIP_HEIGHT + SELECTED_HALO_RADIUS;
// The note of a month whose rate is its minimum is a fourth tooltip line
// (15 + the 1px gap), and the plot moves down by as much.
export const TOOLTIP_NOTE_HEIGHT = 16;
// The lowest grid line, "Grade R$ 70" (node 2486:4134).
const PLOT_BOTTOM = 180;
// Month labels (node 2486:4160) are centred on their point and 30px wide, as
// in the Figma. Only when they carry a year ("Nov/25", about 32px at 10px,
// which would break in two lines) the box is 42px. The points are 50px apart
// or more.
const LABELS_TOP = 198;
const MONTH_LABEL_WIDTH = 30;
const MONTH_LABEL_WITH_YEAR_WIDTH = 42;
// The grid starts at x=38 (node 2486:4134), after the Y labels, and the newest
// point sits at x=304, 14px short of the right edge.
const TICK_LABELS_WIDTH = 38;
const PLOT_RIGHT_INSET = 14;
// The marker of the selected month (node 2486:4148) starts at y=48, behind
// the tooltip, and runs down to the baseline at half opacity.
const MARKER_TOP = 48;
const MARKER_OPACITY = 0.5;
// Until the first layout pass, and wherever there is none (tests).
const DEFAULT_WIDTH = 318;
// Grid lines and the marker of the selected month: 3px dash, 4px gap.
const GRID_DASH = '3 4';
// The minimum line (node 2486:4151).
export const MINIMUM_DASH = '4 4';

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

const rootStyle = { height: HEIGHT };

// react-native-web 0.21 does not turn `accessibilityState` into DOM
// attributes: on the web the selected month is a toggle button, announced by
// `aria-pressed`. Native keeps `accessibilityState.selected`, which is what
// TalkBack and VoiceOver read; `aria-pressed` does not exist there.
const pressedOnWeb = (pressed: boolean) =>
  (Platform.OS === 'web' ? { 'aria-pressed': pressed } : {}) as object;

// Line chart of the rate by month, with the minimum as a dashed line on the
// same axis. Each month owns a whole column of the chart as its touch target,
// so a 7px dot is never what has to be hit: the column runs from the midpoint
// with the month before it to the midpoint with the next one, and the first
// and the last reach the edges, so the columns never overlap and leave no gap.
export function HourlyRateEvolutionChart({
  points,
  ticks,
  selectedId,
  tooltip,
  showMinimum,
  tooltipHasNote,
  monthLabelsHaveYear,
  onSelect,
}: HourlyRateEvolutionChartProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const gradientId = `evolution-area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const plotWidth = width - TICK_LABELS_WIDTH - PLOT_RIGHT_INSET;
  const toX = (x: number) => TICK_LABELS_WIDTH + x * plotWidth;
  const plotTop = PLOT_TOP + (tooltipHasNote ? TOOLTIP_NOTE_HEIGHT : 0);
  const toY = (y: number) => PLOT_BOTTOM - y * (PLOT_BOTTOM - plotTop);

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
  const minimumLine = placedPoints
    .map(point => `${point.px},${toY(point.minimumY)}`)
    .join(' ');
  const columns = placedPoints.map((point, index) => {
    const left = index === 0 ? 0 : (placedPoints[index - 1].px + point.px) / 2;
    const right =
      index === placedPoints.length - 1
        ? width
        : (point.px + placedPoints[index + 1].px) / 2;
    return { left, width: right - left };
  });

  const tooltipWidth = tooltipHasNote ? TOOLTIP_NOTE_WIDTH : TOOLTIP_WIDTH;
  const labelWidth = monthLabelsHaveYear
    ? MONTH_LABEL_WITH_YEAR_WIDTH
    : MONTH_LABEL_WIDTH;

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} className="w-full" style={rootStyle}>
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
              strokeDasharray={index === 0 ? undefined : GRID_DASH}
            />
          ))}

          <Path d={area} fill={`url(#${gradientId})`} />

          {selected ? (
            <Line
              x1={selected.px}
              x2={selected.px}
              y1={MARKER_TOP}
              y2={PLOT_BOTTOM}
              stroke={LabelQuartenery}
              strokeOpacity={MARKER_OPACITY}
              strokeWidth={1}
              strokeDasharray={GRID_DASH}
            />
          ) : null}

          {showMinimum ? (
            <Polyline
              points={minimumLine}
              fill="none"
              stroke={ChartMinimum}
              strokeWidth={1.5}
              strokeDasharray={MINIMUM_DASH}
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
            numberOfLines={1}
            style={placed(point.px - labelWidth / 2, LABELS_TOP, labelWidth)}
          >
            {point.label}
          </Text>
        ))}
      </View>

      {placedPoints.map((point, index) => (
        <Pressable
          key={point.id}
          accessibilityRole="button"
          accessibilityLabel={point.accessibilityLabel}
          accessibilityState={{ selected: point.id === selectedId }}
          {...pressedOnWeb(point.id === selectedId)}
          onPress={() => onSelect(point.id)}
          testID={`chart-column-${point.id}`}
          style={column(columns[index].left, columns[index].width)}
        />
      ))}

      {selected && tooltip ? (
        <View
          pointerEvents="none"
          className="gap-px rounded-[8px] bg-tooltip-surface px-2.5 py-1.5 shadow-[0px_6px_7px_rgba(0,0,0,0.25)]"
          style={placed(
            clamp(selected.px - tooltipWidth / 2, 0, width - tooltipWidth),
            0,
            tooltipWidth,
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
          {tooltip.note ? (
            <Text className="text-[10px] leading-[15px] text-tooltip-month">
              {tooltip.note}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
