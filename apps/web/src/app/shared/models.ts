export const API = '/api';
export const TOKEN_KEY = 'peana.token';
export const THEME_KEY = 'peana.theme';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'customer' | 'staff' | 'admin';
  points: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Range {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  photoUrl: string;
  products?: Product[];
}

export interface Product {
  id: string;
  rangeId: string | null;
  kind: string;
  name: string;
  slug: string;
  description: string;
  priceEur: number;
  stock: number;
  photoUrl: string;
  paintNotes?: { hex: string; label: string }[] | null;
  kitTags?: string[] | null;
  bom?: { qty: number; component: Product | null }[];
  reviews?: Review[];
  avgRating?: number;
}

export interface Review {
  id: string;
  rating: number;
  body: string;
  userId: string;
}

export interface CartItem {
  id: string;
  productId: string;
  qty: number;
  clampedQty: number;
  name: string;
  photoUrl: string;
  kind: string;
  unitPriceEur: number;
  stock: number;
  lineTotalEur: number;
  outOfStock: boolean;
}

export interface Cart {
  items: CartItem[];
  liveTotal: number;
}

export interface OrderLine {
  id: string;
  productId: string;
  nameSnapshot: string;
  unitPriceEur: number;
  qty: number;
  lineTotalEur: number;
}

export interface Order {
  id: string;
  code: string;
  status: string;
  totalEur: number;
  pointsAwarded: number;
  qrSvg: string;
  qrUrl: string;
  paidAt: string | null;
  createdAt: string;
  lines: OrderLine[];
}

export const KIND_LABEL: Record<string, string> = {
  mini: 'Miniatura',
  paint: 'Pintura',
  dice: 'Dado',
  tuft: 'Césped',
  tool: 'Herramienta',
  kit: 'Kit',
};

export const STATUS_LABEL: Record<string, string> = {
  paid: 'Pagado',
  preparing: 'Preparando',
  ready: 'Listo',
  picked_up: 'Entregado',
  cancelled: 'Cancelado',
};

export function humanizeApiError(err: unknown): { code: string; message: string } {
  const raw = (err as { error?: { code?: string; message?: string | string[] } })?.error;
  const code = raw?.code || '';
  const msg = Array.isArray(raw?.message) ? raw?.message[0] : raw?.message || '';
  const map: Record<string, string> = {
    NO_STOCK: 'Ya no quedan unidades de este SKU. Quita la línea o baja la cantidad.',
    KIT_INCOMPLETE: typeof msg === 'string' && msg ? msg : 'Este kit no se puede armar: falta un componente.',
    ALREADY_REVIEWED: 'Ya reseñaste esta peana.',
    ALREADY_PICKED_UP: 'Este pedido ya salió del mostrador.',
    TOO_LATE: 'Ya está listo o pasaron 24 h.',
    NOT_FOUND: 'No hay un pedido con ese código.',
  };
  if (code && map[code]) return { code, message: map[code] };
  if (typeof msg === 'string' && msg && !msg.includes(':')) return { code, message: msg };
  return { code, message: 'No hemos podido completar la acción. Prueba de nuevo.' };
}

export function eur(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}
