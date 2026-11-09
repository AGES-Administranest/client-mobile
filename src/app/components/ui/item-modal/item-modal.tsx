import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Button } from 'app/components/ui/button';
import { CategoryFilter } from 'app/components/ui/CategoryFilter';
import { SearchSelect } from 'app/components/ui/search-select';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';
import { useTranslation, type TranslationKey } from 'shared/i18n';
import {
  digitsOnly,
  formatCurrencyInput,
  formatDateInput,
} from 'shared/utils/inputMasks';
import { normalizeForSearch } from 'shared/utils/search';

import {
  validateItemForm,
  type ItemFormErrors,
  type ItemFormField,
} from './domain/itemForm';
import {
  filterStockItems,
  formatExpiration,
  isPastDate,
  toDateInput,
  shouldShowAddOption,
  shouldShowMinQuantity,
  type StockItem,
} from './domain/itemModal';
import { LabelPrimary, LabelTertiary } from '../../../../theme/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type ItemModalMode = 'create' | 'detail';

export type SupplierOption = { id: string; name: string };

// With a picker, the supplier is one of the registered ones; without it
// (stock entry) the field stays free text.
type SupplierPicker = {
  suppliers: readonly SupplierOption[];
  isLoading: boolean;
  hasError: boolean;
  /** A supplier just registered: it becomes the selected one. */
  picked: SupplierOption | null;
  onRegister: (name: string) => void;
};

const MAX_SUPPLIER_RESULTS = 5;

type ItemModalProps = {
  visible: boolean;
  onClose: () => void;
  mode?: ItemModalMode;
  item?: StockItem | null;
  items?: readonly StockItem[];
  categoryOptions?: readonly { value: string; label: string }[];
  unitOptions?: readonly string[];
  onConfirm?: (draft: ItemDraft) => void;
  onEdit?: (item: StockItem) => void;
  onDelete?: (item: StockItem) => void;
  /** Opens a new item already filled in. Keep it stable while visible. */
  initialDraft?: ItemPrefill;
  isSubmitting?: boolean;
  supplierPicker?: SupplierPicker;
  /** Hides the sheet but keeps what was typed (e.g. while a supplier is registered). */
  suspended?: boolean;
  /** iOS: abra o próximo sheet aqui, não no onClose. */
  onClosed?: () => void;
};

export type ItemDraft = {
  category: string;
  name: string;
  supplierName: string | null;
  supplierId: string | null;
  editingItemId: string | null;
  selectedItemId: string | null;
  unitCost: string;
  unit: string;
  quantity: string;
  minQuantity: string | null;
  expiration: string;
};

type ItemPrefill = Partial<
  Pick<ItemDraft, 'name' | 'unit' | 'unitCost' | 'quantity' | 'expiration'>
>;

