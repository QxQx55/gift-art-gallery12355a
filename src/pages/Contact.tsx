import React, { useState } from 'react';
import { Mail, MapPin, Phone, ShieldCheck, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiryType: 'Acquisitions & Prints',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success('Your message has been dispatched to Shutabug Studio.');
  };

  return (
    <div className='bg-[#f8f8fa] min-h-screen py-16 px-4 sm:px-6 lg:px-8 text-zinc-900'>
      <div className='max-w-4xl mx-auto space-y-12'>
        <div className='border-b border-zinc-200 pb-8'>
          <span className='text-xs font-bold uppercase tracking-[0.25em] text-zinc-500 mb-2 block'>
            Studio & Collector Services
          </span>
          <h1 className='text-3xl sm:text-4xl font-black uppercase tracking-tight text-zinc-950'>
            Inquire & Connect
          </h1>
          <p className='text-xs sm:text-sm text-zinc-600 max-w-xl mt-2'>
            Whether you are curating a private collection, ordering bespoke archival prints for an interior project, or inquiring about gallery representation, our team is at your service.
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-12 gap-10'>
          {/* CONTACT INFO COLUMN */}
          <div className='md:col-span-5 space-y-6'>
            <div className='p-6 bg-white rounded-2xl border border-zinc-200/80 shadow-xs space-y-4'>
              <h3 className='text-xs font-bold uppercase tracking-widest text-zinc-900'>
                Studio Locations
              </h3>

              <div className='flex items-start gap-3 text-xs text-zinc-600'>
                <MapPin size={16} className='text-zinc-400 shrink-0 mt-0.5' />
                <div>
                  <strong className='text-zinc-900'>Main Studio:</strong>
                  <div>Victoria Island, Lagos, Nigeria</div>
                </div>
              </div>

              <div className='flex items-start gap-3 text-xs text-zinc-600'>
                <Mail size={16} className='text-zinc-400 shrink-0 mt-0.5' />
                <div>
                  <strong className='text-zinc-900'>Inquiries:</strong>
                  <div>studio@shutabug.com</div>
                </div>
              </div>

              <div className='flex items-start gap-3 text-xs text-zinc-600'>
                <ShieldCheck size={16} className='text-zinc-400 shrink-0 mt-0.5' />
                <div>
                  <strong className='text-zinc-900'>Collector Care:</strong>
                  <div>Mon - Sat, 9:00 AM - 6:00 PM WAT</div>
                </div>
              </div>
            </div>

            <div className='p-6 bg-zinc-900 text-white rounded-2xl space-y-2'>
              <h4 className='text-xs font-bold uppercase tracking-wider text-amber-400'>
                Worldwide Dispatch
              </h4>
              <p className='text-xs text-zinc-300 leading-relaxed'>
                We ship to over 140 countries via DHL Express. Unframed prints are delivered in 3-5 business days; custom framed orders ship in 7-10 business days.
              </p>
            </div>
          </div>

          {/* CONTACT FORM */}
          <div className='md:col-span-7 bg-white p-8 rounded-3xl border border-zinc-200/80 shadow-xs'>
            {submitted ? (
              <div className='py-12 text-center flex flex-col items-center space-y-4'>
                <div className='w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center'>
                  <CheckCircle2 size={32} />
                </div>
                <h3 className='text-xl font-black text-zinc-900'>
                  Message Dispatched
                </h3>
                <p className='text-xs text-zinc-500 max-w-sm'>
                  Thank you for reaching out. A studio curator will reply to <strong>{formData.email}</strong> within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className='text-xs font-bold uppercase tracking-wider text-zinc-900 underline underline-offset-4'
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5'>
                    Your Name
                  </label>
                  <input
                    type='text'
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder='Jane Doe'
                    className='w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5'>
                    Email Address
                  </label>
                  <input
                    type='email'
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder='jane@collector.art'
                    className='w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5'>
                    Inquiry Nature
                  </label>
                  <select
                    value={formData.inquiryType}
                    onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                    className='w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900'
                  >
                    <option>Print Sizing & Framing Guidance</option>
                    <option>Special Edition / Signed Works</option>
                    <option>Interior Architecture Sourcing</option>
                    <option>Gallery & Institutional Representation</option>
                    <option>Press & Media</option>
                  </select>
                </div>

                <div>
                  <label className='block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5'>
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder='Tell us how we can assist your art collection...'
                    className='w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900'
                  />
                </div>

                <button
                  type='submit'
                  className='w-full py-3.5 bg-zinc-950 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm'
                >
                  <Send size={14} />
                  <span>Send Studio Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
