/**
 * Aşı listesi — GET `/api/v1/vaccinations`.
 * HttpParams: `Page`, `PageSize`, `Search`, `Status`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order`
 * (+ isteğe bağlı `OnlyOverdue`, `onlyReceivingCare`, + ilişkili filtreler: `clinicId`, `PetId`, `ClientId`).
 * `Search`: VaccineName, Notes ve pet metin kümesi (hayvan adı, tür, ırk, müşteri metni; boşsa gönderilmez).
 */

import type { HbsEntryStatus } from '@/app/entities/hbs/models/hbs.model';

export interface VaccinationsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Aktif klinik; gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
    petId?: string;
    clientId?: string;
    status?: string;
    /** yyyy-MM-dd (İstanbul günü); Uygulandı ise uygulama, değilse vade tarihi üzerinden süzer. */
    fromDate?: string;
    /** yyyy-MM-dd (İstanbul günü, dahil) */
    toDate?: string;
    /**
     * Planlanmış ve vadesi geçmiş aşıları daraltır (dashboard derin bağlantısı).
     * Backend desteklemiyorsa yok sayılabilir; entegrasyon notlarına bakın.
     */
    onlyOverdue?: boolean;
    /** Yalnız bakımdaki (vefat etmemiş) hastaların aşıları (pano yaklaşan aşılar); verilmezse tümü. */
    onlyReceivingCare?: boolean;
    /** Backend beyaz listesi: `dueAtUtc` | `appliedAtUtc`; başka değer 400. */
    sort?: string;
    /** `asc` | `desc` */
    order?: string;
    /** HBS (ATS) durumu süzgeci (`hbsStatus`); yalnız takipteki (uygulanmış, içe aktarılmamış) aşılar eşleşir. */
    hbsStatus?: HbsEntryStatus;
}
