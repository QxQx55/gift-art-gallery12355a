import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight, Sparkles } from 'lucide-react';
import { ALL_PRINTS, ART_COLLECTIONS, ArtworkPrint } from '../data/artworks';
import { useCart } from '../context/CartContext';

interface SearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArtwork: (artwork: ArtworkPrint) => void;
  onSelectCollection: (colId: string) => void;
}

export default function SearchCommandPalette({
  isOpen,
  onClose,
  onSelectArtwork,
  onSelectCollection,
}: SearchCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const { formatPrice } = useCart();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // handled by parent or toggle
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPrints = query.trim()
    ? ALL_PRINTS.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.collectionTitle.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : ALL_PRINTS.slice(0, 6);

  const filteredCollections = query.trim()
    ? ART_COLLECTIONS.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 4)
    : ART_COLLECTIONS.slice(0, 4);

  return (
    <div className='fixed inset-0 z-60 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs'>
      <div className='fixed inset-0' onClick={onClose} />

      <div className='relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 z-10 animate-fade-in'>
        {/* Search Input Bar */}
        <div className='flex items-center px-4 py-3.5 border-b border-zinc-100 bg-zinc-50/50'>
          <Search size={18} className='text-zinc-400 mr-3 shrink-0' />
          <input
            type='text'
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search prints, series (e.g. "The Beautiful Game", "MTV", "Nigeria")...'
            className='w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none'
          />
          <button
            onClick={onClose}
            className='p-1 text-zinc-400 hover:text-zinc-700 rounded-md ml-2'
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className='max-h-96 overflow-y-auto p-4 space-y-4 no-scrollbar'>
          {/* Collections Section */}
          {filteredCollections.length > 0 && (
            <div>
              <div className='text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 px-2'>
                Collections & Series
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {filteredCollections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      onSelectCollection(col.id);
                      onClose();
                    }}
                    className='text-left p-2.5 rounded-xl hover:bg-zinc-100 border border-zinc-100 transition-colors flex items-center justify-between group'
                  >
                    <div>
                      <div className='text-xs font-bold text-zinc-900 group-hover:text-amber-600'>
                        {col.title}
                      </div>
                      <div className='text-[10px] text-zinc-500'>
                        {col.count} prints in series
                      </div>
                    </div>
                    <ArrowRight
                      size={12}
                      className='text-zinc-400 group-hover:translate-x-1 transition-transform'
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prints Section */}
          <div>
            <div className='text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 px-2'>
              Art Prints
            </div>
            {filteredPrints.length === 0 ? (
              <div className='text-center py-8 text-xs text-zinc-400'>
                No prints found matching "{query}"
              </div>
            ) : (
              <div className='space-y-1.5'>
                {filteredPrints.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectArtwork(p);
                      onClose();
                    }}
                    className='w-full text-left p-2 rounded-xl hover:bg-zinc-100 transition-colors flex items-center justify-between group'
                  >
                    <div className='flex items-center gap-3'>
                      <img
                        src={p.src}
                        alt={p.title}
                        className='w-10 h-12 object-cover rounded-md bg-zinc-100'
                      />
                      <div>
                        <div className='text-xs font-bold text-zinc-900 group-hover:text-amber-600'>
                          {p.title}
                        </div>
                        <div className='text-[10px] text-zinc-500'>
                          {p.collectionTitle} • Mayowa Alabi
                        </div>
                      </div>
                    </div>
                    <div className='text-xs font-bold text-zinc-800 pr-2'>
                      {formatPrice(p.basePrice)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className='px-4 py-2.5 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-400 flex items-center justify-between'>
          <span>Navigate with mouse or arrow keys</span>
          <span className='font-mono text-[10px] bg-zinc-200/80 px-1.5 py-0.5 rounded'>
            ESC to close
          </span>
        </div>
      </div>
    </div>
  );
}
