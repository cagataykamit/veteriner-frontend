import type { PetColorListItemDto } from '@/app/features/pets/models/pet-color-api.model';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

function pickPetColorId(o: Record<string, unknown>): string | null {
    for (const k of ['id', 'Id', 'colorId', 'ColorId']) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    return null;
}

function isPetColorLike(v: unknown): boolean {
    if (!v || typeof v !== 'object') {
        return false;
    }
    return pickPetColorId(v as Record<string, unknown>) != null;
}

function normalizePetColorLike(v: unknown): PetColorListItemDto {
    const o = v as Record<string, unknown>;
    const id = pickPetColorId(o) ?? '';
    const name =
        typeof o['name'] === 'string' ? o['name'] : typeof o['Name'] === 'string' ? (o['Name'] as string) : null;
    const colorName =
        typeof o['colorName'] === 'string'
            ? o['colorName']
            : typeof o['ColorName'] === 'string'
              ? (o['ColorName'] as string)
              : null;
    return { id, name, colorName };
}

function extractPetColorListItems(raw: unknown): PetColorListItemDto[] {
    if (Array.isArray(raw)) {
        return raw.filter(isPetColorLike).map(normalizePetColorLike);
    }
    if (!raw || typeof raw !== 'object') {
        return [];
    }
    const o = raw as Record<string, unknown>;
    const candidates = [o['items'], o['data'], o['value'], o['result']];
    for (const c of candidates) {
        if (Array.isArray(c)) {
            return c.filter(isPetColorLike).map(normalizePetColorLike);
        }
        if (c && typeof c === 'object') {
            const inner = c as Record<string, unknown>;
            if (Array.isArray(inner['items'])) {
                return inner['items'].filter(isPetColorLike).map(normalizePetColorLike);
            }
        }
    }
    return [];
}

function labelForPetColor(dto: PetColorListItemDto): string {
    const t = (dto.name ?? dto.colorName ?? '').trim();
    if (t) {
        return t;
    }
    const id = dto.id?.trim();
    return id || '—';
}

/** Ref yanıtı → `p-select` seçenekleri (`value` = colorId). */
export function mapPetColorListResponseToSelectOptions(raw: unknown): SelectOption[] {
    const items = extractPetColorListItems(raw);
    return items.map((dto) => ({ value: dto.id, label: labelForPetColor(dto) }));
}
