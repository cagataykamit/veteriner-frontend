import type { ParamMap } from '@angular/router';
import type { PrescriptionEditVm, PrescriptionItemVm } from '@/app/entities/prescription/models/prescription-vm.model';

/** Oluşturma formuna kopya kaynağını taşıyan sorgu anahtarı (RECORD-004; ayrı kopyalama ucu yok). */
export const PRESCRIPTION_COPY_QUERY_KEY = 'copyFrom';

/**
 * Reçete kopyasının oluşturma girdisi (RECORD-004): kopyalanan alanlar yalnız burada tanımlıdır. Kopyalanır: hasta ve sahip
 * (kopya yalnız aynı hasta için), başlık, içerik, satırlar (ad, ürün, doz, birim, miktar, talimat).
 * Kopyalanmaz: muayene ve tedavi bağı (hedef hastanın açık muayenesi), parti/seri no, HBS, iptal ve geç kayıt alanları, tarihler, notlar.
 * Kopya normal oluşturma ucundan geçer; kesinleşmiş muayene kilidi (ADR-013) orada uygulanır.
 */
export interface PrescriptionCopyDraft {
    sourceId: string;
    sourceTitle: string;
    clientId: string;
    petId: string;
    title: string;
    content: string;
    items: PrescriptionItemVm[];
}

/** Kaynak düzenleme modelinden okunur (ham metin; detay modelindeki boş işaretleri taşımaz). */
export function prescriptionCopyDraft(source: PrescriptionEditVm): PrescriptionCopyDraft | null {
    const clientId = source.clientId?.trim() ?? '';
    const petId = source.petId?.trim() ?? '';

    if (!clientId || !petId) {
        return null;
    }

    return {
        sourceId: source.id,
        sourceTitle: source.title,
        clientId,
        petId,
        title: source.title,
        content: source.content,
        items: source.items.map((i) => ({ ...i, id: '', lotNumber: '' }))
    };
}

/** Adres çubuğundaki kopya kaynağı; yoksa `null`. */
export function prescriptionCopySourceId(params: ParamMap): string | null {
    return params.get(PRESCRIPTION_COPY_QUERY_KEY)?.trim() || null;
}
