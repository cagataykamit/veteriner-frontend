import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Swagger `AppointmentStatus` (0,1,2) → p-tag severity */
export function getAppointmentTagSeverity(status: number | string | null | undefined): StatusTagSeverity {
    if (status === null || status === undefined) {
        return 'secondary';
    }
    const n = typeof status === 'number' ? status : Number(status);
    if (Number.isNaN(n)) {
        return 'secondary';
    }
    if (n === 1) {
        return 'success';
    }
    if (n === 2) {
        return 'danger';
    }
    if (n === 0) {
        return 'info';
    }
    return 'secondary';
}
