// src/app/components/ui/item-modal/item-modal.tsx

import { cva } from 'class-variance-authority';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import {
  digitsOnly,
  filterStockItems,
  formatCurrency,
  shouldShowAddOption,
  shouldShowMinQuantity,
  type ItemCategory,
  type StockItem,
} from './domain/itemModal';

const CATEGORIES: readonly {
  value: ItemCategory;
  labelKey:
    | 'itemModal.category.medication'
    | 'itemModal.category.anesthetic'
    | 'itemModal.category.disposable';
}[] = [
  { value: 'medication', labelKey: 'itemModal.category.medication' },
  { value: 'anesthetic', labelKey: 'itemModal.category.anesthetic' },
  { value: 'disposable', labelKey: 'itemModal.category.disposable' },
];

const categoryChipVariants = cva(
  'items-center justify-center rounded-2xl px-4 py-3',
  {
    variants: {
      active: {
        true: 'bg-button-primary',
        false: 'bg-white',
      },
    },
    defaultVariants: { active: false },
  },
);

const categoryTextVariants = cva('text-[15px] font-medium', {
  variants: {
    active: {
      true: 'text-white',
      false: 'text-label-primary',
    },
  },
  defaultVariants: { active: false },
});

type ItemModalMode = 'create' | 'detail';

type ItemModalProps = {
  visible: boolean;
  onClose: () => void;
  mode?: ItemModalMode;
  // No modo "detail", o item cujos dados preenchem a modal.
  item?: StockItem | null;
  // Fonte dos itens do dropdown de NOME (mock por enquanto, service depois).
  items?: readonly StockItem[];
  onConfirm?: (draft: ItemDraft) => void;
  onEdit?: (item: StockItem) => void;
  onDelete?: (item: StockItem) => void;
};

// O que a modal devolve ao confirmar um cadastro.
export type ItemDraft = {
  category: ItemCategory;
  name: string;
  selectedItemId: string | null; // preenchido se veio de item existente
  unitCost: string;
  unit: string;
  quantity: string;
  minQuantity: string | null; // null quando o campo não é exibido
  expiration: string;
};

