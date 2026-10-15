/**
 * Müşteri iletişim tercihi (`PET_STATUS_CLIENT_CONTACT_API_CONTRACT.md` §2, K8): yalnız bilgi; otomatik gönderim kanalını değiştirmez.
 * `None` = tercih yok. Rıza/aydınlatma kaydı değildir.
 */
export type ClientContactChannel = 'None' | 'Phone' | 'Email' | 'Sms' | 'WhatsApp';

export const CLIENT_CONTACT_CHANNEL_OPTIONS: ReadonlyArray<{ label: string; value: ClientContactChannel }> = [
    { label: 'Yok', value: 'None' },
    { label: 'Telefon', value: 'Phone' },
    { label: 'E-posta', value: 'Email' },
    { label: 'SMS', value: 'Sms' },
    { label: 'WhatsApp', value: 'WhatsApp' }
];

/** API değeri (büyük/küçük harf duyarsız) → kanal; eksik/bilinmeyen değer `None`. */
export function parseClientContactChannel(raw: unknown): ClientContactChannel {
    const key = typeof raw === 'string' ? raw.trim().toLowerCase() : '';

    return CLIENT_CONTACT_CHANNEL_OPTIONS.find((o) => o.value.toLowerCase() === key)?.value ?? 'None';
}

export function clientContactChannelLabel(channel: ClientContactChannel): string {
    return CLIENT_CONTACT_CHANNEL_OPTIONS.find((o) => o.value === channel)?.label ?? 'Yok';
}
