import type { ClientContactChannel } from '@/app/entities/client/utils/client-contact-preference.utils';
import type { ClientCreateFormFieldKey } from '@/app/entities/client/utils/client-create-validation-parse.utils';

export type { ClientCreateFormFieldKey as ClientUpsertFormFieldKey };

/** Yeni müşteri / düzenleme / hızlı modal — ortak form değeri. İletişim tercihi ve not yalnız yeni/düzenle sayfasında gösterilir; hızlı modal varsayılanı gönderir. */
export interface ClientUpsertFormValue {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    preferredContactChannel: ClientContactChannel;
    remindersOptedOut: boolean;
    /** Kliniğin iç notu; portala açılmaz. */
    notes: string;
}

export const CLIENT_UPSERT_FORM_FIELDS: readonly ClientCreateFormFieldKey[] = [
    'fullName',
    'phone',
    'email',
    'address',
    'notes'
] as const;
