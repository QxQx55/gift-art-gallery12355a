import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ALL_PRINTS,
  ART_COLLECTIONS,
  ArtworkPrint,
  ArtCollection,
} from '../data/artworks';

const STORAGE_KEY = 'shutabug_custom_artworks';
const API_URL = '/api/artworks';

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
  isLoading: boolean;
  addArtwork: (input: NewArtworkInput) => Promise<ArtworkPrint>;
  updateArtwork: (id: string, updates: Partial<NewArtworkInput>) => Promise<void>;
  deleteArtwork: (id: string) => Promise<void>;
  refreshArtworks: () => Promise<void>;
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

function saveToLocalStorage(items: ArtworkPrint[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors when using large images (server /api/artworks persists them)
  }
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
  const [isLoading, setIsLoading] = useState(true);

  const refreshArtworks = useCallback(async () => {
    try {
      const res = await fetch(API_URL, { headers: { Accept: 'application/json' } });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const serverItems = (await res.json()) as ArtworkPrint[];
        if (Array.isArray(serverItems)) {
          if (serverItems.length > 0) {
            setCustomPrints(serverItems);
            saveToLocalStorage(serverItems);
          } else {
            setCustomPrints((localPrev) => (localPrev.length > 0 ? localPrev : []));
          }
        }
      }
    } catch {
      // Fallback gracefully to localStorage on static hosting
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshArtworks();
  }, [refreshArtworks]);

  useEffect(() => {
    saveToLocalStorage(customPrints);
  }, [customPrints]);

  const allPrints = useMemo(() => {
    return [...customPrints, ...ALL_PRINTS];
  }, [customPrints]);

  // All custom artworks appear at the front of the 3D Exhibition
  const exhibitionPrints = useMemo(() => {
    const minCount = Math.max(36, customPrints.length + 24);
    return allPrints.slice(0, minCount);
  }, [allPrints, customPrints.length]);

  // Merge custom artworks into collections and prioritize collections with custom additions
  const collections = useMemo(() => {
    const map = new Map<string, ArtCollection>();

    ART_COLLECTIONS.forEach((col) => {
      map.set(col.id, {
        ...col,
        prints: [...col.prints],
      });
    });

    const activeCustomColOrder: string[] = [];
    customPrints.forEach((p) => {
      if (!activeCustomColOrder.includes(p.collectionId)) {
        activeCustomColOrder.push(p.collectionId);
      }
    });

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
          description: `Curated series "${print.collectionTitle}" featuring original archival works added via the Exhibition Admin.`,
          prints: [print],
        });
      }
    });

    const ordered: ArtCollection[] = [];
    const pushed = new Set<string>();

    activeCustomColOrder.forEach((id) => {
      const col = map.get(id);
      if (col && !pushed.has(id)) {
        ordered.push(col);
        pushed.add(id);
      }
    });

    ART_COLLECTIONS.forEach((c) => {
      if (!pushed.has(c.id)) {
        const col = map.get(c.id);
        if (col) ordered.push(col);
      }
    });

    return ordered;
  }, [customPrints]);

  const addArtwork = async (input: NewArtworkInput): Promise<ArtworkPrint> => {
    const slug = slugify(input.title);
    const colId = input.collectionId.trim() || slugify(input.collectionTitle);
    const optimisticPrint: ArtworkPrint = {
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

    setCustomPrints((prev) => [optimisticPrint, ...prev]);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimisticPrint),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const saved = (await res.json()) as ArtworkPrint;
        setCustomPrints((prev) =>
          prev.map((p) => (p.id === optimisticPrint.id ? saved : p))
        );
        return saved;
      }
    } catch {
      // Static build fallback
    }

    return optimisticPrint;
  };

  const updateArtwork = async (id: string, updates: Partial<NewArtworkInput>) => {
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

    try {
      const res = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const saved = (await res.json()) as ArtworkPrint;
        setCustomPrints((prev) => prev.map((p) => (p.id === id ? saved : p)));
      }
    } catch {
      // Static build fallback
    }
  };

  const deleteArtwork = async (id: string) => {
    setCustomPrints((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch {
      // Static build fallback
    }
  };

  const isCustomArtwork = (id: string) => customPrints.some((p) => p.id === id);

  return (
    <ArtworkContext.Provider
      value={{
        allPrints,
        exhibitionPrints,
        collections,
        customPrints,
        isLoading,
        addArtwork,
        updateArtwork,
        deleteArtwork,
        refreshArtworks,
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