function ItemModal({
  visible,
  onClose,
  mode = 'create',
  item = null,
  items = [],
  onConfirm,
  onEdit,
  onDelete,
}: ItemModalProps) {
  const { t } = useTranslation();
  const isDetail = mode === 'detail';

  const [category, setCategory] = useState<ItemCategory>(
    item?.category ?? 'medication',
  );
  const [query, setQuery] = useState(item?.name ?? '');
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(item);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unitCost, setUnitCost] = useState(item ? String(item.unitCost) : '');
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '');
  const [minQuantity, setMinQuantity] = useState(
    item ? String(item.minQuantity) : '',
  );
  const [expiration, setExpiration] = useState(item?.expiration ?? '');

  // Itens do dropdown filtrados pela categoria escolhida + texto digitado.
  const matches = useMemo(() => {
    const byCategory = items.filter(i => i.category === category);
    return filterStockItems(query, byCategory);
  }, [items, category, query]);

  const showAddOption = shouldShowAddOption(query, matches);
  // A mínima só aparece pra item novo (nenhum existente selecionado).
  const showMinQuantity = !isDetail && shouldShowMinQuantity(selectedItem);

  const addLabel = t('itemModal.addOption', {
    category: t(CATEGORIES.find(c => c.value === category)!.labelKey),
  });

  // Placeholder do campo NOME muda conforme a categoria selecionada.
  const namePlaceholder = t('itemModal.namePlaceholder', {
    category: t(
      CATEGORIES.find(c => c.value === category)!.labelKey,
    ).toLowerCase(),
  });

  // Zera todos os campos de entrada, sem mexer na categoria.
  function clearFields() {
    setQuery('');
    setSelectedItem(null);
    setDropdownOpen(false);
    setUnitCost('');
    setUnit('');
    setQuantity('');
    setMinQuantity('');
    setExpiration('');
  }

  // Bug 3: toda vez que a modal abre em modo "create", volta ao estado inicial
  // (categoria em medication e campos vazios), pra não herdar o cadastro anterior.
  useEffect(() => {
    if (visible && !isDetail) {
      setCategory('medication');
      clearFields();
    }
  }, [visible, isDetail]);

  function handleSelectExisting(existing: StockItem) {
    // Ao achar um item já cadastrado, preenche os dados dele. A pessoa só
    // ajusta a quantidade que está adicionando. A mínima some (item já existe).
    setSelectedItem(existing);
    setQuery(existing.name);
    setUnitCost(String(existing.unitCost));
    setUnit(existing.unit);
    setQuantity(String(existing.quantity));
    setExpiration(existing.expiration ?? '');
    setDropdownOpen(false);
  }

  function handleAddNew() {
    // Passa a tratar o texto digitado como nome de um item novo.
    setSelectedItem(null);
    setDropdownOpen(false);
  }

  function handleChangeName(text: string) {
    setQuery(text);
    setSelectedItem(null); // digitar de novo desfaz a seleção anterior
    setDropdownOpen(true);
  }

  function handleConfirm() {
    onConfirm?.({
      category,
      name: query,
      selectedItemId: selectedItem?.id ?? null,
      unitCost,
      unit,
      quantity,
      minQuantity: showMinQuantity ? minQuantity : null,
      expiration,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-background-shade"
        onPress={onClose}
      >
        <Pressable
          className="max-h-[90%] gap-5 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4"
          onPress={e => e.stopPropagation()}
        >
          <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

          <Text className="text-xl font-bold text-label-primary">
            {t('itemModal.title')}
          </Text>

          <View className="h-px bg-details-primary" />

          <ScrollView
            className="max-h-[520px]"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-4">
              {/* CATEGORIA */}
              <View className="gap-2">
                <Text className="text-xs font-semibold text-label-primary">
                  {t('itemModal.categoryLabel')}
                </Text>
                <View className="flex-row gap-3">
                  {CATEGORIES.map(cat => {
                    const active = cat.value === category;
                    // No modo detalhe só mostramos a categoria do item.
                    if (isDetail && !active) return null;
                    return (
                      <Pressable
                        key={cat.value}
                        disabled={isDetail}
                        onPress={() => {
                          setCategory(cat.value);
                          clearFields();
                        }}
                        className={categoryChipVariants({ active })}
                      >
                        <Text className={categoryTextVariants({ active })}>
                          {t(cat.labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* NOME (dropdown pesquisável no create, texto simples no detail) */}
              <View className="gap-2">
                <Text className="text-xs font-semibold text-label-primary">
                  {t('itemModal.nameLabel')}
                </Text>
                <TextInput
                  value={query}
                  editable={!isDetail}
                  onChangeText={handleChangeName}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder={namePlaceholder}
                  placeholderTextColor="#9A9A9A"
                  className="rounded-xl border border-details-primary bg-white px-4 py-3 text-[15px] text-label-primary"
                />

                {!isDetail &&
                  dropdownOpen &&
                  (query.length > 0 || matches.length > 0) && (
                    <View className="overflow-hidden rounded-xl border border-details-primary bg-white">
                      {matches.map(m => (
                        <Pressable
                          key={m.id}
                          onPress={() => handleSelectExisting(m)}
                          className="border-b border-details-primary px-4 py-3"
                        >
                          <Text className="text-[15px] text-label-primary">
                            {m.name}
                          </Text>
                        </Pressable>
                      ))}
                      {showAddOption && (
                        <Pressable
                          onPress={handleAddNew}
                          className="px-4 py-3"
                          accessibilityRole="button"
                        >
                          <Text className="text-[15px] font-medium text-button-primary">
                            {addLabel}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
              </View>

              {/* CUSTO UNITÁRIO + UNIDADE */}
              <View className="flex-row gap-3">
                <View className="flex-1 gap-2">
                  <Text className="text-xs font-semibold text-label-primary">
                    {t('itemModal.unitCostLabel')}
                  </Text>
                  <TextInput
                    value={unitCost}
                    editable={!isDetail}
                    onChangeText={text => setUnitCost(formatCurrency(text))}
                    keyboardType="numeric"
                    placeholder={t('itemModal.unitCostPlaceholder')}
                    placeholderTextColor="#9A9A9A"
                    className="rounded-xl border border-details-primary bg-white px-4 py-3 text-[15px] text-label-primary"
                  />
                </View>
                <View className="flex-1 gap-2">
                  <Text className="text-xs font-semibold text-label-primary">
                    {t('itemModal.unitLabel')}
                  </Text>
                  <TextInput
                    value={unit}
                    editable={!isDetail}
                    onChangeText={setUnit}
                    placeholder={t('itemModal.unitPlaceholder')}
                    placeholderTextColor="#9A9A9A"
                    className="rounded-xl border border-details-primary bg-white px-4 py-3 text-[15px] text-label-primary"
                  />
                </View>
              </View>

              {/* QUANTIDADE */}
              <View className="gap-2">
                <Text className="text-xs font-semibold text-label-primary">
                  {t('itemModal.quantityLabel')}
                </Text>
                <TextInput
                  value={quantity}
                  editable={!isDetail}
                  onChangeText={text => setQuantity(digitsOnly(text))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9A9A9A"
                  className="rounded-xl border border-details-primary bg-white px-4 py-3 text-[15px] text-label-primary"
                />
              </View>

              {/* QUANTIDADE MÍNIMA — some quando um item existente foi selecionado */}
              {showMinQuantity && (
                <View className="gap-2">
                  <Text className="text-xs font-semibold text-label-primary">
                    {t('itemModal.minQuantityLabel')}
                  </Text>
                  <TextInput
                    value={minQuantity}
                    onChangeText={text => setMinQuantity(digitsOnly(text))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9A9A9A"
                    className="rounded-xl border border-details-primary bg-white px-4 py-3 text-[15px] text-label-primary"
                  />
                </View>
              )}

              {/* VALIDADE — todos têm validade */}
              <View className="gap-2">
                <Text className="text-xs font-semibold text-label-primary">
                  {t('itemModal.expirationLabel')}
                </Text>
                <TextInput
                  value={expiration}
                  editable={!isDetail}
                  onChangeText={setExpiration}
                  placeholder={t('itemModal.expirationPlaceholder')}
                  placeholderTextColor="#9A9A9A"
                  className="rounded-xl border border-details-primary bg-white px-4 py-3 text-[15px] text-label-primary"
                />
              </View>
            </View>
          </ScrollView>

          {/* AÇÕES */}
          {isDetail ? (
            <View className="gap-3">
              <Pressable
                onPress={() => item && onEdit?.(item)}
                className="items-center rounded-full bg-button-primary py-4"
              >
                <Text className="text-base font-semibold text-white">
                  {t('itemModal.edit')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => item && onDelete?.(item)}
                className="items-center rounded-full bg-destructive py-4"
              >
                <Text className="text-base font-semibold text-destructive-foreground">
                  {t('itemModal.delete')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleConfirm}
              className="flex-row items-center justify-center gap-2 rounded-full bg-button-primary py-4"
            >
              <Text className="text-base font-semibold text-white">
                ✓ {t('itemModal.confirm')}
              </Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export { ItemModal, type ItemModalMode, type ItemModalProps };
