import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles, Shield, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className='bg-zinc-950 text-white border-t border-zinc-800 pt-16 pb-12'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-zinc-800/80'>
          {/* Column 1: Brand & Bio */}
          <div className='md:col-span-1 space-y-4'>
            <Link to='/' className='inline-block'>
              <span className='text-2xl font-black uppercase tracking-tighter text-white'>
                Shutabug
              </span>
              <div className='text-[10px] tracking-[0.25em] uppercase font-bold text-zinc-500'>
                Art Studio • Lagos, Nigeria
              </div>
            </Link>
            <p className='text-xs text-zinc-400 leading-relaxed'>
              Original archival art prints by multidisciplinary visual artist Mayowa Alabi. Celebrating Black & African culture, music, sports, and nostalgic screen heritage.
            </p>
            <div className='flex items-center gap-2 text-xs text-amber-400 font-semibold'>
              <Sparkles size={14} />
              <span>Ships Worldwide via DHL</span>
            </div>
          </div>

          {/* Column 2: Exhibitions & Series */}
          <div>
            <h4 className='text-xs font-bold uppercase tracking-widest text-zinc-300 mb-4'>
              Featured Series
            </h4>
            <ul className='space-y-2 text-xs text-zinc-400'>
              <li>
                <Link to='/products?collection=the-beautiful-game' className='hover:text-white transition-colors'>
                  The Beautiful Game (2026)
                </Link>
              </li>
              <li>
                <Link to='/products?collection=its-2008-and-youre-watching-mtv' className='hover:text-white transition-colors'>
                  It's 2008 & You're Watching MTV
                </Link>
              </li>
              <li>
                <Link to='/products?collection=keresimesi-christmas' className='hover:text-white transition-colors'>
                  Keresimesi (Christmas)
                </Link>
              </li>
              <li>
                <Link to='/products?collection=from-lagos-with-love' className='hover:text-white transition-colors'>
                  From Lagos, With Love
                </Link>
              </li>
              <li>
                <Link to='/products?collection=star-signs' className='hover:text-white transition-colors'>
                  Star Signs Zodiac
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Collector Services */}
          <div>
            <h4 className='text-xs font-bold uppercase tracking-widest text-zinc-300 mb-4'>
              Collector Services
            </h4>
            <ul className='space-y-2 text-xs text-zinc-400'>
              <li>
                <span className='hover:text-white transition-colors cursor-pointer'>
                  Archival Pigment Printing
                </span>
              </li>
              <li>
                <span className='hover:text-white transition-colors cursor-pointer'>
                  Custom Museum Framing
                </span>
              </li>
              <li>
                <span className='hover:text-white transition-colors cursor-pointer'>
                  Certificate of Authenticity
                </span>
              </li>
              <li>
                <span className='hover:text-white transition-colors cursor-pointer'>
                  Private Commissions
                </span>
              </li>
              <li>
                <Link to='/contact' className='hover:text-white transition-colors'>
                  Collector Support & Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Studio Dispatch Newsletter */}
          <div>
            <h4 className='text-xs font-bold uppercase tracking-widest text-zinc-300 mb-4'>
              Studio Dispatch
            </h4>
            <p className='text-xs text-zinc-400 mb-3'>
              Be the first to receive notifications on rare limited-edition drops and gallery walkthroughs.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert('Subscribed to Studio Dispatch!'); }} className='flex gap-2'>
              <input
                type='email'
                placeholder='collector@email.com'
                required
                className='w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500'
              />
              <button
                type='submit'
                className='px-3.5 py-2 bg-white text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors shrink-0'
              >
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className='pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4'>
          <div>
            © {new Date().getFullYear()} Shutabug Studio / Mayowa Alabi. All rights reserved.
          </div>
          <div className='flex items-center gap-6'>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Shipping & Collector Guarantee</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
