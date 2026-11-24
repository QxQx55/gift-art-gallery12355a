import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag, Search, Menu, X, ChevronDown, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CURRENCIES } from '../data/artworks';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export default function Header({ onOpenSearch }: HeaderProps) {
  const { totalItems, setIsOpen, currency, setCurrencyCode } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  const navLinks = [
    { href: '/', label: '3D Exhibition' },
    { href: '/products', label: 'All Prints' },
    { href: '/about', label: 'About Mayowa' },
    { href: '/contact', label: 'Collector Inquiries' },
    { href: '/admin', label: 'Admin' },
  ];

  return (
    <header className='sticky top-0 z-40 bg-[#f8f8fa]/90 backdrop-blur-md border-b border-zinc-200/70'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-16 sm:h-20'>
          {/* LEFT: BRAND LOGO */}
          <div className='flex items-center gap-8'>
            <Link to='/' className='flex flex-col group'>
              <span className='text-2xl sm:text-3xl font-black tracking-tighter text-zinc-950 uppercase group-hover:text-amber-600 transition-colors'>
                Shutabug
              </span>
              <span className='text-[9px] tracking-[0.3em] uppercase font-bold text-zinc-400 -mt-1'>
                Art Gallery & Prints
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className='hidden md:flex items-center space-x-6 text-xs font-semibold uppercase tracking-wider'>
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) =>
                    `transition-colors hover:text-black py-1 border-b-2 ${
                      isActive
                        ? 'border-zinc-900 text-zinc-950 font-bold'
                        : 'border-transparent text-zinc-600'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* RIGHT: SEARCH, CURRENCY & BAG (CART) */}
          <div className='flex items-center space-x-2 sm:space-x-4'>
            {/* Search / Command palette trigger */}
            <button
              onClick={onOpenSearch}
              className='hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100/90 hover:bg-zinc-200/80 text-zinc-600 text-xs font-medium border border-zinc-200/60 transition-all'
            >
              <Search size={13} className='text-zinc-500' />
              <span>Search collections</span>
              <kbd className='px-1.5 py-0.5 text-[9px] font-mono bg-white rounded border border-zinc-200 text-zinc-400'>
                ⌘K
              </kbd>
            </button>

            {/* Mobile search icon */}
            <button
              onClick={onOpenSearch}
              className='sm:hidden p-2 rounded-full hover:bg-zinc-100 text-zinc-700'
              aria-label='Search'
            >
              <Search size={18} />
            </button>

            {/* Currency Switcher */}
            <div className='relative'>
              <button
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                className='flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 text-xs font-semibold text-zinc-700 transition-colors'
              >
                <span>{currency.code}</span>
                <ChevronDown size={13} className='text-zinc-400' />
              </button>

              {isCurrencyDropdownOpen && (
                <div className='absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-zinc-200 py-1.5 z-50 animate-fade-in'>
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrencyCode(c.code);
                        setIsCurrencyDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-zinc-50 ${
                        currency.code === c.code
                          ? 'font-bold text-zinc-950 bg-zinc-50'
                          : 'text-zinc-600'
                      }`}
                    >
                      <span>{c.label}</span>
                      <span className='font-mono text-zinc-400'>{c.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bag (Cart) Trigger Button */}
            <button
              onClick={() => setIsOpen(true)}
              className='flex items-center gap-2 px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95'
            >
              <ShoppingBag size={14} />
              <span>Bag ({totalItems})</span>
            </button>

            {/* Mobile Hamburger Menu */}
            <div className='md:hidden'>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className='p-2 text-zinc-700 hover:text-black'
                aria-label='Toggle menu'
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU */}
      {isMobileMenuOpen && (
        <div className='md:hidden bg-white border-t border-zinc-200 px-4 py-4 space-y-3 animate-fade-in'>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className='block py-2 text-sm font-semibold uppercase tracking-wider text-zinc-800 hover:text-amber-600'
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
