import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

const LABELS: Record<string, string> = {
    consultation: 'Konsültasyon',
    checkup: 'Genel kontrol',
    vaccination: 'Aşı',
    surgery: 'Cerrahi',
    grooming: 'Bakım / tıraş',
    emergency: 'Acil',
    followup: 'Kontrol',
    follow_up: 'Kontrol',
    dental: 'Diş',
    imaging: 'Görüntüleme',
    other: 'Diğer'
};

/**
 * Liste ve detayda tür gösterimi — bilinen anahtarlar Türkçe, aksi halde ham değer.
 * (Backend farklı string döndürebilir.)
 */
export function appointmentTypeLabel(type: string | null | undefined): string {
    if (type == null || type === '') {
        return EM;
    }
    const k = type.toLowerCase().replace(/\s+/g, '').replace(/-/g, '_');
    return LABELS[k] ?? type;
}

/** İsteğe bağlı etiket; bilinmeyen türlerde secondary. */
export function appointmentTypeSeverity(type: string | null | undefined): StatusTagSeverity {
    if (type == null || type === '') {
        return 'secondary';
    }
    const k = type.toLowerCase().replace(/\s+/g, '');
    if (k === 'emergency' || k === 'acil') {
        return 'danger';
    }
    if (k === 'surgery' || k === 'cerrahi') {
        return 'warn';
    }
    if (k === 'vaccination' || k === 'aşı') {
        return 'info';
    }
    return 'secondary';
}
