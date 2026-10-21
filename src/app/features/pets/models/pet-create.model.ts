/**
 * Yeni hayvan kaydı — UI / servis isteği.
 * `birthDateInput` HTML `type="date"` (yyyy-MM-dd); ISO UTC mapper’da `date.utils` ile üretilir.
 * Create/edit: typed `PetUpsertFormValue` → `mapPetUpsertFormToCreateRequest` → `mapCreatePetToApiBody` (`pet.mapper.ts`, `pet-upsert-form.factory.ts`).
 */

import type { PetAlertFlag } from '@/app/shared/pet-alerts/pet-alerts.utils';

export interface CreatePetRequest {
    clientId: string;
    name: string;
    speciesId: string;
    /** Yeni contract: breed referans kimliği */
    breedId?: string;
    /** Geçici geri uyumluluk: bazı backend sürümleri text `breed` bekleyebilir. */
    breed?: string;
    gender?: string;
    /** yyyy-MM-dd — boşsa doğum tarihi gönderilmez */
    birthDateInput?: string;
    /** Ref-data PetColors kimliği — boşsa gönderilmez */
    colorId?: string;
    weight?: number | null;
    microchipNumber?: string;
    passportOrTagNumber?: string;
    specialProtocolNumber?: string;
    /** HBS hayvan kimlik no (ADR-036): verilmezse gövdeye girmez (PUT'ta değer korunur); `''` temizler. */
    hbsAnimalId?: string;
    isNeutered?: boolean;
    notes?: string;
    /** Uyarılar: form her zaman ikisini de doldurur; düzenlemede uyarı bilinmiyorsa (eski yanıt) gönderilmez. */
    alertFlags?: PetAlertFlag[];
    alertNote?: string;
}
