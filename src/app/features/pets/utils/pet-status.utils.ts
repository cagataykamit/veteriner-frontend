import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

const LABELS: Record<string, string> = {
    active: 'Aktif',
    inactive: 'Pasif',
    aktif: 'Aktif',
    pasif: 'Pasif'
};

export function petStatusLabel(status: string | null | undefined): string {
    if (status == null || status === '') {
        return EM;
    }
    const k = status.toLowerCase();
    return LABELS[k] ?? status;
}

export function petStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    if (status == null || status === '') {
        return 'secondary';
    }
    const k = status.toLowerCase();
    if (k === 'active' || k === 'aktif') {
        return 'success';
    }
    if (k === 'inactive' || k === 'pasif') {
        return 'warn';
    }
    return 'info';
}

export function petGenderLabel(gender: string | null | undefined): string {
    if (gender == null || gender === '' || gender === EM) {
        return EM;
    }
    const k = gender.toLowerCase();
    if (k === 'male' || k === 'm' || k === 'erkek' || k === '0') {
        return 'Erkek';
    }
    if (k === 'female' || k === 'f' || k === 'dişi' || k === 'disi' || k === '1') {
        return 'Dişi';
    }
    return gender;
}
