import type { PetSearchFilterDto } from '@/app/entities/ai/models/ai-api.model';
import type { PetSearchChipVm } from '@/app/entities/ai/models/ai-vm.model';

/**
 * "Şöyle anladım" çipleri ve çip kaldırma (AI-006) tek yerde. Filtre sunucu şemasıyla aynı kalır; çip kaldırmak yeni bir AI isteği
 * değildir, yalnız AI'siz arama ucu yeniden çağrılır (kota harcanmaz).
 */

const SEX_LABELS: Readonly<Record<string, string>> = { Male: 'Erkek', Female: 'Dişi' };
const STATUS_LABELS: Readonly<Record<string, string>> = { Active: 'Yaşayanlar', Deceased: 'Vefat edenler' };
const VACCINE_STATE_LABELS: Readonly<Record<string, string>> = { Applied: 'yapılmış', Scheduled: 'planlı', Overdue: 'gecikmiş' };

const DATE_LABEL = new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });

/** `YYYY-MM-DD` → "19 Ağu 2026"; biçim tanınmazsa olduğu gibi. */
export function petSearchDateLabel(day: string): string {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T00:00:00Z`) : null;

    return d && !Number.isNaN(d.getTime()) ? DATE_LABEL.format(d) : day;
}

function periodLabel(from: string | null | undefined, to: string | null | undefined): string | null {
    if (from && to) {
        return from === to ? petSearchDateLabel(from) : `${petSearchDateLabel(from)} – ${petSearchDateLabel(to)}`;
    }

    if (from) {
        return `${petSearchDateLabel(from)} ve sonrası`;
    }

    return to ? `${petSearchDateLabel(to)} ve öncesi` : null;
}

function ageLabel(min: number | null | undefined, max: number | null | undefined): string | null {
    const hasMin = typeof min === 'number';
    const hasMax = typeof max === 'number';

    if (hasMin && hasMax) {
        return min === max ? `${min} yaş` : `${min}–${max} yaş`;
    }

    if (hasMin) {
        return `En az ${min} yaş`;
    }

    return hasMax ? `En çok ${max} yaş` : null;
}

/** Filtre → çipler, okunuş sırasıyla (hayvan, dönem, şikâyet, aşı, ilaç). Tür adı bilinmezse kodu yazılır. */
export function petSearchFilterChips(filter: PetSearchFilterDto | null, speciesNameByCode: ReadonlyMap<string, string>): PetSearchChipVm[] {
    if (!filter) {
        return [];
    }

    const chips: PetSearchChipVm[] = [];

    for (const code of filter.species ?? []) {
        chips.push({ id: `species:${code}`, label: speciesNameByCode.get(code) ?? code, icon: 'pi-tag' });
    }

    if (filter.sex && SEX_LABELS[filter.sex]) {
        chips.push({ id: 'sex', label: SEX_LABELS[filter.sex], icon: 'pi-tag' });
    }

    if (typeof filter.neutered === 'boolean') {
        chips.push({ id: 'neutered', label: filter.neutered ? 'Kısırlaştırılmış' : 'Kısırlaştırılmamış', icon: 'pi-tag' });
    }

    const age = ageLabel(filter.ageMinYears, filter.ageMaxYears);

    if (age) {
        chips.push({ id: 'age', label: age, icon: 'pi-tag' });
    }

    if (filter.status && STATUS_LABELS[filter.status]) {
        chips.push({ id: 'status', label: STATUS_LABELS[filter.status], icon: 'pi-tag' });
    }

    const period = periodLabel(filter.from, filter.to);

    if (period) {
        chips.push({ id: 'period', label: period, icon: 'pi-calendar' });
    }

    for (const term of filter.clinicalTerms ?? []) {
        chips.push({ id: `clinical:${term}`, label: `Şikâyet/tanı: ${term}`, icon: 'pi-file-edit' });
    }

    for (const term of filter.vaccineTerms ?? []) {
        chips.push({ id: `vaccine:${term}`, label: `Aşı: ${term}`, icon: 'pi-shield' });
    }

    const state = filter.vaccineState ? VACCINE_STATE_LABELS[filter.vaccineState] : null;

    if (state) {
        chips.push({ id: 'vaccineState', label: `Aşı durumu: ${state}`, icon: 'pi-shield' });
    } else if (filter.vaccineState === 'Any' && !filter.vaccineTerms?.length) {
        chips.push({ id: 'vaccineState', label: 'Aşı kaydı olan', icon: 'pi-shield' });
    }

    for (const term of filter.medicationTerms ?? []) {
        chips.push({ id: `medication:${term}`, label: `İlaç: ${term}`, icon: 'pi-box' });
    }

    return chips;
}

/** Çipi filtreden çıkarır (yeni nesne). Son aşı terimi kalkınca "herhangi" durumu da kalkar (tek başına anlamı "aşı kaydı olan"). */
export function removePetSearchChip(filter: PetSearchFilterDto, chipId: string): PetSearchFilterDto {
    const [kind, ...rest] = chipId.split(':');
    const value = rest.join(':');

    const without = (list: string[] | null | undefined): string[] | null => {
        const next = (list ?? []).filter((x) => x !== value);

        return next.length ? next : null;
    };

    switch (kind) {
        case 'species':
            return { ...filter, species: without(filter.species) };
        case 'sex':
            return { ...filter, sex: null };
        case 'neutered':
            return { ...filter, neutered: null };
        case 'age':
            return { ...filter, ageMinYears: null, ageMaxYears: null };
        case 'status':
            return { ...filter, status: null };
        case 'period':
            return { ...filter, from: null, to: null };
        case 'clinical':
            return { ...filter, clinicalTerms: without(filter.clinicalTerms) };

        case 'vaccine': {
            const vaccineTerms = without(filter.vaccineTerms);

            return { ...filter, vaccineTerms, vaccineState: !vaccineTerms && filter.vaccineState === 'Any' ? null : filter.vaccineState };
        }

        case 'vaccineState':
            return { ...filter, vaccineState: null };
        case 'medication':
            return { ...filter, medicationTerms: without(filter.medicationTerms) };
        default:
            return filter;
    }
}

/** Hiç ölçüt kalmadı mı (sunucu boş filtreyi aramaz). */
export function isPetSearchFilterEmpty(filter: PetSearchFilterDto | null): boolean {
    return petSearchFilterChips(filter, new Map()).length === 0;
}
