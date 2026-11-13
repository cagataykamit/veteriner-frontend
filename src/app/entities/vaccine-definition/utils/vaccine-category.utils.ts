import type { VaccineCategory, VaccineDefinitionListItemVm } from '@/app/entities/vaccine-definition/models/vaccine-definition-vm.model';

/** Grup sırası: çekirdek, çekirdek dışı, antiparaziter, sınıfsız (çiftlik / klinik tanımı), önerilmeyen (WSAVA 2024). */
const GROUPS: ReadonlyArray<{ category: VaccineCategory | null; label: string }> = [
    { category: 'Core', label: 'Çekirdek aşılar' },
    { category: 'NonCore', label: 'Çekirdek dışı aşılar' },
    { category: 'ParasiteControl', label: 'Antiparaziter uygulamalar' },
    { category: null, label: 'Diğer aşılar' },
    { category: 'NotRecommended', label: 'Önerilmeyen aşılar (WSAVA)' }
];

const KNOWN: ReadonlySet<string> = new Set(['Core', 'NonCore', 'NotRecommended', 'ParasiteControl']);

export function parseVaccineCategory(raw: unknown): VaccineCategory | null {
    return typeof raw === 'string' && KNOWN.has(raw) ? (raw as VaccineCategory) : null;
}

export interface VaccineDefinitionOptionGroup {
    label: string;
    items: { label: string; value: string }[];
}

/** Aşı seçici: tanımlar klinik sınıfa göre gruplanır; boş grup gösterilmez. */
export function groupVaccineDefinitionOptions(rows: readonly VaccineDefinitionListItemVm[]): VaccineDefinitionOptionGroup[] {
    return GROUPS.map((g) => ({
        label: g.label,
        items: rows.filter((r) => r.category === g.category).map((r) => ({ label: r.name, value: r.id }))
    })).filter((g) => g.items.length > 0);
}
