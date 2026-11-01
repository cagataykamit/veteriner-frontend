import type {
    ExaminationTemplateApplyResultDto,
    ExaminationTemplateDto,
    ExaminationTemplateLineDto
} from '@/app/entities/examination-template/models/examination-template.model';
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

/** Uygulama sonucunun tek cümlelik özeti (sayfa bildirimi). */
export function templateApplySummary(template: ExaminationTemplateDto, result: ExaminationTemplateApplyResultDto): string {
    const charged = result.services.filter((s) => !!s.chargeSuggestionId).length;
    const packagePart = result.packageChargeSuggestionId ? `paket ücreti (${formatMoney(template.packagePrice ?? 0)}) ücret bekliyor, satırlar pakete dahil` : '';
    const textPart = !templateHasText(template) ? '' : result.updatedFields.length > 0 ? 'metin eklendi' : 'metin muayenede zaten vardı';
    const parts = [
        textPart,
        result.administrations.length > 0 ? `${result.administrations.length} ürün stoktan düştü` : '',
        result.services.length > 0 ? `${result.services.length} hizmet yazıldı` : '',
        charged > 0 ? `${charged} hizmet ücret bekliyor` : '',
        packagePart
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
