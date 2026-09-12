import { useState } from 'react';

import type { SegmentValue } from 'app/components/ui/segmented-control';

import {
  ALL_CATEGORIES,
  filterMaterials,
  getCategoriesForSegment,
  MaterialItem,
} from '../domain/materialsFilter';

type MaterialsScreenState = {
  segment: SegmentValue;
  onSegmentChange: (segment: SegmentValue) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  items: MaterialItem[];
  isLoading: boolean;
};

const NO_ITEMS: MaterialItem[] = [];

export function useMaterialsScreen(): MaterialsScreenState {
  const [segment, setSegment] = useState<SegmentValue>('supplies');
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  function onSegmentChange(nextSegment: SegmentValue) {
    setSegment(nextSegment);
    setCategory(ALL_CATEGORIES);
  }

  const categories = getCategoriesForSegment(NO_ITEMS, segment);
  const items = filterMaterials(NO_ITEMS, segment, category);

  return {
    segment,
    onSegmentChange,
    category,
    onCategoryChange: setCategory,
    categories,
    items,
    isLoading: false,
  };
}
