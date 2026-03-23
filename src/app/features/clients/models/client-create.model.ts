/**
 * Yeni müşteri — UI / servis isteği.
 */

export interface CreateClientRequest {
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
    status?: string;
}
