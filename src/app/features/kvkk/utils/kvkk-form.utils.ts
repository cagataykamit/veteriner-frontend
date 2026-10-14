import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import { printWithPageStyle } from '@/app/shared/utils/print.utils';

/**
 * KVKK açık rıza formu kuralları (ADR-021, `KVKK_CONSENT_API_CONTRACT.md` §2). Ürün hukuki metin üretmez;
 * şablon metni klinik Ayarlar'dan girer, sunucu ham metni döner, yer tutucuları istemci burada doldurur.
 */

/** Doldurulan değerler; anahtar adı yer tutucunun içidir (`{{clinicName}}` → `clinicName`). */
export interface KvkkFormValues {
    clinicName: string;
    clientName: string;
    /** `dd.MM.yyyy` */
    date: string;
}

/** Sunucu `placeholders` listesi gelmezse kullanılır (sözleşmede sabit). */
export const KVKK_FORM_PLACEHOLDERS: readonly string[] = ['{{clinicName}}', '{{clientName}}', '{{date}}'];

export const KVKK_FORM_MAX_LENGTH = 20000;

const PLACEHOLDER_HINTS: Readonly<Record<string, string>> = {
    '{{clinicName}}': 'Aktif klinik adı',
    '{{clientName}}': 'Müşterinin adı soyadı',
    '{{date}}': 'Formun yazdırıldığı gün (gg.aa.yyyy)'
};

export function kvkkFormPlaceholderHint(placeholder: string): string {
    return PLACEHOLDER_HINTS[placeholder] ?? '';
}

/** Şablon hâlâ sunucunun yer tutucu varsayılan metniyken (`isDefault`) yazdırmadan önce ve Ayarlar'da gösterilir. */
export const KVKK_FORM_DEFAULT_TEXT_WARNING = 'Şablon metni henüz hukuk danışmanınızca onaylanmış metinle değiştirilmedi.';

const PLACEHOLDER_PATTERN = /\{\{(clinicName|clientName|date)\}\}/g;

/** Tam eşleşme, büyük/küçük harf duyarlı, tek geçiş (doldurulan değerdeki `{{…}}` yeniden işlenmez); tanınmayan `{{…}}` olduğu gibi kalır. */
export function fillKvkkFormTemplate(text: string, values: KvkkFormValues): string {
    return text.replace(PLACEHOLDER_PATTERN, (_match, key: keyof KvkkFormValues) => values[key]);
}

/** Form tarihi: İstanbul takvim günü, `dd.MM.yyyy`. */
export function kvkkFormDate(at: Date = new Date()): string {
    return formatDateDisplay(at);
}

/** Formu A4 dikey yazdırır; yerleşim ve ekran öğeleri `_print.scss` `kvkk-form-print-active` kuralıyla gizlenir. */
export function printKvkkConsentForm(doc: Document = document, win: Window = window): void {
    printWithPageStyle('kvkk-form-print-active', '@page { size: A4 portrait; margin: 18mm 16mm; @bottom-right { content: none; } }', doc, win);
}
