import type {
  AdjustmentReason,
  MeasurementUnit,
  StockMovementSource,
  StockMovementType,
} from '../domain/stockMovement';

export type BackendMeasurementUnit =
  | 'UNIT'
  | 'AMPOULE'
  | 'VIAL'
  | 'BOX'
  | 'ML'
  | 'MG'
  | 'GRAM'
  | 'TABLET'
  | 'OTHER';

export type BackendMovementType = 'INBOUND' | 'OUTBOUND';

export type BackendMovementSource =
  | 'MANUAL_PURCHASE'
  | 'ORDER_IMPORT'
  | 'APPOINTMENT'
  | 'MANUAL_ADJUSTMENT'
  | 'CORRECTION_REVERSAL';

export type BackendAdjustmentReason =
  | 'LOSS'
  | 'EXPIRATION'
  | 'BREAKAGE'
  | 'OTHER';

const UNITS: Record<BackendMeasurementUnit, MeasurementUnit> = {
  UNIT: 'unit',
  AMPOULE: 'ampoule',
  VIAL: 'vial',
  BOX: 'box',
  ML: 'ml',
  MG: 'mg',
  GRAM: 'gram',
  TABLET: 'tablet',
  OTHER: 'other',
};

const TYPES: Record<BackendMovementType, StockMovementType> = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
};

const SOURCES: Record<BackendMovementSource, StockMovementSource> = {
  MANUAL_PURCHASE: 'manualPurchase',
  ORDER_IMPORT: 'orderImport',
  APPOINTMENT: 'appointment',
  MANUAL_ADJUSTMENT: 'manualAdjustment',
  CORRECTION_REVERSAL: 'correctionReversal',
};

const REASONS: Record<BackendAdjustmentReason, AdjustmentReason> = {
  LOSS: 'loss',
  EXPIRATION: 'expiration',
  BREAKAGE: 'breakage',
  OTHER: 'other',
};

function translate<Domain extends string>(
  map: Record<string, Domain | undefined>,
  value: string,
  field: string,
): Domain {
  const translated = map[value];

  if (!translated) {
    throw new Error(`Unknown stock movement ${field}: "${value}"`);
  }

  return translated;
}

export function toMeasurementUnit(value: string): MeasurementUnit {
  return translate(UNITS, value, 'unit');
}

export function toMovementType(value: string): StockMovementType {
  return translate(TYPES, value, 'type');
}

export function toMovementSource(value: string): StockMovementSource {
  return translate(SOURCES, value, 'source');
}

export function toAdjustmentReason(value: string): AdjustmentReason {
  return translate(REASONS, value, 'adjustmentReason');
}

function invert<Backend extends string, Domain extends string>(
  map: Record<Backend, Domain>,
): Record<Domain, Backend> {
  return Object.fromEntries(
    Object.entries(map).map(([backend, domain]) => [domain, backend]),
  ) as Record<Domain, Backend>;
}

const TYPES_TO_BACKEND = invert(TYPES);
const SOURCES_TO_BACKEND = invert(SOURCES);
const REASONS_TO_BACKEND = invert(REASONS);

export function fromMovementType(type: StockMovementType): BackendMovementType {
  return TYPES_TO_BACKEND[type];
}

export function fromMovementSource(
  source: StockMovementSource,
): BackendMovementSource {
  return SOURCES_TO_BACKEND[source];
}

export function fromAdjustmentReason(
  reason: AdjustmentReason,
): BackendAdjustmentReason {
  return REASONS_TO_BACKEND[reason];
}
