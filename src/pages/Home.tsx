import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Gallery3D from '../components/Gallery3D';
import ArtworkDetailModal from '../components/ArtworkDetailModal';
import { ArtworkPrint } from '../data/artworks';
import { useCart } from '../context/CartContext';
import { useArtworks } from '../context/ArtworkContext';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  Palette,
  Eye,
  CheckCircle2
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { formatPrice } = useCart();
  const { collections } = useArtworks();
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkPrint | null>(null);

  // Featured collections
  const featuredCollections = collections.slice(0, 4);

  const handleEnterCollection = (collectionId: string) => {
    navigate(`/products?collection=${collectionId}`);
  };

  return (
    <div className='bg-[#f8f8fa] text-zinc-900'>
      {/* 3D EXHIBITION WALKWAY (EXACT MATCH TO VIDEO) */}
      <section className='relative w-full border-b border-zinc-200/80'>
        <Gallery3D
          onSelectArtwork={(art) => setSelectedArtwork(art)}
          onEnterCollection={handleEnterCollection}
        />
      </section>

      {/* CURATOR'S NOTE & BRAND IDENTITY BANNER */}
      <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <div className='flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-zinc-200 pb-8'>
          <div>
            <div className='text-xs font-bold uppercase tracking-[0.25em] text-amber-600 mb-2 flex items-center gap-1.5'>
              <Sparkles size={14} />
              <span>Studio Exhibition 2026</span>
            </div>
            <h2 className='text-3xl sm:text-4xl font-black uppercase tracking-tight text-zinc-950'>
              Black & African Culture, Reimagined
            </h2>
            <p className='text-sm text-zinc-600 max-w-2xl mt-2'>
              Original digital paintings by Lagos visual artist Mayowa Alabi (Shutabug).
              Printed on museum-grade cotton papers with hand-crafted custom frames and lifetime archival guarantee.
            </p>
          </div>

          <Link
            to='/products'
            className='px-6 py-3 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full transition-all flex items-center gap-2 group shrink-0'
          >
            <span>Browse All 125 Prints</span>
            <ArrowRight size={14} className='group-hover:translate-x-1 transition-transform' />
          </Link>
        </div>

        {/* FEATURED COLLECTIONS GRID */}
        <div className='mt-12 space-y-14'>
          {featuredCollections.map((col) => (
            <div key={col.id} className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900'>
                    {col.title}
                  </h3>
                  <p className='text-xs text-zinc-500 max-w-xl mt-1 line-clamp-2'>
                    {col.description}
                  </p>
                </div>
                <Link
                  to={`/products?collection=${col.id}`}
                  className='text-xs font-bold uppercase tracking-wider text-zinc-700 hover:text-black hover:underline underline-offset-4 hidden sm:block'
                >
                  View All ({col.count}) →
                </Link>
              </div>

              {/* Prints row */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                {col.prints.slice(0, 4).map((print) => (
                  <div
                    key={print.id}
                    onClick={() => setSelectedArtwork(print)}
                    className='group cursor-pointer bg-white rounded-2xl p-3 border border-zinc-200/70 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between'
                  >
                    <div className='aspect-3/4 rounded-xl overflow-hidden bg-zinc-100 relative mb-3'>
                      <img
                        src={print.src}
                        alt={print.title}
                        loading='lazy'
                        className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                      />
                      <div className='absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                        <span className='px-3.5 py-1.5 bg-white/95 text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1.5'>
                          <Eye size={12} />
                          <span>View Print</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className='text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-amber-600 transition-colors truncate'>
                        {print.title}
                      </h4>
                      <div className='text-[11px] text-zinc-500 truncate'>
                        {print.medium}
                      </div>
                      <div className='mt-2 flex items-center justify-between text-xs'>
                        <span className='font-bold text-zinc-950'>
                          From {formatPrice(print.basePrice)}
                        </span>
                        <span className='text-[10px] text-zinc-400 font-mono'>
                          Custom Frame
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CRAFT & ARCHIVAL STANDARDS */}
      <section className='bg-zinc-900 text-white py-20 border-t border-zinc-800'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center max-w-2xl mx-auto mb-16'>
            <div className='text-xs font-bold uppercase tracking-[0.25em] text-amber-400 mb-2'>
              Museum Standards
            </div>
            <h2 className='text-3xl sm:text-4xl font-black uppercase tracking-tight text-white'>
              Crafted For Generations of Art Collectors
            </h2>
            <p className='text-xs sm:text-sm text-zinc-400 mt-3'>
              Every print is produced in limited archival batches using genuine fine-art pigment inks, acid-free rag cotton paper, and handmade sustainable solid wood frames.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3'>
              <div className='w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center'>
                <Palette size={24} />
              </div>
              <h3 className='text-base font-bold uppercase tracking-wider text-white'>
                Hahnemühle & Giclée Papers
              </h3>
              <p className='text-xs text-zinc-400 leading-relaxed'>
                Up to 310gsm German Etching and velvety 100% cotton rag paper providing exceptional depth, vibrant pigmentation, and non-reflective clarity.
              </p>
            </div>

            <div className='p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3'>
              <div className='w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center'>
                <ShieldCheck size={24} />
              </div>
              <h3 className='text-base font-bold uppercase tracking-wider text-white'>
                Provenance & Authenticity
              </h3>
              <p className='text-xs text-zinc-400 leading-relaxed'>
                Each piece comes with an official embossed studio certificate of authenticity, signed editions verified personally by Mayowa Alabi.
              </p>
            </div>

            <div className='p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3'>
              <div className='w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center'>
                <Truck size={24} />
              </div>
              <h3 className='text-base font-bold uppercase tracking-wider text-white'>
                Custom Armored Shipping
              </h3>
              <p className='text-xs text-zinc-400 leading-relaxed'>
                Rolled prints ship in crush-proof heavy wall cylinders. Framed orders are boxed in custom padded museum crates ready to mount immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ARTWORK DETAIL MODAL */}
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
