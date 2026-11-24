import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArtworkPrint } from '../data/artworks';
import { useCart } from '../context/CartContext';
import { useArtworks } from '../context/ArtworkContext';
import ArtworkDetailModal from '../components/ArtworkDetailModal';
import { Search, Filter, Eye, Sparkles } from 'lucide-react';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const collectionParam = searchParams.get('collection') || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkPrint | null>(null);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'title'>('featured');

  const { formatPrice } = useCart();
  const { allPrints, collections } = useArtworks();

  // Active collection
  const activeCollection = collectionParam !== 'all'
    ? collections.find((c) => c.id === collectionParam)
    : null;

  // Filtered & Sorted prints
  const displayedPrints = useMemo(() => {
    let result = allPrints;

    if (collectionParam !== 'all') {
      result = result.filter((p) => p.collectionId === collectionParam);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.collectionTitle.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.basePrice - a.basePrice);
    } else if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [allPrints, collectionParam, searchQuery, sortBy]);

  return (
    <div className='bg-[#f8f8fa] min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto'>
      {/* HEADER SECTION */}
      <div className='mb-8 pb-6 border-b border-zinc-200'>
        <div className='text-xs font-bold uppercase tracking-[0.25em] text-zinc-500 mb-1 flex items-center gap-1.5'>
          <Sparkles size={13} className='text-amber-500' />
          <span>The Complete Print Archive</span>
        </div>
        <h1 className='text-3xl sm:text-4xl font-black uppercase tracking-tight text-zinc-950'>
          {activeCollection ? activeCollection.title : 'All Art Prints & Series'}
        </h1>
        <p className='text-xs sm:text-sm text-zinc-600 max-w-2xl mt-1.5'>
          {activeCollection
            ? activeCollection.description
            : 'Explore over 120 authentic archival digital paintings by Mayowa Alabi. Select any print to configure paper, custom sizing, and solid wood frames.'}
        </p>
      </div>

      {/* FILTER CONTROLS & SEARCH */}
      <div className='flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8'>
        {/* Collection Selector Tabs */}
        <div className='flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar'>
          <button
            onClick={() => setSearchParams({})}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all whitespace-nowrap ${
              collectionParam === 'all'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}
          >
            All Prints ({allPrints.length})
          </button>

          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => setSearchParams({ collection: c.id })}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all whitespace-nowrap ${
                collectionParam === c.id
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
              }`}
            >
              {c.title} ({c.count})
            </button>
          ))}
        </div>

        {/* Search input & Sort */}
        <div className='flex items-center gap-3 shrink-0'>
          <div className='relative flex-1 sm:w-64'>
            <Search
              size={14}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400'
            />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search prints...'
              className='w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900'
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className='px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 focus:outline-none'
          >
            <option value='featured'>Featured</option>
            <option value='title'>Alphabetical</option>
            <option value='price-asc'>Price: Low to High</option>
            <option value='price-desc'>Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* PRINTS GALLERY GRID */}
      {displayedPrints.length === 0 ? (
        <div className='py-24 text-center text-zinc-500'>
          <p className='text-sm font-semibold'>No prints found</p>
          <p className='text-xs text-zinc-400 mt-1'>
            Try another search term or reset collection filter.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5'>
          {displayedPrints.map((print) => (
            <div
              key={print.id}
              onClick={() => setSelectedArtwork(print)}
              className='group cursor-pointer bg-white rounded-2xl p-3 border border-zinc-200/70 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between'
            >
              {/* Artwork preview */}
              <div className='aspect-3/4 rounded-xl overflow-hidden bg-zinc-100 relative mb-3'>
                <img
                  src={print.src}
                  alt={print.title}
                  loading='lazy'
                  className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                />
                <div className='absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2'>
                  <span className='px-3 py-1.5 bg-white/95 text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1.5'>
                    <Eye size={12} />
                    <span>Inquire / Buy</span>
                  </span>
                </div>
              </div>

              {/* Title & Info */}
              <div>
                <div className='text-[10px] font-bold uppercase tracking-widest text-zinc-400 truncate'>
                  {print.collectionTitle}
                </div>
                <h3 className='text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-amber-600 transition-colors truncate mt-0.5'>
                  {print.title}
                </h3>
                <div className='text-[10px] text-zinc-500 truncate'>
                  {print.artist}
                </div>

                <div className='mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between text-xs'>
                  <span className='font-bold text-zinc-950'>
                    From {formatPrice(print.basePrice)}
                  </span>
                  <span className='text-[10px] text-zinc-400 font-mono'>
                    Archival
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedArtwork && (
        <ArtworkDetailModal
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
          onSelectAnotherArtwork={(another) => setSelectedArtwork(another)}
        />
      )}
    </div>
  );
}
