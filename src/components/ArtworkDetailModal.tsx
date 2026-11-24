import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Home,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ArtworkPrint,
  PAPER_OPTIONS,
  SIZE_OPTIONS,
  FRAME_OPTIONS,
  ART_COLLECTIONS,
} from '../data/artworks';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

interface ArtworkDetailModalProps {
  artwork: ArtworkPrint | null;
  onClose: () => void;
  onSelectAnotherArtwork?: (artwork: ArtworkPrint) => void;
}

export default function ArtworkDetailModal({
  artwork,
  onClose,
  onSelectAnotherArtwork,
}: ArtworkDetailModalProps) {
  const { addItem, formatPrice } = useCart();

  const [selectedPaper, setSelectedPaper] = useState(PAPER_OPTIONS[0]);
  const [selectedSize, setSelectedSize] = useState(SIZE_OPTIONS[0]);
  const [selectedFrame, setSelectedFrame] = useState(FRAME_OPTIONS[0]);
  const [isSigned, setIsSigned] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [viewInRoom, setViewInRoom] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>('paper');

  if (!artwork) return null;

  // Calculate dynamic unit price in USD
  const unitPriceUSD =
    artwork.basePrice +
    selectedPaper.priceModifier +
    selectedSize.priceModifier +
    selectedFrame.priceModifier +
    (isSigned ? 35 : 0);

  const totalPriceUSD = unitPriceUSD * quantity;

  // Related artworks in the same collection
  const parentCollection = ART_COLLECTIONS.find(
    (c) => c.id === artwork.collectionId
  );
  const relatedPrints = (parentCollection?.prints || []).filter(
    (p) => p.id !== artwork.id
  ).slice(0, 6);

  const handleAddToCart = () => {
    addItem(artwork, selectedPaper, selectedSize, selectedFrame, isSigned, quantity);
    toast.success(`Added "${artwork.title}" to your Bag!`, {
      description: `${selectedSize.name} • ${selectedPaper.name} • ${selectedFrame.name}`,
    });
  };

  const toggleAccordion = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  return (
    <AnimatePresence>
      <div className='fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-black/70 backdrop-blur-md'>
        {/* Backdrop click to close */}
        <div className='fixed inset-0' onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className='relative w-full max-w-6xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-y-auto z-10 flex flex-col no-scrollbar border border-zinc-200'
        >
          {/* Top Sticky Bar */}
          <div className='sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur-md border-b border-zinc-100'>
            <div className='flex items-center gap-2'>
              <span className='text-[11px] font-bold tracking-widest uppercase text-zinc-500'>
                Collection
              </span>
              <span className='text-zinc-300'>/</span>
              <span className='text-xs font-semibold uppercase tracking-wider text-zinc-900'>
                {artwork.collectionTitle}
              </span>
            </div>

            <button
              onClick={onClose}
              className='p-2 rounded-full hover:bg-zinc-100 text-zinc-600 hover:text-black transition-colors'
              aria-label='Close'
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Content Grid: Image Preview Left, Controls Right */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 md:p-10'>
            {/* LEFT COLUMN: ARTWORK DISPLAY & ROOM PREVIEW */}
            <div className='lg:col-span-7 flex flex-col items-center justify-start'>
              {/* Controls bar above preview */}
              <div className='w-full flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setViewInRoom(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${
                      !viewInRoom
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Print View</span>
                  </button>

                  <button
                    onClick={() => setViewInRoom(true)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${
                      viewInRoom
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <Home size={13} />
                    <span>View In Room</span>
                  </button>
                </div>

                <span className='text-xs text-zinc-400 font-mono'>
                  {selectedSize.dimensions}
                </span>
              </div>

              {/* Artwork Visual Stage */}
              <div className='w-full min-h-[420px] sm:min-h-[500px] flex items-center justify-center bg-[#f4f4f6] rounded-2xl p-6 relative overflow-hidden transition-all duration-500'>
                {/* ROOM MOCKUP MODE */}
                {viewInRoom ? (
                  <div className='relative w-full h-[460px] flex items-center justify-center bg-gradient-to-b from-[#e8e8ea] to-[#d8d8dc] rounded-xl overflow-hidden shadow-inner'>
                    {/* Realistic Architectural Living Room / Gallery Wall backdrop */}
                    <div className='absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-20' />

                    {/* Spotlight glow on wall */}
                    <div className='absolute top-6 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none' />

                    {/* Framed Artwork Hanging in Room */}
                    <div
                      className={`relative z-10 transition-all duration-300 max-h-[260px] shadow-2xl ${
                        selectedFrame.id === 'black'
                          ? 'border-[10px] border-zinc-900 shadow-2xl bg-zinc-900'
                          : selectedFrame.id === 'white'
                          ? 'border-[10px] border-white shadow-xl bg-white'
                          : selectedFrame.id === 'oak'
                          ? 'border-[10px] border-[#c4a480] shadow-2xl bg-[#c4a480]'
                          : selectedFrame.id === 'canvas'
                          ? 'border-[4px] border-stone-800 shadow-2xl'
                          : 'border-2 border-white/80 shadow-lg'
                      }`}
                    >
                      <img
                        src={artwork.src}
                        alt={artwork.title}
                        className='max-h-[240px] object-contain'
                      />
                    </div>

                    {/* Minimalist Modern Gallery Bench / Credenza at floor */}
                    <div className='absolute bottom-0 left-1/2 -translate-x-1/2 w-[75%] h-14 bg-gradient-to-t from-zinc-800 to-zinc-700 rounded-t-lg shadow-xl flex items-center justify-center'>
                      <div className='w-[90%] h-1 bg-amber-600/30 rounded-full' />
                    </div>

                    {/* Room Floor horizon */}
                    <div className='absolute bottom-0 left-0 right-0 h-4 bg-zinc-300 border-t border-zinc-400/40' />

                    {/* Caption badge */}
                    <div className='absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full text-zinc-700 border border-zinc-200/60'>
                      Realistic Scale Simulation
                    </div>
                  </div>
                ) : (
                  /* STANDARD STUDIO PRINT DISPLAY */
                  <div className='relative flex items-center justify-center p-4 transition-transform duration-300 hover:scale-[1.02]'>
                    {/* Shadow & Frame */}
                    <div
                      className={`relative overflow-hidden transition-all duration-300 ${
                        selectedFrame.id === 'black'
                          ? 'p-3 bg-zinc-950 shadow-2xl border-4 border-zinc-900'
                          : selectedFrame.id === 'white'
                          ? 'p-3 bg-white shadow-xl border-4 border-zinc-100'
                          : selectedFrame.id === 'oak'
                          ? 'p-3 bg-[#d4b996] shadow-2xl border-4 border-[#c8a882]'
                          : selectedFrame.id === 'canvas'
                          ? 'p-1 bg-zinc-800 shadow-2xl ring-1 ring-zinc-700'
                          : 'shadow-lg p-0 bg-transparent'
                      }`}
                    >
                      {/* Mat Board if framed */}
                      <div
                        className={`${
                          selectedFrame.id !== 'unframed' && selectedFrame.id !== 'canvas'
                            ? 'p-3 bg-[#fdfdfd] shadow-inner'
                            : ''
                        }`}
                      >
                        <img
                          src={artwork.large || artwork.src}
                          alt={artwork.title}
                          className='max-h-[480px] w-auto object-contain rounded-xs'
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Frame Quick Switcher Pills below visual */}
              <div className='w-full mt-4 flex items-center justify-between text-xs text-zinc-500'>
                <span className='font-medium'>Preview Frame:</span>
                <div className='flex items-center gap-1.5'>
                  {FRAME_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFrame(f)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        selectedFrame.id === f.id
                          ? 'bg-zinc-900 text-white font-semibold'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {f.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CONFIGURATION, PRICING & ADD TO BAG */}
            <div className='lg:col-span-5 flex flex-col justify-between'>
              <div>
                {/* Title & Artist */}
                <div className='mb-4'>
                  <div className='text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-1'>
                    {artwork.artist} • {artwork.year}
                  </div>
                  <h1 className='text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight'>
                    {artwork.title}
                  </h1>
                  <p className='text-xs text-zinc-500 mt-1 font-medium'>
                    {artwork.artistRole}
                  </p>
                </div>

                {/* Price Display */}
                <div className='flex items-baseline gap-3 pb-4 mb-6 border-b border-zinc-100'>
                  <div className='text-3xl font-extrabold text-zinc-900'>
                    {formatPrice(unitPriceUSD)}
                  </div>
                  {unitPriceUSD > artwork.basePrice && (
                    <div className='text-xs text-zinc-400 line-through'>
                      {formatPrice(artwork.basePrice)}
                    </div>
                  )}
                  <span className='text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full'>
                    Museum Archival Quality
                  </span>
                </div>

                {/* Description */}
                <p className='text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6'>
                  {artwork.description}
                </p>

                {/* 1. PAPER SELECTION */}
                <div className='mb-5'>
                  <label className='block text-xs uppercase font-bold tracking-wider text-zinc-700 mb-2'>
                    Paper Selection
                  </label>
                  <div className='grid grid-cols-1 gap-2'>
                    {PAPER_OPTIONS.map((paper) => {
                      const isSelected = selectedPaper.id === paper.id;
                      return (
                        <button
                          key={paper.id}
                          onClick={() => setSelectedPaper(paper)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                              : 'border-zinc-200 hover:border-zinc-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className='font-semibold text-zinc-900'>
                              {paper.name}
                            </div>
                            <div className='text-[11px] text-zinc-500'>
                              {paper.desc}
                            </div>
                          </div>
                          <div className='font-bold text-zinc-800 ml-2 whitespace-nowrap'>
                            {paper.priceModifier > 0
                              ? `+${formatPrice(paper.priceModifier)}`
                              : 'Included'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. PRINT SIZE */}
                <div className='mb-5'>
                  <div className='flex items-center justify-between mb-2'>
                    <label className='text-xs uppercase font-bold tracking-wider text-zinc-700'>
                      Size
                    </label>
                    <span className='text-[11px] text-zinc-400 font-mono'>
                      {selectedSize.dimensions}
                    </span>
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    {SIZE_OPTIONS.map((size) => {
                      const isSelected = selectedSize.id === size.id;
                      return (
                        <button
                          key={size.id}
                          onClick={() => setSelectedSize(size)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                            isSelected
                              ? 'border-zinc-900 bg-zinc-900 text-white'
                              : 'border-zinc-200 hover:border-zinc-300 text-zinc-800 bg-white'
                          }`}
                        >
                          <div className='font-semibold'>{size.name}</div>
                          <div
                            className={`text-[10px] ${
                              isSelected ? 'text-zinc-300' : 'text-zinc-400'
                            }`}
                          >
                            {size.priceModifier > 0
                              ? `+${formatPrice(size.priceModifier)}`
                              : 'Base Price'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. FRAMING OPTIONS */}
                <div className='mb-5'>
                  <label className='block text-xs uppercase font-bold tracking-wider text-zinc-700 mb-2'>
                    Framing
                  </label>
                  <div className='grid grid-cols-1 gap-1.5'>
                    {FRAME_OPTIONS.map((frame) => {
                      const isSelected = selectedFrame.id === frame.id;
                      return (
                        <button
                          key={frame.id}
                          onClick={() => setSelectedFrame(frame)}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-zinc-900 bg-zinc-50 font-semibold text-zinc-900 ring-1 ring-zinc-900'
                              : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-white'
                          }`}
                        >
                          <div className='flex items-center gap-2'>
                            <span
                              className='w-3.5 h-3.5 rounded-full border border-zinc-300 shrink-0'
                              style={{ backgroundColor: frame.colorHex }}
                            />
                            <span>{frame.name}</span>
                          </div>
                          <span className='font-semibold'>
                            {frame.priceModifier > 0
                              ? `+${formatPrice(frame.priceModifier)}`
                              : 'No Frame'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. SIGNED EDITION TOGGLE */}
                <div className='mb-6 p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Sparkles size={16} className='text-amber-500' />
                    <div>
                      <div className='text-xs font-semibold text-zinc-900'>
                        Artist Signature & Numbering
                      </div>
                      <div className='text-[10px] text-zinc-500'>
                        Hand-signed by Mayowa Alabi with Certificate
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSigned(!isSigned)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      isSigned
                        ? 'bg-amber-500 text-white'
                        : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {isSigned ? 'Signed (+ $35)' : '+ Add Signature'}
                  </button>
                </div>

                {/* QUANTITY & ADD TO BAG */}
                <div className='flex items-center gap-3 pt-2 mb-8'>
                  {/* Quantity selector */}
                  <div className='flex items-center border border-zinc-300 rounded-xl bg-zinc-50 overflow-hidden'>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className='p-3 text-zinc-600 hover:bg-zinc-200 transition-colors'
                      aria-label='Decrease quantity'
                    >
                      <Minus size={14} />
                    </button>
                    <span className='w-10 text-center text-xs font-bold font-mono text-zinc-900'>
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className='p-3 text-zinc-600 hover:bg-zinc-200 transition-colors'
                      aria-label='Increase quantity'
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Add to Bag Button (Exact match from video) */}
                  <button
                    onClick={handleAddToCart}
                    className='flex-1 py-3.5 px-6 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2'
                  >
                    <span>Add to Bag</span>
                    <span className='text-zinc-400'>•</span>
                    <span className='text-amber-300'>{formatPrice(totalPriceUSD)}</span>
                  </button>
                </div>
              </div>

              {/* INFORMATION ACCORDIONS (EXACT TABS FROM VIDEO) */}
              <div className='border-t border-zinc-200 pt-4 space-y-2'>
                {/* 1. Paper & Sizes */}
                <div className='border-b border-zinc-100 pb-2'>
                  <button
                    onClick={() => toggleAccordion('paper')}
                    className='w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-800 py-2 hover:text-black'
                  >
                    <span>Paper & Sizes</span>
                    {openAccordion === 'paper' ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  {openAccordion === 'paper' && (
                    <div className='text-xs text-zinc-600 space-y-1.5 py-2 pl-1 leading-relaxed'>
                      <p>
                        • <strong>Budget Art Paper</strong>: 230gsm matte archival stock.
                      </p>
                      <p>
                        • <strong>Giclée Fine Art Paper</strong>: 308gsm 100% cotton rag with velvety archival texture.
                      </p>
                      <p>
                        • <strong>Hahnemühle German Etching</strong>: 310gsm museum grade mould-made paper.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Delivery Info */}
                <div className='border-b border-zinc-100 pb-2'>
                  <button
                    onClick={() => toggleAccordion('delivery')}
                    className='w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-800 py-2 hover:text-black'
                  >
                    <span>Delivery Info</span>
                    {openAccordion === 'delivery' ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  {openAccordion === 'delivery' && (
                    <div className='text-xs text-zinc-600 space-y-1.5 py-2 pl-1 leading-relaxed'>
                      <p className='flex items-center gap-2'>
                        <Truck size={14} className='text-zinc-500' />
                        <span>Ships worldwide via DHL Express with full tracking.</span>
                      </p>
                      <p>
                        Prints are rolled in heavy-gauge protective tubes. Framed prints arrive custom crated and ready to hang.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Returns Policy */}
                <div className='border-b border-zinc-100 pb-2'>
                  <button
                    onClick={() => toggleAccordion('returns')}
                    className='w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-800 py-2 hover:text-black'
                  >
                    <span>Returns Policy</span>
                    {openAccordion === 'returns' ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  {openAccordion === 'returns' && (
                    <div className='text-xs text-zinc-600 space-y-1.5 py-2 pl-1 leading-relaxed'>
                      <p className='flex items-center gap-2'>
                        <RotateCcw size={14} className='text-zinc-500' />
                        <span>30-day collector satisfaction guarantee.</span>
                      </p>
                      <p>
                        If your artwork is damaged in transit or doesn't meet your expectations, we will replace it immediately free of charge.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. Certificate of Authenticity */}
                <div className='pb-2'>
                  <button
                    onClick={() => toggleAccordion('auth')}
                    className='w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-800 py-2 hover:text-black'
                  >
                    <span>Certificate of Authenticity</span>
                    {openAccordion === 'auth' ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  {openAccordion === 'auth' && (
                    <div className='text-xs text-zinc-600 space-y-1.5 py-2 pl-1 leading-relaxed'>
                      <p className='flex items-center gap-2'>
                        <ShieldCheck size={14} className='text-amber-500' />
                        <span>Includes official Shutabug Gallery provenance stamp and unique verification code.</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: "GET THE COLLECTION" (EXACT FROM VIDEO) */}
          {relatedPrints.length > 0 && (
            <div className='border-t border-zinc-200 bg-zinc-50/80 p-6 sm:p-8'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-xs font-black uppercase tracking-widest text-zinc-900'>
                  Get The Collection: {artwork.collectionTitle}
                </h3>
                <span className='text-xs text-zinc-500'>
                  {parentCollection?.prints?.length || 0} Total Prints
                </span>
              </div>

              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3'>
                {relatedPrints.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelectAnotherArtwork?.(p)}
                    className='group text-left bg-white rounded-xl p-2.5 border border-zinc-200/80 shadow-xs hover:shadow-md transition-all'
                  >
                    <div className='aspect-3/4 rounded-lg overflow-hidden bg-zinc-100 mb-2'>
                      <img
                        src={p.src}
                        alt={p.title}
                        className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                      />
                    </div>
                    <div className='text-[11px] font-bold text-zinc-900 truncate'>
                      {p.title}
                    </div>
                    <div className='text-[10px] text-zinc-500 font-medium'>
                      From {formatPrice(p.basePrice)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Realistic Architectural Room Mockup mode with scaled perspective
// Fine art paper, custom dimension, and wood frame selectors with live pricing
