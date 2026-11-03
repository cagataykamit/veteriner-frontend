import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { AppointmentReasonVm } from '@/app/entities/online-booking/models/online-booking.model';
import { ONLINE_OTHER_REASON } from '@/app/entities/online-booking/utils/appointment-reason-online.utils';
import { onlineVisibleReasons } from '@/app/entities/online-booking/utils/online-booking-readiness.utils';

/**
 * Müşterinin göreceği talep formunun ilk adımı (ADR-042 eki), panelde salt okunur önizleme: acil durum uyarısı ve telefon,
 * online görünen nedenler, sonda "Diğer / emin değilim", altında not. Portal `portal-booking-reason-step` ile aynı sırayı izler.
 */
@Component({
    selector: 'app-online-booking-preview',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4 flex flex-col gap-3 max-w-md" aria-label="Müşterinin göreceği talep formu (önizleme)" data-testid="online-preview">
            <div class="rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-sm px-3 py-2">
                <strong>Acil durum mu?</strong> Online talep kliniğin onayını bekler.
                @if (clinicPhone()?.trim()) {
                    Acil durumda hemen arayın: <span class="font-semibold underline" data-testid="online-preview-phone">{{ clinicPhone() }}</span>
                } @else {
                    Acil durumda kliniği hemen arayın.
                }
            </div>
            <p class="font-semibold m-0">1. Ne için geliyorsunuz?</p>
            <ul class="list-none m-0 p-0 flex flex-col gap-2" data-testid="online-preview-reasons">
                @for (reason of visible(); track reason.id) {
                    <li class="flex items-start gap-2">
                        <span class="mt-1 inline-block w-4 h-4 rounded-full border-2 border-surface-400 shrink-0" aria-hidden="true"></span>
                        <span>
                            {{ reason.name }}
                            <span class="block text-xs text-muted-color">Yaklaşık {{ reason.defaultDurationMinutes }} dk</span>
                        </span>
                    </li>
                }
                <li class="flex items-start gap-2">
                    <span class="mt-1 inline-block w-4 h-4 rounded-full border-2 border-surface-400 shrink-0" aria-hidden="true"></span>
                    <span>
                        {{ other.name }}
                        <span class="block text-xs text-muted-color">Yaklaşık {{ other.durationMinutes }} dk · Ne için geldiğinizi aşağıya yazın</span>
                    </span>
                </li>
            </ul>
            <div>
                <p class="text-sm m-0 mb-1">Not</p>
                <div class="h-14 rounded-md border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-950" aria-hidden="true"></div>
                <p class="text-xs text-muted-color mt-1 mb-0">Şikâyet, belirti ya da istediğiniz işlem; "{{ other.name }}"de zorunlu.</p>
            </div>
        </div>
    `
})
export class OnlineBookingPreviewComponent {
    readonly reasons = input.required<readonly AppointmentReasonVm[]>();
    readonly clinicPhone = input<string | null>(null);

    readonly other = ONLINE_OTHER_REASON;
    readonly visible = computed(() => onlineVisibleReasons(this.reasons()));
}
