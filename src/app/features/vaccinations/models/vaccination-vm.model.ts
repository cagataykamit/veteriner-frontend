import type { AdministrationCreateResultVm } from '@/app/entities/administration/models/administration-vm.model';
import type { HbsEntryStatus, HbsEntryVm } from '@/app/features/hbs/models/hbs.model';

/**
 * Aşı listesi — UI view model.
 */

export interface VaccinationListItemVm {
    id: string;
    appliedAtUtc: string | null;
    dueAtUtc: string | null;
    vaccineName: string;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    status: number | null;
    notes: string;
    /** Stoktan düşen bağlı uygulama; `null` = yalnız aşı kaydı. */
    administrationId: string | null;
    /** HBS (ATS) durumu; takip dışı aşıda `null` (rozet yok). */
    hbsStatus: HbsEntryStatus | null;
}

/** Aşıya bağlı uygulamanın detayda gösterilen özeti. */
export interface VaccinationLinkedAdministrationVm {
    id: string;
    productName: string;
    quantity: number | null;
    unit: string;
    lotNumber: string | null;
    /** `yyyy-MM-dd`. */
    expiryDate: string | null;
}

/** Detay — liste VM’sine ek olarak audit alanları. */
export interface VaccinationDetailVm {
    id: string;
    appliedAtUtc: string | null;
    dueAtUtc: string | null;
    vaccineName: string;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    status: number | null;
    notes: string;
    examinationId: string | null;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
    linkedAdministration: VaccinationLinkedAdministrationVm | null;
    hbs: HbsEntryVm | null;
}

/** POST /vaccinations sonucu: ürünlü kayıtta uygulama ve kalan stok da döner (`stockResult`), ürünsüzde `null`. */
export interface VaccinationCreateResultVm {
    id: string;
    stockResult: AdministrationCreateResultVm | null;
}

export interface VaccinationEditVm {
    id: string;
    clinicId: string;
    examinationId: string | null;
    /** GET detay `clientId` — müşteri select `optionValue` ile eşleşir. */
    clientId: string;
    petId: string;
    /** Preload’da dropdown etiketi; liste dışı müşteriler için seçenek birleştirmede kullanılır. */
    clientName: string | null;
    /** Preload’da dropdown etiketi; liste dışı hayvanlar için seçenek birleştirmede kullanılır. */
    petName: string | null;
    /** Katalog kimliği; eski kayıtlarda null olabilir. */
    vaccineDefinitionId: string | null;
    /** Sunucu snapshot — salt görüntüleme. */
    vaccineName: string;
    appliedAtUtc: string | null;
    dueAtUtc: string | null;
    status: number | null;
    notes: string;
    /** Bağlıysa yalnız not ve sonraki doz tarihi değişebilir (`Vaccinations.LinkedToAdministration`). */
    administrationId: string | null;
}
