import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Palette, Award, Globe, ArrowRight } from 'lucide-react';

export default function About() {
  return (
    <div className='bg-[#f8f8fa] min-h-screen py-16 px-4 sm:px-6 lg:px-8 text-zinc-900'>
      <div className='max-w-4xl mx-auto space-y-16'>
        {/* HERO INTRO */}
        <div className='border-b border-zinc-200 pb-12'>
          <div className='text-xs font-bold uppercase tracking-[0.25em] text-amber-600 mb-2 flex items-center gap-1.5'>
            <Sparkles size={14} />
            <span>The Artist Behind Shutabug</span>
          </div>
          <h1 className='text-4xl sm:text-5xl font-black uppercase tracking-tight text-zinc-950 mb-6'>
            Mayowa Alabi
          </h1>
          <p className='text-base sm:text-lg text-zinc-600 leading-relaxed font-normal'>
            Mayowa Alabi (known in the creative world as <strong>Shutabug</strong>) is a multidisciplinary visual artist, digital painter, and creative director based in Lagos, Nigeria. His distinctive style bridges raw Lagos energy, pop culture nostalgia, and Afro-futurist aesthetics.
          </p>
        </div>

        {/* IMAGE & PROFILE GRID */}
        <div className='grid grid-cols-1 md:grid-cols-12 gap-8 items-center'>
          <div className='md:col-span-5 rounded-3xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-800'>
            <img
              src='https://cdn.tbpdev.com/st_A0uTEvsZCS9Sy2/media/md_drPyORBxTufnY2/original/beforethedayidie-1920x1389.webp'
              alt='Mayowa Alabi Painting'
              className='w-full h-full object-cover'
            />
          </div>

          <div className='md:col-span-7 space-y-4'>
            <h2 className='text-2xl font-black uppercase tracking-tight text-zinc-900'>
              The Philosophy: Making Beauty Tangible
            </h2>
            <p className='text-xs sm:text-sm text-zinc-600 leading-relaxed'>
              Shutabug's work examines how memory, sports, and media converge to shape modern African identity. In viral series like <em>The Beautiful Game</em>, football fandom is elevated into an intimate celebration of national pride, culture, and women in sport across 48 nations.
            </p>
            <p className='text-xs sm:text-sm text-zinc-600 leading-relaxed'>
              In <em>It's 2008 and You're Watching MTV</em>, vibrant brushwork revives the ecstatic visuals that captivated a generation of screen-gazers, turning fleeting pop culture memories into timeless fine art.
            </p>
          </div>
        </div>

        {/* EXHIBITIONS & RECOGNITION */}
        <div className='border-t border-zinc-200 pt-12 space-y-8'>
          <h2 className='text-2xl font-black uppercase tracking-tight text-zinc-950'>
            Selected Exhibitions & Showcases
          </h2>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-6'>
            <div className='p-6 bg-white rounded-2xl border border-zinc-200 shadow-xs space-y-2'>
              <div className='w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold'>
                <Globe size={20} />
              </div>
              <h3 className='text-sm font-bold uppercase text-zinc-900'>
                Meta #FlexNaija
              </h3>
              <p className='text-xs text-zinc-500 leading-relaxed'>
                Featured VR/AR digital gallery showcase celebrating African creators shaping the mixed-reality frontier.
              </p>
            </div>

            <div className='p-6 bg-white rounded-2xl border border-zinc-200 shadow-xs space-y-2'>
              <div className='w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold'>
                <Palette size={20} />
              </div>
              <h3 className='text-sm font-bold uppercase text-zinc-900'>
                Lagos & Nairobi Solo Shows
              </h3>
              <p className='text-xs text-zinc-500 leading-relaxed'>
                Extensive solo gallery presentations spotlighting Nigerian street culture, music history, and sports aesthetics.
              </p>
            </div>

            <div className='p-6 bg-white rounded-2xl border border-zinc-200 shadow-xs space-y-2'>
              <div className='w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold'>
                <Award size={20} />
              </div>
              <h3 className='text-sm font-bold uppercase text-zinc-900'>
                Global Collaborations
              </h3>
              <p className='text-xs text-zinc-500 leading-relaxed'>
                Book illustrations (Africana), Goethe-Institut new media panel presentations, and global brand partnerships.
              </p>
            </div>
          </div>
        </div>

        {/* CALL TO ACTION */}
        <div className='p-8 rounded-3xl bg-zinc-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl'>
          <div>
            <h3 className='text-xl font-black uppercase tracking-tight'>
              Experience the 3D Exhibition
            </h3>
            <p className='text-xs text-zinc-400 mt-1'>
              Walk through the virtual rotunda gallery and acquire original archival prints.
            </p>
          </div>
          <Link
            to='/'
            className='px-6 py-3 bg-white text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-2 shrink-0'
          >
            <span>Enter Gallery</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
