import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import type { AppointmentReasonVm } from '@/app/entities/online-booking/models/online-booking.model';
import { ONLINE_OTHER_REASON } from './appointment-reason-online.utils';

export type OnlineBookingReadinessKey = 'reasons' | 'workingHours' | 'phone';

/** `missing`: müşteri talep gönderemez (boş saat yok); `warn`: gönderebilir ama eksik görür; `ok`: hazır. */
export type OnlineBookingReadinessLevel = 'ok' | 'warn' | 'missing';

export interface OnlineBookingReadinessItem {
    readonly key: OnlineBookingReadinessKey;
    readonly level: OnlineBookingReadinessLevel;
    readonly title: string;
    readonly detail: string;
}

export interface OnlineBookingReadinessInput {
    readonly reasons: readonly AppointmentReasonVm[];
    /** `null`: yüklenemedi ya da yetki yok; madde gösterilmez. */
    readonly workingHours: readonly ClinicWorkingHourVm[] | null;
    /** `undefined`: klinik bilgisi yüklenemedi; madde gösterilmez. */
    readonly clinicPhone: string | null | undefined;
}

/** Müşteriye online gösterilen kliniğin nedenleri (aktif ve online'da görünür); sonda her zaman sistemin "Diğer"i vardır. */
export function onlineVisibleReasons(reasons: readonly AppointmentReasonVm[]): AppointmentReasonVm[] {
    return reasons.filter((r) => r.isActive && r.isOnlineBookable).sort((a, b) => a.sortOrder - b.sortOrder);
}

function hasOpenDay(hours: readonly ClinicWorkingHourVm[]): boolean {
    return hours.some((d) => !d.isClosed && !!d.opensAt && !!d.closesAt);
}

/**
 * Online randevu kurulum kontrolü (ADR-042 eki): klinik açmadan önce müşterinin ne göreceğini ve neyin eksik olduğunu görür.
 * Engel değildir; "Diğer" her zaman olduğu için neden eksikliği yalnız uyarıdır, çalışma saati yoksa müşteri saat seçemez.
 */
export function onlineBookingReadiness(input: OnlineBookingReadinessInput): OnlineBookingReadinessItem[] {
    const items: OnlineBookingReadinessItem[] = [];
    const visible = onlineVisibleReasons(input.reasons).length;

    items.push(
        visible > 0
            ? { key: 'reasons', level: 'ok', title: 'Randevu nedenleri', detail: `${visible} neden online'da görünür; sonda "${ONLINE_OTHER_REASON.name}" de var.` }
            : { key: 'reasons', level: 'warn', title: 'Randevu nedenleri', detail: `Online'da görünen neden yok; müşteri yalnız "${ONLINE_OTHER_REASON.name}" seçeneğini görür. Aşı, kontrol gibi nedenleri ekleyin.` }
    );

    if (input.workingHours !== null) {
        items.push(
            hasOpenDay(input.workingHours)
                ? { key: 'workingHours', level: 'ok', title: 'Çalışma saatleri', detail: 'Boş saatler çalışma saatlerinden hesaplanır.' }
                : { key: 'workingHours', level: 'missing', title: 'Çalışma saatleri', detail: 'Açık gün tanımlı değil; müşteri hiç boş saat göremez ve talep gönderemez.' }
        );
    }

    if (input.clinicPhone !== undefined) {
        items.push(
            input.clinicPhone?.trim()
                ? { key: 'phone', level: 'ok', title: 'Klinik telefonu', detail: 'Formun başındaki acil durum uyarısında aranabilir numara olarak görünür.' }
                : { key: 'phone', level: 'warn', title: 'Klinik telefonu', detail: 'Telefon yok; acil durum uyarısında aranacak numara görünmez.' }
        );
    }

    return items;
}

/** Açılırken söylenecek eksikler (`ok` olmayan maddeler). */
export function onlineBookingGaps(items: readonly OnlineBookingReadinessItem[]): OnlineBookingReadinessItem[] {
    return items.filter((i) => i.level !== 'ok');
}
