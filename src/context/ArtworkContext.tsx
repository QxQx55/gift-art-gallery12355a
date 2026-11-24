import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ALL_PRINTS,
  ART_COLLECTIONS,
  ArtworkPrint,
  ArtCollection,
} from '../data/artworks';

const STORAGE_KEY = 'shutabug_custom_artworks';

export interface NewArtworkInput {
  title: string;
  artist: string;
  artistRole: string;
  basePrice: number;
  collectionId: string;
  collectionTitle: string;
  src: string;
  large?: string;
  ratio: number;
  year: string;
  medium: string;
  description: string;
}

interface ArtworkContextType {
  allPrints: ArtworkPrint[];
  exhibitionPrints: ArtworkPrint[];
  collections: ArtCollection[];
  customPrints: ArtworkPrint[];
  addArtwork: (input: NewArtworkInput) => ArtworkPrint;
  updateArtwork: (id: string, updates: Partial<NewArtworkInput>) => void;
  deleteArtwork: (id: string) => void;
  isCustomArtwork: (id: string) => boolean;
}

const ArtworkContext = createContext<ArtworkContextType | undefined>(undefined);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'artwork';
}

export function ArtworkProvider({ children }: { children: React.ReactNode }) {
  const [customPrints, setCustomPrints] = useState<ArtworkPrint[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPrints));
    } catch {
      // Ignore quota errors
    }
  }, [customPrints]);

  const allPrints = useMemo(() => {
    return [...customPrints, ...ALL_PRINTS];
  }, [customPrints]);

  // All custom artworks are guaranteed to appear at the front of the 3D Exhibition
  const exhibitionPrints = useMemo(() => {
    const minCount = Math.max(36, customPrints.length + 24);
    return allPrints.slice(0, minCount);
  }, [allPrints, customPrints.length]);

  // Merge custom artworks into existing collections or create new collections dynamically
  const collections = useMemo(() => {
    const map = new Map<string, ArtCollection>();

    // Clone base collections
    ART_COLLECTIONS.forEach((col) => {
      map.set(col.id, {
        ...col,
        prints: [...col.prints],
      });
    });

    // Prepend custom prints to their target collection (or create a new collection)
    // Iterate in reverse so newest ends up at index 0
    [...customPrints].reverse().forEach((print) => {
      const existing = map.get(print.collectionId);
      if (existing) {
        existing.prints = [print, ...existing.prints];
        existing.count = existing.prints.length;
      } else {
        map.set(print.collectionId, {
          id: print.collectionId,
          title: print.collectionTitle,
          count: 1,
          description: `Curated series "${print.collectionTitle}" featuring original archival works added via the Gallery Admin Studio.`,
          prints: [print],
        });
      }
    });

    // If any new custom collections were created, put them first so they appear in top nav
    const customColIds = new Set(
      customPrints
        .map((p) => p.collectionId)
        .filter((id) => !ART_COLLECTIONS.some((c) => c.id === id))
    );

    const ordered: ArtCollection[] = [];
    customColIds.forEach((id) => {
      const col = map.get(id);
      if (col) ordered.push(col);
    });
    ART_COLLECTIONS.forEach((c) => {
      const col = map.get(c.id);
      if (col) ordered.push(col);
    });

    return ordered;
  }, [customPrints]);

  const addArtwork = (input: NewArtworkInput): ArtworkPrint => {
    const slug = slugify(input.title);
    const colId = input.collectionId.trim() || slugify(input.collectionTitle);
    const newPrint: ArtworkPrint = {
      id: `custom-${slug}-${Date.now()}`,
      slug,
      collectionId: colId,
      collectionTitle: input.collectionTitle.trim() || 'Curated Exhibition',
      title: input.title.trim(),
      artist: input.artist.trim() || 'Mayowa Alabi',
      artistRole: input.artistRole.trim() || 'Visual Artist & Illustrator, Lagos',
      basePrice: Number(input.basePrice) || 50,
      src: input.src.trim(),
      large: (input.large || input.src).trim(),
      ratio: Number(input.ratio) || 0.75,
      year: input.year.trim() || String(new Date().getFullYear()),
      medium: input.medium.trim() || 'Giclée Fine Art Pigment Print',
      description: input.description.trim(),
    };

    setCustomPrints((prev) => [newPrint, ...prev]);
    return newPrint;
  };

  const updateArtwork = (id: string, updates: Partial<NewArtworkInput>) => {
    setCustomPrints((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextTitle = updates.title !== undefined ? updates.title.trim() : p.title;
        return {
          ...p,
          ...updates,
          title: nextTitle,
          slug: slugify(nextTitle),
          large: updates.large ?? updates.src ?? p.large,
          basePrice: updates.basePrice !== undefined ? Number(updates.basePrice) : p.basePrice,
          ratio: updates.ratio !== undefined ? Number(updates.ratio) : p.ratio,
        };
      })
    );
  };

  const deleteArtwork = (id: string) => {
    setCustomPrints((prev) => prev.filter((p) => p.id !== id));
  };

  const isCustomArtwork = (id: string) => customPrints.some((p) => p.id === id);

  return (
    <ArtworkContext.Provider
      value={{
        allPrints,
        exhibitionPrints,
        collections,
        customPrints,
        addArtwork,
        updateArtwork,
        deleteArtwork,
        isCustomArtwork,
      }}
    >
      {children}
    </ArtworkContext.Provider>
  );
}

export function useArtworks() {
  const context = useContext(ArtworkContext);
  if (!context) {
    throw new Error('useArtworks must be used within an ArtworkProvider');
  }
  return context;
}
