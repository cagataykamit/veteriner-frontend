import { HttpParams } from '@angular/common/http';
import type {
    ImagingModality,
    ImagingRecordDetailDto,
    ImagingRecordDetailVm,
    ImagingRecordsListQuery,
    ImagingRecordStatus
} from '@/app/entities/imaging/models/imaging.model';
import { mapStoredFileDtoToVm } from '@/app/shared/files/stored-file.utils';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { dateOnlyInputToIstanbulEndUtcIso, dateOnlyInputToIstanbulStartUtcIso, formatUtcIsoAsLocalDateDisplay } from '@/app/shared/utils/date.utils';

/** Sıra, seçim listelerinin sırasıdır (ADR-007 türleri). */
export const IMAGING_MODALITY_OPTIONS: Array<{ value: ImagingModality; label: string }> = [
    { value: 'XRay', label: 'Röntgen' },
    { value: 'Ultrasound', label: 'Ultrason' },
    { value: 'CT', label: 'BT' },
    { value: 'MRI', label: 'MR' },
    { value: 'Endoscopy', label: 'Endoskopi' },
    { value: 'ClinicalPhoto', label: 'Klinik fotoğraf' },
    { value: 'Other', label: 'Diğer' }
];

export const IMAGING_STATUS_FILTER_OPTIONS: Array<{ value: ImagingRecordStatus | ''; label: string }> = [
    { value: '', label: 'Etkin kayıtlar' },
    { value: 'Cancelled', label: 'İptal edilenler' }
];

export const IMAGING_ADDED_AFTER_FINALIZATION_LABEL = 'Kesinleştirmeden sonra eklendi';

export function imagingModalityLabel(modality: string | null | undefined): string {
    return IMAGING_MODALITY_OPTIONS.find((o) => o.value === modality)?.label ?? 'Görüntüleme';
}

export function imagingStatusLabel(status: ImagingRecordStatus): string {
    return status === 'Cancelled' ? 'İptal' : 'Etkin';
}

export function imagingStatusSeverity(status: ImagingRecordStatus): StatusTagSeverity {
    return status === 'Cancelled' ? 'secondary' : 'success';
}

/** Görüntü alt metni (erişilebilirlik): tür + tarih (ör. "Röntgen, 22.10.2026"). */
export function imagingAltText(modality: string, performedAtUtc: string | null): string {
    const date = performedAtUtc ? formatUtcIsoAsLocalDateDisplay(performedAtUtc) : '';

    return date && date !== '—' ? `${imagingModalityLabel(modality)}, ${date}` : imagingModalityLabel(modality);
}

export function mapImagingDetailDtoToVm(dto: ImagingRecordDetailDto): ImagingRecordDetailVm {
    return { ...dto, files: (dto.files ?? []).map(mapStoredFileDtoToVm) };
}

export function imagingQueryToHttpParams(query: ImagingRecordsListQuery): HttpParams {
    let p = new HttpParams().set('Page', String(query.page ?? 1)).set('PageSize', String(query.pageSize ?? 10));
    const optional: Array<[string, string | undefined]> = [
        ['Search', query.search?.trim()],
        ['clinicId', query.clinicId?.trim()],
        ['PetId', query.petId?.trim()],
        ['ExaminationId', query.examinationId?.trim()],
        ['Modality', query.modality],
        ['Status', query.status],
        ['dateFromUtc', query.fromDate?.trim() ? dateOnlyInputToIstanbulStartUtcIso(query.fromDate.trim()) : undefined],
        ['dateToUtc', query.toDate?.trim() ? dateOnlyInputToIstanbulEndUtcIso(query.toDate.trim()) : undefined]
    ];

    for (const [key, value] of optional) {
        if (value) {
            p = p.set(key, value);
        }
    }

    return p;
}
