import type {
    ExaminationTemplateApplyResultDto,
    ExaminationTemplateDto,
    ExaminationTemplateLineDto
} from '@/app/entities/examination-template/models/examination-template.model';
import { CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS, hasAtMostDecimals } from '@/app/entities/charge/utils/charge-amount.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Şablonda muayeneye eklenecek metin var mı (şikâyet, bulgu, plan). */
export function templateHasText(t: Pick<ExaminationTemplateDto, 'visitReason' | 'findings' | 'plan'>): boolean {
    return [t.visitReason, t.findings, t.plan].some((s) => !!s?.trim());
}

/** Ürünü sonradan pasifleşen satırlar; biri bile varsa şablon uygulanamaz (sözleşme §1). */
export function templateInactiveLineNames(t: ExaminationTemplateDto): string[] {
    return t.lines.filter((l) => !l.productIsActive).map((l) => l.productName);
}

/** Liste ve seçicide kısa içerik özeti: "Metin + 2 satır". */
export function templateContentSummary(t: ExaminationTemplateDto): string {
    return [templateHasText(t) ? 'Metin' : '', t.lines.length > 0 ? `${t.lines.length} satır` : ''].filter(Boolean).join(' + ') || '—';
}

/** Uzun alanın (bulgu/plan) özet adları: yönelme hâli ("bulguya") ve yalın hâl ("bulgu"). */
const LINE_FIELDS = { findings: ['bulguya', 'bulgu'], plan: ['plana', 'plan'] } as const;

/** Uzun alan için özet parçası: şablonda metin yoksa boş, eklendiyse satır sayısı, eklenmediyse "zaten vardı". */
function linesPart(field: keyof typeof LINE_FIELDS, templateText: string | null | undefined, added: number): string {
    if (!templateText?.trim()) {
        return '';
    }

    const [to, name] = LINE_FIELDS[field];

    return added > 0 ? `${to} ${added} satır eklendi` : `${name} metni muayenede zaten vardı`;
}

/** Uygulama sonucunun bölüm bazında tek cümlelik özeti (sayfa bildirimi): neyin eklendiği, neyin atlandığı, kaç kalem doğduğu. */
export function templateApplySummary(template: ExaminationTemplateDto, result: ExaminationTemplateApplyResultDto): string {
    const visitReasonPart = result.text.visitReason === 'Filled' ? 'şikâyet dolduruldu' : result.text.visitReason === 'SkippedExisting' ? 'şikâyet dolu olduğu için şablonun şikâyeti eklenmedi' : '';
    const packagePart = result.packageChargeSuggestionId ? `paket ücreti (${formatMoney(template.packagePrice ?? 0)}) ücret bekliyor, satırlar pakete dahil` : '';
    const parts = [
        visitReasonPart,
        linesPart('findings', template.findings, result.text.findingsLinesAdded),
        linesPart('plan', template.plan, result.text.planLinesAdded),
        result.administrations.length > 0 ? `${result.administrations.length} ürün stoktan düştü` : '',
        result.services.length > 0 ? `${result.services.length} hizmet yazıldı` : '',
        packagePart || (result.pendingChargeCount > 0 ? `${result.pendingChargeCount} ücret bekleyen kalem` : '')
    ].filter(Boolean);

    return parts.length > 0 ? `"${template.name}" uygulandı: ${parts.join(', ')}.` : `"${template.name}" uygulandı.`;
}

/** Satırın bugünkü katalog tutarı (fiyat × miktar). */
export function templateLineAmount(line: ExaminationTemplateLineDto): number {
    return line.currentUnitPrice * line.quantity;
}

/**
 * Uygulama önizlemesinin toplamı (EXAM-007): paket fiyatı doluysa tahsil edilecek tutar paket fiyatıdır, satır toplamı bilgi olarak
 * gösterilir; değilse satırlar kalem kalem ücretlenir ve toplam satırların toplamıdır.
 */
export function templateChargePreview(t: ExaminationTemplateDto): { total: number; linesTotal: number; isPackage: boolean } {
    const linesTotal = t.lines.reduce((sum, l) => sum + templateLineAmount(l), 0);

    return t.packagePrice != null ? { total: t.packagePrice, linesTotal, isPackage: true } : { total: linesTotal, linesTotal, isPackage: false };
}

/** Uygulama önizlemesinde bir satırın seçimi (EXAM-013): dahil/hariç ve bu uygulamadaki miktar; şablon değişmez. */
export interface TemplateApplyLineChoice {
    included: boolean;
    /** Boş veya geçersizse uygulanamaz (`templateApplyQuantityValid`). */
    quantity: number | null;
}

/** Şablonun satırlarıyla başlayan seçim: hepsi dahil, şablondaki miktar. */
export function templateApplyInitialChoices(t: ExaminationTemplateDto): Record<string, TemplateApplyLineChoice> {
    return Object.fromEntries(t.lines.map((l) => [l.productId, { included: true, quantity: l.quantity }]));
}

/** Miktar kuralı şablon satırıyla aynı (sözleşme §12): `> 0`, üst sınır ve ondalık ölçeği. */
export function templateApplyQuantityValid(quantity: number | null): boolean {
    return quantity != null && Number.isFinite(quantity) && quantity > 0 && quantity <= CHARGE_QUANTITY_MAX && hasAtMostDecimals(quantity, CHARGE_QUANTITY_MAX_DECIMALS);
}

/** Uygulanacak satırlar şablondaki sırayla ve seçilen miktarla (önizleme toplamı ve pasif ürün denetimi bunlardan yapılır). */
export function templateIncludedLines(t: ExaminationTemplateDto, choices: Record<string, TemplateApplyLineChoice>): ExaminationTemplateLineDto[] {
    return t.lines.filter((l) => choices[l.productId]?.included ?? true).map((l) => ({ ...l, quantity: choices[l.productId]?.quantity ?? 0 }));
}

/**
 * Uygula isteğinin `lines` alanı: seçim şablonla aynıysa (hepsi dahil, miktarlar aynı) `undefined` gönderilir ve sunucu bugünkü davranışla
 * tüm satırları uygular; değilse yalnız dahil satırlar (boş liste yalnız metni uygular).
 */
export function templateApplyRequestLines(
    t: ExaminationTemplateDto,
    choices: Record<string, TemplateApplyLineChoice>
): { productId: string; quantity: number }[] | undefined {
    const included = templateIncludedLines(t, choices);
    const unchanged = included.length === t.lines.length && included.every((l, i) => l.quantity === t.lines[i].quantity);

    return unchanged ? undefined : included.map((l) => ({ productId: l.productId, quantity: l.quantity }));
}

/**
 * Gelişte seçilen şablonun tahmini ücreti (CHECKIN-004; kayıt/teklif değildir): paket fiyatı varsa o, yoksa satırların bugünkü
 * fiyat toplamı; toplam bilinmiyorsa (satırsız ya da bedelsiz) `null` ve hiçbir şey gösterilmez.
 */
export function templateEstimatedChargeText(t: ExaminationTemplateDto): string | null {
    const p = templateChargePreview(t);

    if (p.isPackage) {
        return `Tahmini ücret: ${formatMoney(p.total)} (paket fiyatı)`;
    }

    return p.total > 0 ? `Tahmini ücret: ${formatMoney(p.total)} (kalem fiyatları toplamı, tahmini)` : null;
}
