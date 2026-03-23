/**
 * Yeni hayvan kaydı — UI / servis isteği.
 * `birthDateInput` HTML `type="date"` (yyyy-MM-dd); ISO UTC mapper’da `date.utils` ile üretilir.
 */

export interface CreatePetRequest {
    clientId: string;
    name: string;
    species: string;
    breed?: string;
    gender?: string;
    /** yyyy-MM-dd — boşsa doğum tarihi gönderilmez */
    birthDateInput?: string;
    color?: string;
    weight?: number | null;
    status?: string;
    notes?: string;
}