function ItemModal({
  visible,
  onClose,
  mode = 'create',
  item = null,
  items = [],
  categoryOptions = [],
  unitOptions = [],
  onConfirm,
  onEdit,
  onDelete,
  initialDraft,
  isSubmitting = false,
  supplierPicker,
  suspended = false,
  onClosed,
}: ItemModalProps) {
  const { t, locale } = useTranslation();
  const isDetail = mode === 'detail';
  const isEditing = !isDetail && item !== null;

  const sheet = useSheetAnimation(visible && !suspended, onClose, onClosed);

  const [category, setCategory] = useState(
    item?.category ?? categoryOptions[0]?.value ?? '',
  );
  const [query, setQuery] = useState(item?.name ?? '');
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(item);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [errors, setErrors] = useState<ItemFormErrors>({});
  // Creating or editing is two steps: which item (category and name), then
  // the lot (cost, quantity, expiration). The detail view shows it all.
  const [step, setStep] = useState<0 | 1>(0);

  const [showLotFields, setShowLotFields] = useState(isDetail || item !== null);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const isSingleStep = isDetail;
  const showFirstStep = isSingleStep || step === 0;
  const showSecondStep = isSingleStep || step === 1;
  const [unitCost, setUnitCost] = useState(item ? String(item.unitCost) : '');
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '');
  const [minQuantity, setMinQuantity] = useState(
    item ? String(item.minQuantity) : '',
  );
  const [expiration, setExpiration] = useState(
    toDateInput(item?.expiration ?? null),
  );

  const matches = useMemo(() => {
    const byCategory = items.filter(i => i.category === category);
    return filterStockItems(query, byCategory);
  }, [items, category, query]);

  const showAddOption = shouldShowAddOption(query, matches);

  const showMinQuantity =
    isDetail ||
    isEditing ||
    (showLotFields && shouldShowMinQuantity(selectedItem));

  const isAddingToExisting = !isDetail && !isEditing && selectedItem !== null;
  const showExpiration = (isDetail || showLotFields) && !isAddingToExisting;
  const showSupplier =
    !isDetail && !isEditing && showLotFields && !isAddingToExisting;

  const expirationInPast = !isDetail && isPastDate(expiration);
  const cannotConfirm = isSubmitting || (showExpiration && expirationInPast);

  function clearError(field: ItemFormField) {
    setErrors(current => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function errorText(field: ItemFormField) {
    const code = errors[field];
    return code
      ? t(`itemModal.errors.${field}.${code}` as TranslationKey)
      : null;
  }

  const inputBorder = (field: ItemFormField) =>
    errors[field] ? 'border-destructive' : 'border-details-primary';

  function renderError(field: ItemFormField) {
    const message = errorText(field);
    return message ? (
      <Text className="text-xs text-destructive">{message}</Text>
    ) : null;
  }

  const selectedCategoryLabel =
    categoryOptions.find(c => c.value === category)?.label ?? '';

  const addLabel = t('itemModal.addOption', {
    category: selectedCategoryLabel,
  });

  const namePlaceholder = t('itemModal.namePlaceholder', {
    category: selectedCategoryLabel.toLowerCase(),
  });

  function clearFields() {
    setSupplierName('');
    setSupplierId(null);
    setQuery('');
    setSelectedItem(null);
    setDropdownOpen(false);
    setUnitCost('');
    setUnit('');
    setQuantity('');
    setMinQuantity('');
    setExpiration('');
    setErrors({});
    setShowLotFields(false);
    setIsAddingNew(false);
  }

  const pickedSupplier = supplierPicker?.picked ?? null;
  useEffect(() => {
    if (!pickedSupplier) return;
    setSupplierId(pickedSupplier.id);
    setSupplierName(pickedSupplier.name);
    setErrors(current => {
      if (current.supplierName === undefined) return current;
      const next = { ...current };
      delete next.supplierName;
      return next;
    });
  }, [pickedSupplier]);

  const supplierMatches = useMemo(() => {
    const needle = normalizeForSearch(supplierName);
    return (supplierPicker?.suppliers ?? [])
      .filter(s => normalizeForSearch(s.name).includes(needle))
      .slice(0, MAX_SUPPLIER_RESULTS);
  }, [supplierPicker?.suppliers, supplierName]);

  const supplierStatus = supplierPicker?.isLoading
    ? 'loading'
    : supplierPicker?.hasError
    ? 'error'
    : supplierMatches.length === 0
    ? 'empty'
    : 'results';

  // Typed but not picked: it would be dropped silently, so it is an error.
  const supplierNotPicked =
    supplierPicker !== undefined &&
    showSupplier &&
    supplierName.trim() !== '' &&
    supplierId === null;

  useEffect(() => {
    if (!visible) return;
    setErrors({});
    setStep(0);

    if (item) {
      setCategory(item.category);
      setQuery(item.name);
      setSelectedItem(item);
      setUnitCost(String(item.unitCost));
      setUnit(item.unit);
      setQuantity(String(item.quantity));
      setMinQuantity(String(item.minQuantity));
      setExpiration(toDateInput(item.expiration));
      setDropdownOpen(false);
      setShowLotFields(true);
      setIsAddingNew(false);
      return;
    }

    if (isDetail) return;

    setCategory(categoryOptions[0]?.value ?? '');
    clearFields();

    if (initialDraft) {
      setQuery(initialDraft.name ?? '');
      setUnit(initialDraft.unit ?? '');
      setUnitCost(initialDraft.unitCost ?? '');
      setQuantity(initialDraft.quantity ?? '');
      setExpiration(initialDraft.expiration ?? '');
      setShowLotFields(true);
      setIsAddingNew(true);
    }
  }, [visible, isDetail, item, categoryOptions, initialDraft]);

  function handleSelectExisting(existing: StockItem) {
    setSelectedItem(existing);
    clearError('name');
    setQuery(existing.name);
    setUnitCost(String(existing.unitCost));
    setUnit(existing.unit);
    setQuantity('');
    setExpiration('');
    setDropdownOpen(false);
    setShowLotFields(true);
    setIsAddingNew(false);
  }

  function handleAddNew() {
    clearError('name');
    setSelectedItem(null);
    setDropdownOpen(false);
    setShowLotFields(true);
    setIsAddingNew(true);
  }

  function handleChangeName(text: string) {
    setQuery(text);
    clearError('name');
    if (isEditing) return;

    setSelectedItem(null);

    if (!isAddingNew) {
      setDropdownOpen(true);
    }
  }

  function validate(): ItemFormErrors {
    const found = validateItemForm(
      {
        name: query,
        unitCost,
        unit,
        quantity,
        minQuantity,
        expiration,
        supplierName,
      },
      {
        isEditing,
        hasChosenItem: showLotFields,
        isAddingToExisting,
        showMinQuantity,
        showExpiration,
        showSupplier,
      },
    );
    return supplierNotPicked ? { ...found, supplierName: 'pickOrAdd' } : found;
  }

  function handleNext() {
    const { name, supplierName: supplier } = validate();
    const found: ItemFormErrors = {
      ...(name ? { name } : {}),
      ...(supplier ? { supplierName: supplier } : {}),
    };
    setErrors(found);
    if (Object.keys(found).length === 0) setStep(1);
  }

  function handleConfirm() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      if (found.name) setStep(0);
      return;
    }

    onConfirm?.({
      category,
      name: query,
      editingItemId: isEditing ? item.id : null,
      selectedItemId: isEditing ? null : selectedItem?.id ?? null,
      unitCost,
      unit,
      quantity,
      minQuantity: showMinQuantity ? minQuantity : null,
      expiration: showExpiration ? expiration : '',
      supplierName: showSupplier ? supplierName.trim() || null : null,
      supplierId: showSupplier ? supplierId : null,
    });
  }

  return (
    <Modal
      visible={sheet.isRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={{ flex: 1, opacity: sheet.progress }}>
        <Pressable
          className="flex-1 justify-end bg-background-shade"
          onPress={onClose}
        >
          <Animated.View
            {...sheet.panHandlers}
            style={{
              maxHeight: SCREEN_HEIGHT * 0.9,
              ...sheet.sheetStyle,
            }}
          >
            <Pressable
              className="shrink gap-5 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4"
              onPress={e => e.stopPropagation()}
            >
              <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

              <View className="gap-0.5">
                <Text className="text-xl font-bold text-label-primary">
                  {t('itemModal.title')}
                </Text>
                {isSingleStep ? null : (
                  <Text className="text-xs font-semibold text-label-tertiary">
                    {t(step === 0 ? 'itemModal.step1' : 'itemModal.step2')}
                  </Text>
                )}
              </View>

              <View className="h-px bg-details-primary" />

              <ScrollView
                className="shrink"
                contentContainerClassName="gap-4"
                keyboardShouldPersistTaps="handled"
              >
                {showFirstStep ? (
                  <>
                    <View className="gap-2">
                      <Text className="text-xs font-semibold text-label-primary">
                        {t('itemModal.categoryLabel')}
                      </Text>
                      <CategoryFilter
                        bordered={false}
                        options={
                          isDetail
                            ? categoryOptions.filter(c => c.value === category)
                            : [...categoryOptions]
                        }
                        value={category}
                        onValueChange={value => {
                          if (isDetail) return;
                          setCategory(value);
                          setSelectedItem(null);
                          setDropdownOpen(false);
                        }}
                      />
                    </View>

                    <View className="gap-2">
                      <Text className="text-xs font-semibold text-label-primary">
                        {t('itemModal.nameLabel')}
                      </Text>
                      <TextInput
                        value={query}
                        editable={!isDetail}
                        onChangeText={handleChangeName}
                        onFocus={() => {
                          if (!isAddingNew && !isEditing) setDropdownOpen(true);
                        }}
                        placeholder={namePlaceholder}
                        placeholderTextColor={LabelTertiary}
                        selectionColor={LabelPrimary}
                        maxLength={120}
                        className={`rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary ${inputBorder(
                          'name',
                        )}`}
                      />
                      {renderError('name')}

                      {!isDetail &&
                        dropdownOpen &&
                        (query.length > 0 || matches.length > 0) && (
                          <View className="gap-3">
                            {matches.length > 0 && (
                              <View className="gap-4 rounded-2xl bg-white px-4 py-4 shadow-md shadow-black/10">
                                {matches.map(m => (
                                  <Pressable
                                    key={m.id}
                                    onPress={() => handleSelectExisting(m)}
                                  >
                                    <View className="gap-0.5">
                                      <Text className="text-[15px] font-medium text-label-primary">
                                        {m.name}
                                      </Text>
                                      {m.expiration && (
                                        <Text className="text-[13px] text-label-tertiary">
                                          {formatExpiration(
                                            m.expiration,
                                            locale,
                                          )}
                                        </Text>
                                      )}
                                    </View>
                                  </Pressable>
                                ))}
                              </View>
                            )}
                            {showAddOption && (
                              <Pressable
                                onPress={handleAddNew}
                                className="rounded-2xl bg-white px-4 py-4 shadow-md shadow-black/10"
                                accessibilityRole="button"
                              >
                                <Text className="text-[15px] font-medium text-label-primary">
                                  {addLabel}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        )}
                    </View>
                    {showSupplier && supplierPicker && (
                      <SearchSelect
                        compact
                        className="mb-0"
                        label={t('itemModal.supplierLabel')}
                        placeholder={t('itemModal.supplierPlaceholder')}
                        text={supplierName}
                        selectedId={supplierId}
                        error={errorText('supplierName') ?? undefined}
                        status={supplierStatus}
                        options={supplierMatches.map(m => ({
                          id: m.id,
                          label: m.name,
                        }))}
                        messages={{
                          loading: t('itemModal.supplierLoading'),
                          empty: t('itemModal.supplierEmpty'),
                          error: t('itemModal.supplierError'),
                        }}
                        addOption={
                          supplierStatus === 'empty' &&
                          supplierName.trim() !== ''
                            ? {
                                label: t('itemModal.supplierAdd'),
                                onPress: () =>
                                  supplierPicker.onRegister(
                                    supplierName.trim(),
                                  ),
                              }
                            : undefined
                        }
                        onChangeText={text => {
                          setSupplierName(text);
                          setSupplierId(null);
                          clearError('supplierName');
                        }}
                        onSelect={option => {
                          setSupplierName(option.label);
                          setSupplierId(option.id);
                          clearError('supplierName');
                        }}
                      />
                    )}

                    {showSupplier && !supplierPicker && (
                      <View className="gap-2">
                        <Text className="text-xs font-semibold text-label-primary">
                          {t('itemModal.supplierLabel')}
                        </Text>
                        <TextInput
                          value={supplierName}
                          onChangeText={text => {
                            setSupplierName(text);
                            clearError('supplierName');
                          }}
                          placeholder={t('itemModal.supplierPlaceholder')}
                          placeholderTextColor={LabelTertiary}
                          selectionColor={LabelPrimary}
                          maxLength={120}
                          className={`rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary ${inputBorder(
                            'supplierName',
                          )}`}
                        />
                        {renderError('supplierName')}
                      </View>
                    )}

                    <View className="z-10 flex-row gap-3">
                      <View className="flex-1 gap-2">
                        <Text className="text-xs font-semibold text-label-primary">
                          {t('itemModal.unitCostLabel')}
                        </Text>
                        <TextInput
                          value={unitCost}
                          editable={!isDetail}
                          onChangeText={text => {
                            setUnitCost(formatCurrencyInput(text));
                            clearError('unitCost');
                          }}
                          keyboardType="numeric"
                          placeholder={t('itemModal.unitCostPlaceholder')}
                          placeholderTextColor={LabelTertiary}
                          selectionColor={LabelPrimary}
                          className={`rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary ${inputBorder(
                            'unitCost',
                          )}`}
                        />
                        {renderError('unitCost')}
                      </View>
                      <View className="z-10 flex-1 gap-2">
                        <Pressable
                          disabled={isDetail}
                          onPress={() => setUnitDropdownOpen(open => !open)}
                        >
                          <Text className="text-xs font-semibold text-label-primary">
                            {t('itemModal.unitLabel')}
                          </Text>
                          <View
                            className={`justify-center rounded-xl border bg-white px-4 py-3 ${inputBorder(
                              'unit',
                            )}`}
                          >
                            <Text
                              className={
                                unit
                                  ? 'text-[15px] text-label-primary'
                                  : 'text-[15px] text-label-tertiary'
                              }
                            >
                              {unit || t('itemModal.unitPlaceholder')}
                            </Text>
                          </View>
                        </Pressable>
                        {renderError('unit')}

                        {!isDetail &&
                          unitDropdownOpen &&
                          unitOptions.length > 0 && (
                            <View className="absolute inset-x-0 top-full z-10 mt-1 gap-2 rounded-2xl bg-white px-4 py-4 shadow-md shadow-black/10">
                              {unitOptions.map(option => (
                                <Pressable
                                  key={option}
                                  onPress={() => {
                                    setUnit(option);
                                    clearError('unit');
                                    setUnitDropdownOpen(false);
                                  }}
                                >
                                  <Text className="text-[15px] font-medium text-label-primary">
                                    {option}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          )}
                      </View>
                    </View>
                  </>
                ) : null}

                {showSecondStep ? (
                  <>
                    <View className="gap-2">
                      <Text className="text-xs font-semibold text-label-primary">
                        {t('itemModal.quantityLabel')}
                      </Text>
                      <TextInput
                        value={quantity}
                        editable={!isDetail && !isEditing}
                        onChangeText={text => {
                          setQuantity(digitsOnly(text));
                          clearError('quantity');
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={LabelTertiary}
                        selectionColor={LabelPrimary}
                        className={`rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary ${inputBorder(
                          'quantity',
                        )}`}
                      />
                      {renderError('quantity')}
                    </View>

                    {showMinQuantity && (
                      <View className="gap-2">
                        <Text className="text-xs font-semibold text-label-primary">
                          {t('itemModal.minQuantityLabel')}
                        </Text>
                        <TextInput
                          value={minQuantity}
                          editable={!isDetail}
                          onChangeText={text => {
                            setMinQuantity(digitsOnly(text));
                            clearError('minQuantity');
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={LabelTertiary}
                          selectionColor={LabelPrimary}
                          className={`rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary ${inputBorder(
                            'minQuantity',
                          )}`}
                        />
                        {renderError('minQuantity')}
                      </View>
                    )}

                    {showExpiration && (
                      <View className="gap-2">
                        <Text className="text-xs font-semibold text-label-primary">
                          {t('itemModal.expirationLabel')}
                        </Text>
                        <TextInput
                          value={expiration}
                          editable={!isDetail}
                          onChangeText={text => {
                            setExpiration(formatDateInput(text));
                            clearError('expiration');
                          }}
                          keyboardType="numeric"
                          maxLength={10}
                          placeholder={t('itemModal.expirationPlaceholder')}
                          placeholderTextColor={LabelTertiary}
                          selectionColor={LabelPrimary}
                          className={`rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary ${
                            expirationInPast
                              ? 'border-destructive'
                              : inputBorder('expiration')
                          }`}
                        />
                        {expirationInPast ? (
                          <Text className="text-xs text-destructive">
                            {t('itemModal.expirationPastError')}
                          </Text>
                        ) : (
                          renderError('expiration')
                        )}
                      </View>
                    )}
                  </>
                ) : null}
              </ScrollView>

              {isDetail ? (
                <View className="gap-3">
                  <Button
                    icon={Pencil}
                    shape="pill"
                    className="h-[49px] w-full"
                    onPress={() => item && onEdit?.(item)}
                  >
                    <Text className="text-base font-semibold">
                      {t('itemModal.edit')}
                    </Text>
                  </Button>
                  <Button
                    icon={Trash2}
                    variant="secondary"
                    shape="pill"
                    className="h-[49px] w-full"
                    onPress={() => item && onDelete?.(item)}
                  >
                    <Text className="text-base font-semibold">
                      {t('itemModal.delete')}
                    </Text>
                  </Button>
                </View>
              ) : !isSingleStep && step === 0 ? (
                <Button
                  icon={ArrowRight}
                  shape="pill"
                  className="h-[49px] w-full"
                  onPress={handleNext}
                >
                  <Text className="text-base font-semibold">
                    {t('itemModal.next')}
                  </Text>
                </Button>
              ) : (
                <View className="gap-3">
                  <Button
                    icon={Check}
                    shape="pill"
                    className="h-[49px] w-full"
                    disabled={cannotConfirm}
                    onPress={handleConfirm}
                  >
                    <Text className="text-base font-semibold">
                      {t('itemModal.confirm')}
                    </Text>
                  </Button>
                  {isSingleStep ? null : (
                    <Button
                      icon={ArrowLeft}
                      variant="secondary"
                      shape="pill"
                      className="h-[49px] w-full"
                      disabled={isSubmitting}
                      onPress={() => setStep(0)}
                    >
                      <Text className="text-base font-semibold">
                        {t('itemModal.back')}
                      </Text>
                    </Button>
                  )}
                </View>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

export { ItemModal, type ItemModalMode, type ItemModalProps, type ItemPrefill };
