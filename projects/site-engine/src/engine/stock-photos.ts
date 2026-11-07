import type { SiteImage } from '../model/site.model';
import { safeImage } from './site-links';

/**
 * Hazır fotoğraf setinin tek kayıt noktası (ADR-045 K7). Set kullanıcıdan gelene kadar boştur; boşken bölümler fotoğrafsız düzenini
 * çizer. Dosyalar bizim depolamamızda durur, üçüncü taraf adresinden çizilmez; yalnız hayvan görseli konur (klinik içi ya da çalışan
 * yok). Galeri ve hekim kartı bu seti kullanmaz: galeri yükleme yoksa görünmez, hekim kartında monogram çizilir.
 *
 * Yuva, paketin fotoğraf kullandığı yerdir; paketler havasına uyan kareyi burada seçer.
 */
export type StockSlot =
    | 'modern-hero'
    | 'modern-about'
    | 'modern-about-2'
    | 'premium-hero'
    | 'premium-about'
    | 'friendly-hero'
    | 'friendly-hero-2'
    | 'friendly-about'
    | 'nature-hero'
    | 'nature-hero-2'
    | 'nature-about'
    | 'nature-about-2';

export interface StockPhoto extends SiteImage {
    /** Fotoğrafın kaynağı. */
    readonly source: string;
    readonly license: string;
}

export const STOCK_PHOTOS: Readonly<Partial<Record<StockSlot, StockPhoto>>> = {};

export function stockPhoto(slot: StockSlot): SiteImage | null {
    return safeImage(STOCK_PHOTOS[slot] ?? null);
}
