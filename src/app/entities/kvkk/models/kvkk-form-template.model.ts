/** `GET/PUT /clinics/{clinicId}/kvkk-form-template` yanıtı (`KVKK_CONSENT_API_CONTRACT.md` §2). */
export interface KvkkFormTemplateDto {
    clinicId?: string | null;
    text?: string | null;
    /** `true`: kayıt yok, `text` yer tutucu varsayılan metin. */
    isDefault?: boolean | null;
    rowVersion?: string | null;
    updatedAtUtc?: string | null;
    maxLength?: number | null;
    placeholders?: string[] | null;
    /** Metin sürümü (ADR-032): varsayılan `0`, kayıtlı metin `1`'den başlar, metin değiştikçe artar. */
    textVersion?: number | null;
    /** Ham metnin SHA-256 özeti (64 karakter hex). */
    textHash?: string | null;
}

/** `rowVersion`: varsayılan metinden ilk kayıtta `null`, kayıt varken GET'teki değer. */
export interface KvkkFormTemplateUpdateRequestDto {
    text: string;
    rowVersion: string | null;
}

export interface KvkkFormTemplateVm {
    clinicId: string;
    /** Ham şablon; yer tutucular yazdırırken istemcide doldurulur. */
    text: string;
    isDefault: boolean;
    rowVersion: string | null;
    updatedAtUtc: string | null;
    maxLength: number;
    placeholders: string[];
    /** Sunucu göndermezse (eski API) `null`; yazdırmada gösterilmez. */
    textVersion: number | null;
}
