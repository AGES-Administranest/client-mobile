import { useEffect, useState } from 'react';

import type { SegmentValue } from 'app/components/ui/segmented-control';

import {
  ALL_CATEGORIES,
  filterMaterials,
  getCategoriesForSegment,
  MaterialItem,
} from '../domain/materialsFilter';
import { fetchMaterials } from '../services/materialsService';

type MaterialsScreenState = {
  segment: SegmentValue;
  onSegmentChange: (segment: SegmentValue) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  items: MaterialItem[];
  isLoading: boolean;
};

export function useMaterialsScreen(): MaterialsScreenState {
  const [allItems, setAllItems] = useState<MaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [segment, setSegment] = useState<SegmentValue>('supplies');
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  useEffect(() => {
    let isMounted = true;

    fetchMaterials().then(materials => {
      if (isMounted) {
        setAllItems(materials);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function onSegmentChange(nextSegment: SegmentValue) {
    setSegment(nextSegment);
    setCategory(ALL_CATEGORIES);
  }

  const categories = getCategoriesForSegment(allItems, segment);
  const items = filterMaterials(allItems, segment, category);

  return {
    segment,
    onSegmentChange,
    category,
    onCategoryChange: setCategory,
    categories,
    items,
    isLoading,
  };
}
