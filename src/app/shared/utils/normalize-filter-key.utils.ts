/**
 * Liste filtre eşlemesi için ortak anahtar üretimi.
 * Boşluk, tire ve alt çizgiyi yok sayar; büyük/küçük harf farkını giderir.
 * Örn. `due-soon`, `due_soon`, `Due Soon` → `duesoon`
 */
export function normalizeFilterKey(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '').replace(/-/g, '').replace(/_/g, '');
}
