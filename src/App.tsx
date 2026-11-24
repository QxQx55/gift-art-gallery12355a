import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { CartProvider } from './context/CartContext';
import { ArtworkProvider } from './context/ArtworkContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import SearchCommandPalette from './components/SearchCommandPalette';
import ArtworkDetailModal from './components/ArtworkDetailModal';
import Home from './pages/Home';
import Products from './pages/Products';
import About from './pages/About';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import { ArtworkPrint } from './data/artworks';

function AppContent() {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [modalArtwork, setModalArtwork] = useState<ArtworkPrint | null>(null);

  const handleSelectArtwork = (art: ArtworkPrint) => {
    setModalArtwork(art);
  };

  const handleSelectCollection = (colId: string) => {
    navigate(`/products?collection=${colId}`);
  };

  return (
    <div className='min-h-screen bg-[#f8f8fa] text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white'>
      <Toaster richColors position='top-center' />
      <Header onOpenSearch={() => setIsSearchOpen(true)} />

      <main className='flex-1'>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/products' element={<Products />} />
          <Route path='/about' element={<About />} />
          <Route path='/contact' element={<Contact />} />
          <Route path='/admin' element={<Admin />} />
        </Routes>
      </main>

      <Footer />

      {/* Global Shopping Bag Slideout Drawer */}
      <CartDrawer />

      {/* Global Command Palette (⌘K) */}
      <SearchCommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectArtwork={handleSelectArtwork}
        onSelectCollection={handleSelectCollection}
      />

      {/* Global Artwork Detail Modal for Search Jump */}
      {modalArtwork && (
        <ArtworkDetailModal
          artwork={modalArtwork}
          onClose={() => setModalArtwork(null)}
          onSelectAnotherArtwork={(another) => setModalArtwork(another)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ArtworkProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </ArtworkProvider>
    </Router>
  );
}
