import type { PetTimelineType } from '@/app/entities/pet/models/pet-timeline-vm.model';

export interface PetTimelineTypeDefinition {
    readonly value: PetTimelineType;
    readonly label: string;
    readonly icon: string;
    /** Kaynak kaydın detay sayfası; `null` → bu tür için detay sayfası yok. */
    readonly detailPath: string | null;
}

/**
 * Hasta kaydı türleri (zaman çizelgesi ve AI kaynakları aynı listeyi kullanır). Sıra, filtre seçeneklerinin sırasıdır.
 * Visit için detay sayfası yoktur (Bugün listesi günlüktür); Administration için de yoktur (kayıt muayene/tedavi sayfasındaki bölümde görünür).
 */
export const PET_TIMELINE_TYPES: ReadonlyArray<PetTimelineTypeDefinition> = [
    { value: 'Visit', label: 'Geliş', icon: 'pi-sign-in', detailPath: null },
    { value: 'Examination', label: 'Muayene', icon: 'pi-file-edit', detailPath: '/panel/examinations' },
    { value: 'Treatment', label: 'Tedavi', icon: 'pi-wrench', detailPath: '/panel/treatments' },
    { value: 'Prescription', label: 'Reçete', icon: 'pi-file', detailPath: '/panel/prescriptions' },
    { value: 'LabResult', label: 'Laboratuvar', icon: 'pi-chart-bar', detailPath: '/panel/lab-results' },
    { value: 'Vaccination', label: 'Aşı', icon: 'pi-shield', detailPath: '/panel/vaccinations' },
    { value: 'Hospitalization', label: 'Yatış', icon: 'pi-building', detailPath: '/panel/hospitalizations' },
    { value: 'Administration', label: 'Uygulama', icon: 'pi-box', detailPath: null },
    { value: 'Imaging', label: 'Görüntüleme', icon: 'pi-image', detailPath: '/panel/imaging' },
    // Eski programdan aktarılan salt okunur kayıt (ADR-048 T1); ayrı detay sayfası yok, hasta sayfasındaki bölümde tam metni görünür.
    { value: 'ImportedClinicalRecord', label: 'Eski program kaydı', icon: 'pi-history', detailPath: null }
];

export function petTimelineTypeDefinition(type: string): PetTimelineTypeDefinition | null {
    return PET_TIMELINE_TYPES.find((d) => d.value === type) ?? null;
}
