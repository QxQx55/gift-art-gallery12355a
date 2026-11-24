import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Tag
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import CheckoutModal from './CheckoutModal';
import { toast } from 'sonner';

export default function CartDrawer() {
  const {
    items,
    isOpen,
    setIsOpen,
    removeItem,
    updateQuantity,
    subtotalUSD,
    formatPrice,
    clearCart,
  } = useCart();

  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const freeShippingThreshold = 150;
  const progressToFreeShipping = Math.min(
    100,
    (subtotalUSD / freeShippingThreshold) * 100
  );
  const remainingForFreeShipping = Math.max(
    0,
    freeShippingThreshold - subtotalUSD
  );

  const discountAmountUSD = (subtotalUSD * discountPercent) / 100;
  const finalTotalUSD = Math.max(0, subtotalUSD - discountAmountUSD);

  const applyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'ART2026' || promoCode.trim().toUpperCase() === 'SHUTABUG') {
      setDiscountPercent(15);
      toast.success('Promo code applied! 15% VIP discount');
    } else {
      toast.error('Invalid promo code. Try "ART2026"');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className='fixed inset-0 z-50 overflow-hidden'>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className='fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity'
          />

          <div className='fixed inset-y-0 right-0 max-w-full flex pl-10'>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className='w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-zinc-200'
            >
              {/* HEADER */}
              <div className='p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70'>
                <div className='flex items-center gap-2.5'>
                  <ShoppingBag size={20} className='text-zinc-900' />
                  <h2 className='text-base font-black uppercase tracking-tight text-zinc-900'>
                    Your Bag ({items.reduce((s, i) => s + i.quantity, 0)})
                  </h2>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className='p-2 rounded-full hover:bg-zinc-200/60 text-zinc-500 hover:text-black transition-colors'
                  aria-label='Close Bag'
                >
                  <X size={18} />
                </button>
              </div>

              {/* FREE SHIPPING PROGRESS BAR */}
              <div className='px-6 py-3 bg-amber-50/60 border-b border-amber-100/80 text-xs'>
                <div className='flex items-center justify-between font-semibold text-zinc-800 mb-1.5'>
                  <span className='flex items-center gap-1.5'>
                    <Truck size={14} className='text-amber-600' />
                    {remainingForFreeShipping === 0 ? (
                      <span className='text-emerald-700 font-bold'>
                        You unlocked Free Worldwide Express Shipping!
                      </span>
                    ) : (
                      <span>
                        Add{' '}
                        <strong>{formatPrice(remainingForFreeShipping)}</strong>{' '}
                        for free worldwide shipping
                      </span>
                    )}
                  </span>
                </div>
                <div className='w-full bg-zinc-200/80 h-1.5 rounded-full overflow-hidden'>
                  <div
                    className='bg-zinc-900 h-full rounded-full transition-all duration-500'
                    style={{ width: `${progressToFreeShipping}%` }}
                  />
                </div>
              </div>

              {/* ITEM LIST */}
              <div className='flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar'>
                {items.length === 0 ? (
                  <div className='h-full flex flex-col items-center justify-center text-center text-zinc-500 py-16'>
                    <div className='w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4 text-zinc-400'>
                      <ShoppingBag size={28} />
                    </div>
                    <p className='text-sm font-semibold text-zinc-800'>
                      Your bag is empty
                    </p>
                    <p className='text-xs text-zinc-400 max-w-xs mt-1'>
                      Walk through the 3D gallery and select your favorite prints to start your collection.
                    </p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className='mt-6 px-5 py-2.5 bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-black transition-all'
                    >
                      Explore Exhibition
                    </button>
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className='flex gap-4 p-3 rounded-2xl bg-zinc-50/70 border border-zinc-200/60 transition-all hover:bg-zinc-50'
                    >
                      {/* Image Thumbnail */}
                      <div className='w-20 h-24 rounded-lg overflow-hidden bg-zinc-200 shrink-0 border border-zinc-200'>
                        <img
                          src={item.artwork.src}
                          alt={item.artwork.title}
                          className='w-full h-full object-cover'
                        />
                      </div>

                      {/* Item Details */}
                      <div className='flex-1 flex flex-col justify-between'>
                        <div>
                          <div className='flex items-start justify-between'>
                            <h3 className='text-xs font-bold text-zinc-900 truncate max-w-[170px]'>
                              {item.artwork.title}
                            </h3>
                            <button
                              onClick={() => removeItem(item.id)}
                              className='text-zinc-400 hover:text-red-600 transition-colors'
                              aria-label='Remove item'
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className='text-[10px] text-zinc-500 space-y-0.5 mt-1'>
                            <div>{item.size.name}</div>
                            <div>{item.paper.name}</div>
                            <div>{item.frame.name}</div>
                            {item.isSigned && (
                              <div className='text-amber-600 font-semibold flex items-center gap-1'>
                                <Sparkles size={10} /> Hand-signed edition
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price & Quantity Controls */}
                        <div className='flex items-center justify-between mt-2 pt-2 border-t border-zinc-200/60'>
                          <div className='flex items-center border border-zinc-200 rounded-md bg-white overflow-hidden'>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className='p-1 text-zinc-500 hover:bg-zinc-100'
                            >
                              <Minus size={12} />
                            </button>
                            <span className='px-2.5 text-[11px] font-bold font-mono text-zinc-800'>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className='p-1 text-zinc-500 hover:bg-zinc-100'
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div className='text-xs font-bold text-zinc-900'>
                            {formatPrice(item.unitPrice * item.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* FOOTER: TOTALS & CHECKOUT */}
              {items.length > 0 && (
                <div className='p-6 bg-zinc-50 border-t border-zinc-200 space-y-4'>
                  {/* Promo code form */}
                  <form onSubmit={applyPromo} className='flex gap-2'>
                    <div className='relative flex-1'>
                      <Tag
                        size={14}
                        className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400'
                      />
                      <input
                        type='text'
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder='Promo Code (Try "ART2026")'
                        className='w-full pl-9 pr-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 uppercase font-mono'
                      />
                    </div>
                    <button
                      type='submit'
                      className='px-3.5 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-semibold rounded-lg transition-colors'
                    >
                      Apply
                    </button>
                  </form>

                  {/* Pricing Breakdown */}
                  <div className='space-y-1.5 text-xs text-zinc-600'>
                    <div className='flex justify-between'>
                      <span>Subtotal</span>
                      <span className='font-semibold text-zinc-900'>
                        {formatPrice(subtotalUSD)}
                      </span>
                    </div>

                    {discountPercent > 0 && (
                      <div className='flex justify-between text-emerald-600 font-semibold'>
                        <span>Discount ({discountPercent}%)</span>
                        <span>-{formatPrice(discountAmountUSD)}</span>
                      </div>
                    )}

                    <div className='flex justify-between'>
                      <span>Shipping</span>
                      <span className='font-semibold text-zinc-900'>
                        {remainingForFreeShipping === 0 ? 'FREE' : formatPrice(15)}
                      </span>
                    </div>

                    <div className='flex justify-between text-sm font-black text-zinc-900 pt-2 border-t border-zinc-200'>
                      <span>Total</span>
                      <span>
                        {formatPrice(
                          finalTotalUSD + (remainingForFreeShipping === 0 ? 0 : 15)
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={() => setIsCheckingOut(true)}
                    className='w-full py-3.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2'
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={15} />
                  </button>

                  <div className='flex items-center justify-center gap-3 text-[11px] text-zinc-500 pt-1'>
                    <span className='flex items-center gap-1'>
                      <ShieldCheck size={13} className='text-zinc-700' />
                      Collector Guarantee
                    </span>
                    <span>•</span>
                    <span>Encrypted Checkout</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </AnimatePresence>

      {/* CHECKOUT MODAL */}
      {isCheckingOut && (
        <CheckoutModal
          onClose={() => setIsCheckingOut(false)}
          finalTotalUSD={finalTotalUSD}
        />
      )}
    </>
  );
}
