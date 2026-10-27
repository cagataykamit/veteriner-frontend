import type {
    ExaminationTemplateApplyResultDto,
    ExaminationTemplateDto
} from '@/app/entities/examination-template/models/examination-template.model';

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
    const textPart = !templateHasText(template) ? '' : result.updatedFields.length > 0 ? 'metin eklendi' : 'metin muayenede zaten vardı';
    const parts = [
        textPart,
        result.administrations.length > 0 ? `${result.administrations.length} ürün stoktan düştü` : '',
        result.services.length > 0 ? `${result.services.length} hizmet yazıldı` : '',
        charged > 0 ? `${charged} hizmet ücret bekliyor` : ''
    ].filter(Boolean);

    return parts.length > 0 ? `"${template.name}" uygulandı: ${parts.join(', ')}.` : `"${template.name}" uygulandı.`;
}
