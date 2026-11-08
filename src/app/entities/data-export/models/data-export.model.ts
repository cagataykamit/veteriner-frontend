import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** İş durumu (`DATA_EXPORT_API_CONTRACT.md` §3); sunucu metin döner. */
export type DataExportJobStatus = 'Queued' | 'Running' | 'Ready' | 'Failed' | 'Expired';

/** Son işler satırı (§4.1); depo anahtarı hiçbir yanıtta yoktur. */
export interface DataExportJobDto {
    readonly id: string;
    readonly status: DataExportJobStatus;
    readonly requestedAtUtc: string;
    readonly requestedByName: string | null;
    readonly startedAtUtc: string | null;
    readonly completedAtUtc: string | null;
    readonly expiresAtUtc: string | null;
    readonly fileSizeBytes: number | null;
    readonly canDownload: boolean;
}

/** Sayfa özeti: talep kuralı sunucudan gelir, istemci yeniden hesaplamaz. */
export interface DataExportOverviewDto {
    readonly items: readonly DataExportJobDto[];
    readonly retentionDays: number;
    readonly maxRequestsPerWindow: number;
    readonly windowHours: number;
    readonly remainingRequests: number;
    readonly hasOpenJob: boolean;
}

export const DATA_EXPORT_STATUS_LABELS: Record<DataExportJobStatus, { label: string; severity: StatusTagSeverity }> = {
    Queued: { label: 'Sırada', severity: 'info' },
    Running: { label: 'Hazırlanıyor', severity: 'info' },
    Ready: { label: 'Hazır', severity: 'success' },
    Failed: { label: 'Hazırlanamadı', severity: 'danger' },
    Expired: { label: 'Süresi doldu', severity: 'secondary' }
};
