import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import { printWithPageStyle } from '@/app/shared/utils/print.utils';

/**
 * KVKK klinik şablon kuralları (ADR-021, ADR-024, `KVKK_CONSENT_API_CONTRACT.md` §2, §2b): açık rıza formu ve aydınlatma metni.
 * Varsayılan metinler ürün ekibinin taslaklarıdır (hukuki onay bekler); klinik Ayarlar'dan düzenler, sunucu ham metni döner,
 * yer tutucuları istemci burada doldurur.
 */

/** İki şablon aynı sözleşmeyi paylaşır, birbirinden bağımsızdır; yalnız yol, varsayılan metin ve yazdırma düzeni farklıdır. */
export type KvkkTemplateKind = 'consent' | 'disclosure';

export interface KvkkTemplateKindInfo {
    /** Ayarlar'daki seçici etiketi. */
    label: string;
    /** Yazdırma sayfası başlığı ve belgenin erişilebilir adı. */
    documentTitle: string;
    /**
     * "Kabul ediyorum / Kabul etmiyorum" kutuları ve Veri Sahibi imza bloğu basılır mı. Açık rızada şablonun parçası değil, sabit düzendir
     * (§2, K15); aydınlatma bir rıza beyanı değildir, basılmaz (§2b).
     */
    printsConsentBlock: boolean;
}

export const KVKK_TEMPLATE_KINDS: Readonly<Record<KvkkTemplateKind, KvkkTemplateKindInfo>> = {
    consent: { label: 'Açık rıza formu', documentTitle: 'KVKK açık rıza formu', printsConsentBlock: true },
    disclosure: { label: 'Aydınlatma metni', documentTitle: 'KVKK aydınlatma metni', printsConsentBlock: false }
};

/** Bilinmeyen veya boş değer açık rıza sayılır (mevcut bağlantılar sorgu parametresi taşımaz). */
export function parseKvkkTemplateKind(raw: unknown): KvkkTemplateKind {
    return raw === 'disclosure' ? 'disclosure' : 'consent';
}

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

/** Şablon hâlâ sunucunun taslak varsayılan metniyken (`isDefault`) yazdırmadan önce ve Ayarlar'da gösterilir (sözleşme §4 madde 5). */
export const KVKK_FORM_DEFAULT_TEXT_WARNING = 'Taslak metin: hukuk danışmanınızca onaylanmadan kullanmayın, köşeli parantezli alanları doldurun.';

const PLACEHOLDER_PATTERN = /\{\{(clinicName|clientName|date)\}\}/g;

/** Tam eşleşme, büyük/küçük harf duyarlı, tek geçiş (doldurulan değerdeki `{{…}}` yeniden işlenmez); tanınmayan `{{…}}` olduğu gibi kalır. */
export function fillKvkkFormTemplate(text: string, values: KvkkFormValues): string {
    return text.replace(PLACEHOLDER_PATTERN, (_match, key: keyof KvkkFormValues) => values[key]);
}

/**
 * Açık rıza metni sürümünün görünen değeri (ADR-032, sözleşme §4 madde 7): `0` taslak varsayılan metin, `null` bilinmiyor
 * (sürüm kaydından önceki rıza kayıtları). Müşteri kartı ve yazdırılan form aynı etiketi kullanır.
 */
export function kvkkTextVersionLabel(version: number | null): string {
    if (version === null) {
        return 'Bilinmiyor';
    }

    return version === 0 ? 'Varsayılan metin' : String(version);
}

/** API değeri → sürüm; negatif olmayan tam sayı değilse `null` (bilinmiyor). Şablon ve müşteri rıza kaydı aynı kuralı kullanır. */
export function parseKvkkTextVersion(raw: unknown): number | null {
    return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : null;
}

/** Form tarihi: İstanbul takvim günü, `dd.MM.yyyy`. */
export function kvkkFormDate(at: Date = new Date()): string {
    return formatDateDisplay(at);
}

/** Açık rıza formunu, aydınlatma metnini veya müşteri veri kopyasını A4 dikey yazdırır; yerleşim ve ekran öğeleri `_print.scss` `kvkk-form-print-active` kuralıyla gizlenir. */
export function printKvkkForm(doc: Document = document, win: Window = window): void {
    printWithPageStyle('kvkk-form-print-active', '@page { size: A4 portrait; margin: 18mm 16mm; @bottom-right { content: none; } }', doc, win);
}
