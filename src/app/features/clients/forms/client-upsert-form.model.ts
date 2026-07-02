import type { ClientCreateFormFieldKey } from '@/app/features/clients/utils/client-create-validation-parse.utils';

export type { ClientCreateFormFieldKey as ClientUpsertFormFieldKey };

/** Yeni müşteri / düzenleme / hızlı modal — ortak form değeri. */
export interface ClientUpsertFormValue {
    fullName: string;
    phone: string;
    email: string;
    address: string;
}

export const CLIENT_UPSERT_FORM_FIELDS: readonly ClientCreateFormFieldKey[] = [
    'fullName',
    'phone',
    'email',
    'address'
] as const;
