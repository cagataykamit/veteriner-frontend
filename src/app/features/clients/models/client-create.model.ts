import type { ClientContactChannel } from '@/app/features/clients/utils/client-contact-preference.utils';

/**
 * Yeni müşteri / düzenleme — UI / servis isteği.
 */

export interface CreateClientRequest {
    fullName: string;
    phone?: string;
    email?: string;
    address?: string;
    /** Verilmezse gövdeye girmez (PUT'ta değer korunur). */
    preferredContactChannel?: ClientContactChannel;
    remindersOptedOut?: boolean;
}

/**
 * Hızlı kayıt (randevusuz gelişte yeni müşteri + hasta): tek istekte, tek işlemde. E-posta/adres bu yolda yoktur.
 */
export interface QuickRegisterRequest {
    fullName: string;
    /** Zorunlu (Türkiye cep telefonu); sunucu normalleştirir. */
    phone: string;
    petName: string;
    speciesId: string;
    microchipNumber?: string;
}

export interface QuickRegisterResult {
    clientId: string;
    petId: string;
}
