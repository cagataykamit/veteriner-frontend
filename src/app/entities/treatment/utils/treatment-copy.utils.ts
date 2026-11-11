import type { TreatmentEditVm } from '@/app/entities/treatment/models/treatment-vm.model';

/**
 * Tedavi kopyasının oluşturma girdisi (RECORD-004 2. dilim; akış `record-copy.utils`): kopyalanan alanlar yalnız burada tanımlıdır.
 * Kopyalanır: hasta ve sahip (kopya yalnız aynı hasta için), başlık, açıklama.
 * Kopyalanmaz: muayene bağı (hedef hastanın açık muayenesi), tedavi ve takip tarihi, notlar.
 * Kesinleşmiş muayeneye tedavi eklenemez (ADR-013); kural oluşturma ucundadır.
 */
export interface TreatmentCopyDraft {
    sourceId: string;
    sourceTitle: string;
    clientId: string;
    petId: string;
    title: string;
    description: string;
}

/** Kaynak düzenleme modelinden okunur (ham metin; detay modelindeki boş işaretleri taşımaz). */
export function treatmentCopyDraft(source: TreatmentEditVm): TreatmentCopyDraft | null {
    const clientId = source.clientId?.trim() ?? '';
    const petId = source.petId?.trim() ?? '';

    if (!clientId || !petId) {
        return null;
    }

    return { sourceId: source.id, sourceTitle: source.title, clientId, petId, title: source.title, description: source.description };
}
