import type { KvkkFormTemplateDto, KvkkFormTemplateUpdateRequestDto, KvkkFormTemplateVm } from '@/app/entities/kvkk/models/kvkk-form-template.model';
import { KVKK_FORM_MAX_LENGTH, KVKK_FORM_PLACEHOLDERS, parseKvkkTextVersion } from '@/app/entities/kvkk/utils/kvkk-form.utils';

function trimmedOrNull(v: string | null | undefined): string | null {
    return v?.trim() ? v.trim() : null;
}

/** Metin olduğu gibi korunur (satır sonları anlamlı); sabit alanlar gelmezse sözleşme değerleri. */
export function mapKvkkFormTemplateDtoToVm(dto: KvkkFormTemplateDto): KvkkFormTemplateVm {
    const placeholders = (dto.placeholders ?? []).filter((p) => typeof p === 'string' && p.trim());

    return {
        clinicId: dto.clinicId?.trim() ?? '',
        text: dto.text ?? '',
        isDefault: dto.isDefault === true,
        rowVersion: trimmedOrNull(dto.rowVersion),
        updatedAtUtc: trimmedOrNull(dto.updatedAtUtc),
        maxLength: typeof dto.maxLength === 'number' && dto.maxLength > 0 ? dto.maxLength : KVKK_FORM_MAX_LENGTH,
        placeholders: placeholders.length > 0 ? placeholders : [...KVKK_FORM_PLACEHOLDERS],
        textVersion: parseKvkkTextVersion(dto.textVersion)
    };
}

/** Kayıt yokken (`isDefault`) sürümsüz ilk kayıt; varken GET'teki sürüm zorunlu (sözleşme K11). */
export function kvkkFormTemplateToPutBody(text: string, current: Pick<KvkkFormTemplateVm, 'isDefault' | 'rowVersion'>): KvkkFormTemplateUpdateRequestDto {
    return { text: text.trim(), rowVersion: current.isDefault ? null : current.rowVersion };
}
