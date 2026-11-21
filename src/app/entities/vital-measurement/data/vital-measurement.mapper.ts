import { HttpParams } from '@angular/common/http';
import type {
    VitalMeasurementCancelRequestDto,
    VitalMeasurementCreateRequestDto,
    VitalMeasurementDetailDto,
    VitalMeasurementListItemDto,
    VitalMeasurementPagedResultDto,
    VitalMeasurementUpdateRequestDto,
    VitalSeriesDto,
    VitalSeriesPointDto
} from '@/app/entities/vital-measurement/models/vital-measurement-api.model';
import type {
    CreateVitalMeasurementRequest,
    VitalCancelledQuery,
    VitalMeasurementDetailVm,
    VitalMeasurementWrite,
    VitalPointVm,
    VitalSeriesQuery,
    VitalSeriesVm,
    VitalValues
} from '@/app/entities/vital-measurement/models/vital-measurement-vm.model';
import { parseUtcApiInstantIsoString } from '@/app/shared/utils/date.utils';

/** İptal edilenler listesi tek sayfada okunur (sözleşme üst sınırı). */
const CANCELLED_PAGE_SIZE = 200;

/**
 * Sunucu UTC anını bazen `Z` olmadan döndürür; tarayıcı bunu yerel saat sanıp 3 saat kaydırır.
 * An burada bir kez çözülür: `time` grafik ekseni, `measuredAtUtc` `Z`li yazımdır (PUT'a aynen geri gider).
 */
function mapInstant(value: string): { measuredAtUtc: string; time: number } {
    const parsed = parseUtcApiInstantIsoString(value);

    return parsed ? { measuredAtUtc: parsed.toISOString(), time: parsed.getTime() } : { measuredAtUtc: value, time: Number.NaN };
}

function mapValues(dto: Partial<Record<keyof VitalValues, number | null>>): VitalValues {
    return {
        temperatureC: dto.temperatureC ?? null,
        heartRateBpm: dto.heartRateBpm ?? null,
        respiratoryRatePerMin: dto.respiratoryRatePerMin ?? null,
        weightKg: dto.weightKg ?? null
    };
}

function mapSeriesPoint(dto: VitalSeriesPointDto): VitalPointVm {
    return {
        ...mapValues(dto),
        key: `${dto.source}:${dto.sourceId}`,
        source: dto.source,
        sourceId: dto.sourceId,
        ...mapInstant(dto.measuredAtUtc),
        hospitalizationId: dto.hospitalizationId ?? null,
        examinationId: dto.examinationId ?? null,
        cancelled: false
    };
}

export function mapVitalSeriesDtoToVm(dto: VitalSeriesDto): VitalSeriesVm {
    return {
        points: (dto.points ?? []).map(mapSeriesPoint).filter((p) => !Number.isNaN(p.time)),
        truncated: dto.truncated === true,
        examinationsOmitted: (dto.omittedSources ?? []).includes('Examination')
    };
}

function mapCancelledItem(dto: VitalMeasurementListItemDto): VitalPointVm {
    return {
        ...mapValues(dto),
        key: `VitalMeasurement:${dto.id}`,
        source: 'VitalMeasurement',
        sourceId: dto.id,
        ...mapInstant(dto.measuredAtUtc),
        hospitalizationId: dto.hospitalizationId ?? null,
        examinationId: dto.examinationId ?? null,
        cancelled: true
    };
}

/** Listeden yalnız iptal edilmiş ölçümler alınır; iptal edilmemişler eğilim ucundan gelir. */
export function mapCancelledVitalPoints(result: VitalMeasurementPagedResultDto): VitalPointVm[] {
    return (result.items ?? []).filter((item) => item.isCancelled).map(mapCancelledItem);
}

export function mapVitalMeasurementDetailDtoToVm(dto: VitalMeasurementDetailDto): VitalMeasurementDetailVm {
    return {
        ...mapValues(dto),
        id: dto.id,
        measuredAtUtc: mapInstant(dto.measuredAtUtc).measuredAtUtc,
        note: dto.note?.trim() || null,
        rowVersion: dto.rowVersion,
        hospitalizationId: dto.hospitalizationId ?? null,
        examinationId: dto.examinationId ?? null,
        cancelledAtUtc: dto.cancelledAtUtc?.trim() || null,
        cancelReason: dto.cancelReason?.trim() || null,
        addedAfterFinalization: dto.addedAfterFinalization === true,
        lateEntryReason: dto.lateEntryReason?.trim() || null
    };
}

/** Klinik süzgeci verilmez: hasta kartı klinikler arasıdır, yatışta sunucu yatışın kliniğine daraltır (§6). */
export function vitalSeriesQueryToHttpParams(query: VitalSeriesQuery): HttpParams {
    let p = new HttpParams().set('petId', query.petId);

    if (query.hospitalizationId) {
        p = p.set('hospitalizationId', query.hospitalizationId);
    }

    if (query.fromUtc) {
        p = p.set('fromUtc', query.fromUtc);
    }

    return p;
}

export function vitalCancelledQueryToHttpParams(query: VitalCancelledQuery): HttpParams {
    let p = new HttpParams().set('petId', query.petId).set('includeCancelled', 'true').set('page', '1').set('pageSize', String(CANCELLED_PAGE_SIZE));

    if (query.dateFromUtc) {
        p = p.set('dateFromUtc', query.dateFromUtc);
    }

    return p;
}

export function mapCreateVitalMeasurementToApiBody(clinicId: string, req: CreateVitalMeasurementRequest): VitalMeasurementCreateRequestDto {
    return {
        clinicId,
        petId: req.petId,
        hospitalizationId: req.hospitalizationId,
        examinationId: req.examinationId,
        measuredAtUtc: req.measuredAtUtc,
        temperatureC: req.temperatureC,
        heartRateBpm: req.heartRateBpm,
        respiratoryRatePerMin: req.respiratoryRatePerMin,
        weightKg: req.weightKg,
        note: req.note?.trim() || null,
        lateEntryReason: req.lateEntryReason?.trim() || null
    };
}

export function mapUpdateVitalMeasurementToApiBody(write: VitalMeasurementWrite, rowVersion: string): VitalMeasurementUpdateRequestDto {
    return {
        measuredAtUtc: write.measuredAtUtc,
        temperatureC: write.temperatureC,
        heartRateBpm: write.heartRateBpm,
        respiratoryRatePerMin: write.respiratoryRatePerMin,
        weightKg: write.weightKg,
        note: write.note?.trim() || null,
        rowVersion
    };
}

export function mapCancelVitalMeasurementToApiBody(reason: string, rowVersion: string): VitalMeasurementCancelRequestDto {
    return { reason: reason.trim(), rowVersion };
}
