import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useArtworks } from '../context/ArtworkContext';
import { useCart } from '../context/CartContext';
import { ArtworkPrint } from '../data/artworks';
import ArtworkDetailModal from '../components/ArtworkDetailModal';
import { toast } from 'sonner';
import {
  Plus,
  Upload,
  Sparkles,
  Trash2,
  Edit3,
  Eye,
  ArrowRight,
  Image as ImageIcon,
  Layers,
  DollarSign,
  Check,
  X,
  Palette,
  Calendar,
  User,
  FileText,
  Compass
} from 'lucide-react';

const MEDIUM_PRESETS = [
  'Giclée Fine Art Pigment Print',
  'Oil on Belgian Linen Canvas',
  'Acrylic & Mixed Media on Wood',
  'Archival Digital Illustration',
  'Limited Edition Screenprint',
];

export default function Admin() {
  const {
    allPrints,
    exhibitionPrints,
    collections,
    customPrints,
    addArtwork,
    updateArtwork,
    deleteArtwork,
  } = useArtworks();
  const { formatPrice } = useCart();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewArtwork, setPreviewArtwork] = useState<ArtworkPrint | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [basePrice, setBasePrice] = useState('75');
  const [collectionMode, setCollectionMode] = useState<'existing' | 'new'>('existing');
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    collections[0]?.id || 'its-2008-and-youre-watching-mtv'
  );
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [artist, setArtist] = useState('Mayowa Alabi');
  const [artistRole, setArtistRole] = useState('Visual Artist & Illustrator, Lagos');
  const [year, setYear] = useState('2026');
  const [medium, setMedium] = useState('Giclée Fine Art Pigment Print');
  const [imageUrl, setImageUrl] = useState('');
  const [ratio, setRatio] = useState<number>(0.75);
  const [description, setDescription] = useState('');
  const [imageError, setImageError] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBasePrice('75');
    setCollectionMode('existing');
    setSelectedCollectionId(collections[0]?.id || 'its-2008-and-youre-watching-mtv');
    setNewCollectionTitle('');
    setArtist('Mayowa Alabi');
    setArtistRole('Visual Artist & Illustrator, Lagos');
    setYear('2026');
    setMedium('Giclée Fine Art Pigment Print');
    setImageUrl('');
    setRatio(0.75);
    setDescription('');
    setImageError(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageUrl(dataUrl);
      setImageError(false);

      // Auto-detect exact aspect ratio
      const img = new Image();
      img.onload = () => {
        if (img.width && img.height) {
          setRatio(Number((img.width / img.height).toFixed(4)));
        }
      };
      img.src = dataUrl;
      toast.success(`Loaded "${file.name}"`);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrlChange = (val: string) => {
    setImageUrl(val);
    setImageError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Artwork title is required');
      return;
    }

    const numericPrice = parseFloat(basePrice);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast.error('Please enter a valid price greater than 0');
      return;
    }

    if (!imageUrl.trim()) {
      toast.error('Please provide an artwork image URL or upload an image file');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter an artwork description');
      return;
    }

    let colId = selectedCollectionId;
    let colTitle =
      collections.find((c) => c.id === selectedCollectionId)?.title ||
      'Curated Exhibition';

    if (collectionMode === 'new') {
      if (!newCollectionTitle.trim()) {
        toast.error('Please enter a name for the new collection');
        return;
      }
      colTitle = newCollectionTitle.trim();
      colId = colTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (editingId) {
      updateArtwork(editingId, {
        title,
        basePrice: numericPrice,
        collectionId: colId,
        collectionTitle: colTitle,
        artist,
        artistRole,
        year,
        medium,
        src: imageUrl,
        large: imageUrl,
        ratio,
        description,
      });
      toast.success(`Updated "${title}" in the exhibition!`);
      resetForm();
    } else {
      addArtwork({
        title,
        basePrice: numericPrice,
        collectionId: colId,
        collectionTitle: colTitle,
        artist,
        artistRole,
        year,
        medium,
        src: imageUrl,
        large: imageUrl,
        ratio,
        description,
      });
      toast.success(`"${title}" added and live in the 3D Exhibition!`);
      resetForm();
    }
  };

  const handleEdit = (art: ArtworkPrint) => {
    setEditingId(art.id);
    setTitle(art.title);
    setBasePrice(String(art.basePrice));
    const colExists = collections.some((c) => c.id === art.collectionId);
    if (colExists) {
      setCollectionMode('existing');
      setSelectedCollectionId(art.collectionId);
    } else {
      setCollectionMode('new');
      setNewCollectionTitle(art.collectionTitle);
    }
    setArtist(art.artist);
    setArtistRole(art.artistRole);
    setYear(art.year);
    setMedium(art.medium);
    setImageUrl(art.src);
    setRatio(art.ratio);
    setDescription(art.description);
    setImageError(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (art: ArtworkPrint) => {
    deleteArtwork(art.id);
    if (editingId === art.id) resetForm();
    toast.success(`Removed "${art.title}" from exhibition`);
  };

  return (
    <div className='bg-[#f8f8fa] min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto'>
      {/* HEADER */}
      <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-zinc-200'>
        <div>
          <div className='text-xs font-bold uppercase tracking-[0.25em] text-zinc-500 mb-1 flex items-center gap-1.5'>
            <Sparkles size={13} className='text-amber-500' />
            <span>Gallery Curator Studio</span>
          </div>
          <h1 className='text-3xl sm:text-4xl font-black uppercase tracking-tight text-zinc-950'>
            Exhibition Admin
          </h1>
          <p className='text-sm text-zinc-600 mt-1'>
            Add, edit, and publish artworks directly into the 3D Virtual Corridor and Print Archive.
          </p>
        </div>

        <Link
          to='/'
          className='inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-950 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md hover:scale-105 active:scale-95 transition-all self-start sm:self-auto'
        >
          <Compass size={15} className='text-amber-400' />
          <span>View in 3D Exhibition</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* STATS BAR */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10'>
        <div className='bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs'>
          <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-400'>
            Total Archive Works
          </div>
          <div className='text-2xl font-black text-zinc-950 mt-1'>{allPrints.length}</div>
        </div>
        <div className='bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs'>
          <div className='text-[10px] font-bold uppercase tracking-wider text-amber-600'>
            Added via Admin
          </div>
          <div className='text-2xl font-black text-zinc-950 mt-1'>{customPrints.length}</div>
        </div>
        <div className='bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs'>
          <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-400'>
            3D Exhibition Slots
          </div>
          <div className='text-2xl font-black text-zinc-950 mt-1'>
            {exhibitionPrints.length}
          </div>
        </div>
        <div className='bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs'>
          <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-400'>
            Active Series
          </div>
          <div className='text-2xl font-black text-zinc-950 mt-1'>{collections.length}</div>
        </div>
      </div>

      {/* MAIN GRID: FORM + LIVE PREVIEW */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 mb-14'>
        {/* FORM COLUMN */}
        <form
          onSubmit={handleSubmit}
          className='lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm space-y-6'
        >
          <div className='flex items-center justify-between border-b border-zinc-100 pb-4'>
            <h2 className='text-lg font-black uppercase tracking-tight text-zinc-950 flex items-center gap-2'>
              {editingId ? <Edit3 size={18} className='text-amber-500' /> : <Plus size={18} className='text-amber-500' />}
              <span>{editingId ? 'Edit Exhibition Artwork' : 'Add New Artwork to Exhibition'}</span>
            </h2>
            {editingId && (
              <button
                type='button'
                onClick={resetForm}
                className='text-xs font-semibold text-zinc-500 hover:text-zinc-900 flex items-center gap-1'
              >
                <X size={14} /> Cancel Edit
              </button>
            )}
          </div>

          {/* TITLE & PRICE */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className='sm:col-span-2'>
              <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5'>
                Artwork Title *
              </label>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. Lagos Sunset Reflections'
                className='w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all'
                required
              />
            </div>

            <div>
              <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5'>
                Base Price (USD) *
              </label>
              <div className='relative'>
                <DollarSign size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400' />
                <input
                  type='number'
                  min='1'
                  step='1'
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className='w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all'
                  required
                />
              </div>
              <div className='flex gap-1.5 mt-1.5'>
                {[50, 85, 120, 250].map((p) => (
                  <button
                    key={p}
                    type='button'
                    onClick={() => setBasePrice(String(p))}
                    className='px-2 py-0.5 text-[10px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-md transition-colors'
                  >
                    ${p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* COLLECTION / SERIES */}
          <div>
            <div className='flex items-center justify-between mb-1.5'>
              <label className='text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5'>
                <Layers size={13} className='text-zinc-400' />
                <span>Exhibition Collection / Series *</span>
              </label>
              <div className='flex bg-zinc-100 p-0.5 rounded-lg text-[11px] font-semibold'>
                <button
                  type='button'
                  onClick={() => setCollectionMode('existing')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    collectionMode === 'existing'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Existing
                </button>
                <button
                  type='button'
                  onClick={() => setCollectionMode('new')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    collectionMode === 'new'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  + New Series
                </button>
              </div>
            </div>

            {collectionMode === 'existing' ? (
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className='w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all'
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.count} prints)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type='text'
                value={newCollectionTitle}
                onChange={(e) => setNewCollectionTitle(e.target.value)}
                placeholder='Enter new collection name (e.g. Victoria Island Nights)'
                className='w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all'
              />
            )}
          </div>

          {/* ARTIST, ROLE & YEAR */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div>
              <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center gap-1'>
                <User size={12} className='text-zinc-400' />
                <span>Artist Name</span>
              </label>
              <input
                type='text'
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className='w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all'
              />
            </div>

            <div>
              <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5'>
                Artist Role / Studio
              </label>
              <input
                type='text'
                value={artistRole}
                onChange={(e) => setArtistRole(e.target.value)}
                className='w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all'
              />
            </div>

            <div>
              <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center gap-1'>
                <Calendar size={12} className='text-zinc-400' />
                <span>Year</span>
              </label>
              <input
                type='text'
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className='w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all'
              />
            </div>
          </div>

          {/* MEDIUM & ORIENTATION */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center gap-1'>
                <Palette size={12} className='text-zinc-400' />
                <span>Medium / Stock</span>
              </label>
              <input
                type='text'
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                className='w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all'
              />
              <div className='flex flex-wrap gap-1 mt-1.5'>
                {MEDIUM_PRESETS.slice(0, 3).map((m) => (
                  <button
                    key={m}
                    type='button'
                    onClick={() => setMedium(m)}
                    className='px-2 py-0.5 text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-md transition-colors truncate max-w-[160px]'
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5'>
                Frame Aspect Ratio
              </label>
              <div className='grid grid-cols-3 gap-2'>
                {[
                  { label: 'Portrait', val: 0.72 },
                  { label: 'Square', val: 1.0 },
                  { label: 'Landscape', val: 1.38 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type='button'
                    onClick={() => setRatio(opt.val)}
                    className={`py-2.5 text-xs font-semibold rounded-xl border transition-all ${
                      Math.abs(ratio - opt.val) < 0.08
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ARTWORK IMAGE UPLOAD OR URL */}
          <div>
            <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center gap-1.5'>
              <ImageIcon size={13} className='text-zinc-400' />
              <span>Artwork Image (Upload or Paste URL) *</span>
            </label>
            <div className='flex flex-col sm:flex-row gap-2.5'>
              <input
                type='text'
                value={imageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder='https://... or upload an image file →'
                className='flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all'
              />
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                onChange={handleFileUpload}
                className='hidden'
              />
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                className='px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-200 transition-all whitespace-nowrap'
              >
                <Upload size={14} />
                <span>Upload File</span>
              </button>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5 flex items-center gap-1.5'>
              <FileText size={13} className='text-zinc-400' />
              <span>Curatorial Description & Story *</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Describe the artwork, inspiration, colors, archival printing specifications, and edition details...'
              className='w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all resize-y'
              required
            />
          </div>

          {/* SUBMIT BUTTON */}
          <div className='pt-2 flex items-center gap-3'>
            <button
              type='submit'
              className='flex-1 py-3.5 bg-zinc-950 hover:bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2'
            >
              {editingId ? <Check size={16} /> : <Plus size={16} />}
              <span>
                {editingId ? 'Save Artwork Changes' : 'Publish Artwork to 3D Exhibition'}
              </span>
            </button>
          </div>
        </form>

        {/* LIVE EXHIBITION PREVIEW COLUMN */}
        <div className='lg:col-span-5 flex flex-col gap-6'>
          <div className='bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm flex-1 flex flex-col'>
            <div className='text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center justify-between'>
              <span>Live Exhibition Wall Preview</span>
              <span className='px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold'>
                Slot #1 in 3D Tunnel
              </span>
            </div>

            {/* Simulated Gallery Wall */}
            <div className='flex-1 bg-[#f1f1f3] rounded-2xl p-6 flex flex-col items-center justify-center border border-zinc-200/70 min-h-[340px]'>
              <div className='bg-zinc-900 p-3 rounded-sm shadow-2xl max-w-[240px] w-full'>
                <div className='bg-white p-2.5'>
                  {imageUrl && !imageError ? (
                    <img
                      src={imageUrl}
                      alt={title || 'Artwork preview'}
                      onError={() => setImageError(true)}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight && !imageUrl.startsWith('data:')) {
                          setRatio(Number((img.naturalWidth / img.naturalHeight).toFixed(4)));
                        }
                      }}
                      className='w-full h-auto max-h-[260px] object-contain mx-auto'
                    />
                  ) : (
                    <div className='aspect-[3/4] bg-zinc-100 flex flex-col items-center justify-center text-zinc-400 p-4 text-center'>
                      <ImageIcon size={32} className='mb-2 opacity-50' />
                      <span className='text-[11px] font-medium'>
                        {imageError
                          ? 'Could not load image URL'
                          : 'Upload or paste image URL to preview'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Museum Plaque Preview */}
              <div className='mt-5 bg-white px-4 py-2.5 rounded-lg border border-zinc-200 shadow-xs text-center max-w-[260px] w-full'>
                <div className='text-xs font-black uppercase tracking-tight text-zinc-900 truncate'>
                  {title || 'Untitled Artwork'}
                </div>
                <div className='text-[10px] text-zinc-500 truncate mt-0.5'>
                  {artist || 'Mayowa Alabi'} • {year || '2026'}
                </div>
                <div className='text-[10px] font-bold text-amber-600 mt-1'>
                  From {formatPrice(Number(basePrice) || 50)}
                </div>
              </div>
            </div>

            <div className='mt-4 text-xs text-zinc-500 leading-relaxed'>
              Published artworks are immediately mounted on the 3D exhibition corridor wall and listed in the full print catalog with full paper, size, and framing options.
            </div>
          </div>
        </div>
      </div>

      {/* MANAGE ADDED ARTWORKS LIST */}
      <div className='bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-6 border-b border-zinc-100'>
          <div>
            <h2 className='text-lg font-black uppercase tracking-tight text-zinc-950'>
              Custom Exhibition Artworks ({customPrints.length})
            </h2>
            <p className='text-xs text-zinc-500 mt-0.5'>
              Artworks you have added via Admin appear at the front of the 3D gallery walk.
            </p>
          </div>
        </div>

        {customPrints.length === 0 ? (
          <div className='py-14 text-center'>
            <div className='w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3'>
              <ImageIcon size={22} />
            </div>
            <h3 className='text-sm font-bold text-zinc-900'>No custom artworks added yet</h3>
            <p className='text-xs text-zinc-500 mt-1 max-w-sm mx-auto'>
              Use the form above to add new artworks with title, price, description, and image. They will appear live in the 3D exhibition.
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {customPrints.map((art) => (
              <div
                key={art.id}
                className='group bg-zinc-50 rounded-2xl border border-zinc-200/80 overflow-hidden flex flex-col hover:shadow-md transition-all'
              >
                <div className='aspect-[4/3] bg-zinc-100 relative overflow-hidden p-4 flex items-center justify-center'>
                  <img
                    src={art.src}
                    alt={art.title}
                    className='max-h-full max-w-full object-contain shadow-md'
                  />
                  <span className='absolute top-3 left-3 px-2.5 py-1 rounded-full bg-zinc-950/85 text-white text-[10px] font-bold uppercase tracking-wider'>
                    In 3D Exhibition
                  </span>
                </div>

                <div className='p-4 flex-1 flex flex-col justify-between'>
                  <div>
                    <div className='text-[10px] font-bold uppercase tracking-wider text-amber-600'>
                      {art.collectionTitle}
                    </div>
                    <h3 className='text-base font-black text-zinc-950 mt-0.5 line-clamp-1'>
                      {art.title}
                    </h3>
                    <p className='text-xs text-zinc-500 mt-0.5'>
                      {art.artist} • {art.year} • {art.medium}
                    </p>
                    <p className='text-xs text-zinc-600 mt-2 line-clamp-2'>
                      {art.description}
                    </p>
                  </div>

                  <div className='mt-4 pt-3 border-t border-zinc-200/70 flex items-center justify-between'>
                    <span className='text-sm font-black text-zinc-950'>
                      {formatPrice(art.basePrice)}
                    </span>

                    <div className='flex items-center gap-1.5'>
                      <button
                        onClick={() => setPreviewArtwork(art)}
                        className='p-2 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors'
                        title='Preview Collector Modal'
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleEdit(art)}
                        className='p-2 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors'
                        title='Edit Artwork'
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(art)}
                        className='p-2 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-zinc-200 hover:border-red-200 transition-colors'
                        title='Delete Artwork'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewArtwork && (
        <ArtworkDetailModal
          artwork={previewArtwork}
          onClose={() => setPreviewArtwork(null)}
          onSelectAnotherArtwork={(another) => setPreviewArtwork(another)}
        />
      )}
    </div>
  );
}
