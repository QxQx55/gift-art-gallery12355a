import React, { createContext, useContext, useState, useEffect } from 'react';
import { ArtworkPrint, PAPER_OPTIONS, SIZE_OPTIONS, FRAME_OPTIONS, CURRENCIES } from '../data/artworks';

export interface CartItem {
  id: string; // unique item uuid based on timestamp & options
  artwork: ArtworkPrint;
  paper: typeof PAPER_OPTIONS[number];
  size: typeof SIZE_OPTIONS[number];
  frame: typeof FRAME_OPTIONS[number];
  isSigned: boolean;
  quantity: number;
  unitPrice: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (
    artwork: ArtworkPrint,
    paper: typeof PAPER_OPTIONS[number],
    size: typeof SIZE_OPTIONS[number],
    frame: typeof FRAME_OPTIONS[number],
    isSigned: boolean,
    quantity?: number
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  currency: typeof CURRENCIES[number];
  setCurrencyCode: (code: string) => void;
  formatPrice: (usdAmount: number) => string;
  subtotalUSD: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('shutabug_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isOpen, setIsOpen] = useState(false);
  const [currencyCode, setCurrencyCodeState] = useState<string>('USD');

  useEffect(() => {
    try {
      localStorage.setItem('shutabug_cart', JSON.stringify(items));
    } catch {}
  }, [items]);

  const currency = CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];

  const setCurrencyCode = (code: string) => {
    if (CURRENCIES.some((c) => c.code === code)) {
      setCurrencyCodeState(code);
    }
  };

  const formatPrice = (usdAmount: number) => {
    const converted = usdAmount * currency.rate;
    if (currency.code === 'NGN') {
      return `${currency.symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${currency.symbol}${converted.toFixed(2)}`;
  };

  const addItem = (
    artwork: ArtworkPrint,
    paper: typeof PAPER_OPTIONS[number],
    size: typeof SIZE_OPTIONS[number],
    frame: typeof FRAME_OPTIONS[number],
    isSigned: boolean,
    quantity = 1
  ) => {
    const unitPrice =
      artwork.basePrice +
      paper.priceModifier +
      size.priceModifier +
      frame.priceModifier +
      (isSigned ? 35 : 0);

    const existingIndex = items.findIndex(
      (item) =>
        item.artwork.id === artwork.id &&
        item.paper.id === paper.id &&
        item.size.id === size.id &&
        item.frame.id === frame.id &&
        item.isSigned === isSigned
    );

    if (existingIndex > -1) {
      setItems((prev) => {
        const copy = [...prev];
        copy[existingIndex].quantity += quantity;
        return copy;
      });
    } else {
      const newItem: CartItem = {
        id: `${artwork.id}-${paper.id}-${size.id}-${frame.id}-${isSigned ? 's' : 'u'}-${Date.now()}`,
        artwork,
        paper,
        size,
        frame,
        isSigned,
        quantity,
        unitPrice,
      };
      setItems((prev) => [newItem, ...prev]);
    }

    setIsOpen(true);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i))
    );
  };

  const clearCart = () => setItems([]);

  const subtotalUSD = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        setIsOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        currency,
        setCurrencyCode,
        formatPrice,
        subtotalUSD,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

// Automatic localStorage persistence and live currency calculations
