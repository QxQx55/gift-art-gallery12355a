import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, ShieldCheck, CreditCard, Lock, Sparkles, Download } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

interface CheckoutModalProps {
  onClose: () => void;
  finalTotalUSD: number;
}

export default function CheckoutModal({ onClose, finalTotalUSD }: CheckoutModalProps) {
  const { items, formatPrice, clearCart, setIsOpen } = useCart();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [formData, setFormData] = useState({
    name: 'Alex Johnson',
    email: 'alex@collector.art',
    address: '452 Art Avenue, Apt 4B',
    city: 'New York',
    country: 'United States',
    postalCode: '10001',
    cardNumber: '•••• •••• •••• 4242',
    expiry: '08/28',
    cvv: '982',
  });

  const [orderNumber, setOrderNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = `SHTBG-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderNumber(orderId);
    setStep('success');
    clearCart();
    toast.success('Order successfully placed! Certificate of authenticity issued.');
  };

  return (
    <div className='fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto'>
      <div className='fixed inset-0' onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className='relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 z-10 border border-zinc-200 overflow-hidden'
      >
        <button
          onClick={onClose}
          className='absolute top-5 right-5 p-2 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-black'
        >
          <X size={18} />
        </button>

        {step === 'form' ? (
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <Lock size={16} className='text-zinc-700' />
              <span className='text-[10px] uppercase tracking-widest font-bold text-zinc-500'>
                Secure Checkout • Shutabug Gallery
              </span>
            </div>
            <h2 className='text-2xl font-black text-zinc-900 tracking-tight mb-4'>
              Collector Checkout
            </h2>

            {/* Order Brief */}
            <div className='p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 mb-6 flex items-center justify-between text-xs'>
              <div>
                <span className='font-semibold text-zinc-800'>
                  {items.length} print{items.length > 1 ? 's' : ''} in order
                </span>
                <div className='text-zinc-500 text-[11px]'>
                  Archival Pigment Printing & Custom Packaging
                </div>
              </div>
              <div className='text-base font-extrabold text-zinc-900'>
                {formatPrice(finalTotalUSD)}
              </div>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4'>
              {/* Collector Details */}
              <div className='space-y-2'>
                <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700'>
                  Shipping Destination
                </label>
                <div className='grid grid-cols-2 gap-2'>
                  <input
                    type='text'
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder='Collector Full Name'
                    className='w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900'
                  />
                  <input
                    type='email'
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder='Email for Certificate'
                    className='w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900'
                  />
                </div>
                <input
                  type='text'
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder='Street Address'
                  className='w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900'
                />
                <div className='grid grid-cols-3 gap-2'>
                  <input
                    type='text'
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder='City'
                    className='w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900'
                  />
                  <input
                    type='text'
                    required
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    placeholder='Country'
                    className='w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900'
                  />
                  <input
                    type='text'
                    required
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    placeholder='Postal Code'
                    className='w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900'
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className='pt-2 space-y-2'>
                <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700'>
                  Payment Method
                </label>
                <div className='relative'>
                  <CreditCard
                    size={16}
                    className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400'
                  />
                  <input
                    type='text'
                    required
                    value={formData.cardNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, cardNumber: e.target.value })
                    }
                    placeholder='Card Number'
                    className='w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono'
                  />
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <input
                    type='text'
                    required
                    value={formData.expiry}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry: e.target.value })
                    }
                    placeholder='MM/YY'
                    className='w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono'
                  />
                  <input
                    type='text'
                    required
                    value={formData.cvv}
                    onChange={(e) =>
                      setFormData({ ...formData, cvv: e.target.value })
                    }
                    placeholder='CVV'
                    className='w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono'
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                className='w-full mt-4 py-3.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2'
              >
                <span>Authorize & Complete Order</span>
                <span className='text-amber-400'>
                  {formatPrice(finalTotalUSD)}
                </span>
              </button>
            </form>
          </div>
        ) : (
          /* SUCCESS CONFIRMATION & CERTIFICATE */
          <div className='py-6 text-center flex flex-col items-center'>
            <div className='w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4'>
              <CheckCircle2 size={36} />
            </div>

            <div className='text-xs uppercase tracking-widest font-bold text-zinc-400 mb-1'>
              Order Confirmed
            </div>
            <h2 className='text-2xl font-black text-zinc-900 mb-2'>
              Thank You, {formData.name}!
            </h2>
            <p className='text-xs text-zinc-500 max-w-sm mb-6'>
              Your order <strong>#{orderNumber}</strong> has been received by the studio.
              Our master print technicians in Lagos are preparing your archival prints.
            </p>

            {/* Certificate of Authenticity Preview Card */}
            <div className='w-full p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-left mb-6'>
              <div className='flex items-center justify-between border-b border-zinc-200/80 pb-2 mb-2'>
                <span className='text-[10px] font-black uppercase tracking-widest text-zinc-700 flex items-center gap-1.5'>
                  <Sparkles size={12} className='text-amber-500' />
                  Certificate of Authenticity
                </span>
                <span className='text-[10px] font-mono text-zinc-400'>
                  #{orderNumber}
                </span>
              </div>
              <div className='text-xs text-zinc-600 space-y-1'>
                <div><strong>Artist:</strong> Mayowa Alabi (Shutabug)</div>
                <div><strong>Destination:</strong> {formData.city}, {formData.country}</div>
                <div><strong>Provenance:</strong> Studio Verified Official Archival Edition</div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                setIsOpen(false);
              }}
              className='px-6 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-black transition-all'
            >
              Continue Exploring Exhibition
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
