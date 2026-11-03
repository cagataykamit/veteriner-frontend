import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatClinicPhoneForDisplay } from '@/app/entities/clinic/utils/clinic-phone-format.utils';
import type { AppointmentReasonVm } from '@/app/entities/online-booking/models/online-booking.model';
import { ONLINE_OTHER_REASON } from '@/app/entities/online-booking/utils/appointment-reason-online.utils';
import { onlineVisibleReasons } from '@/app/entities/online-booking/utils/online-booking-readiness.utils';

/**
 * Müşterinin göreceği talep formunun ilk adımı (ADR-042 eki), panelde salt okunur önizleme. Portal
 * `portal-booking-reason-step` görünümünü izler: numaralı adım başlığı, acil kutusu ve telefon satırı ("Ara"), süre çipli
 * neden kartları, sonda kesik çerçeveli "Diğer / emin değilim", sayaçlı not. Renkler portal tasarımındaki değerlerdir.
 */
@Component({
    selector: 'app-online-booking-preview',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        :host {
            display: block;
        }
        .pv-card {
            max-width: 28rem;
            background: #fff;
            color: #0f172a;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            font-size: 15px;
        }
        .pv-step {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 17px;
            font-weight: 600;
        }
        .pv-step-num {
            display: inline-grid;
            place-items: center;
            width: 32px;
            height: 32px;
            border-radius: 999px;
            background: #0b1d3a;
            color: #fff;
            font-weight: 700;
            flex: 0 0 auto;
        }
        .pv-urgent {
            border: 1px solid #f5b8a8;
            border-radius: 12px;
            background: #fff5f2;
            color: #7a2410;
            overflow: hidden;
        }
        .pv-urgent-text {
            display: flex;
            gap: 10px;
            padding: 12px 14px;
            line-height: 1.45;
        }
        .pv-urgent-phone {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 14px;
            border-top: 1px solid #f5b8a8;
            background: #fff;
        }
        .pv-phone-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
        }
        .pv-phone-number {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            font-variant-numeric: tabular-nums;
        }
        .pv-call {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 44px;
            padding: 0 16px;
            border-radius: 10px;
            background: #b42318;
            color: #fff;
            font-weight: 600;
        }
        .pv-reasons {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .pv-reason {
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 56px;
            padding: 12px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
        }
        .pv-reason--other {
            border-style: dashed;
        }
        .pv-radio {
            width: 20px;
            height: 20px;
            border-radius: 999px;
            border: 2px solid #94a3b8;
            flex: 0 0 auto;
        }
        .pv-reason-body {
            flex: 1 1 auto;
            min-width: 0;
        }
        .pv-reason-hint {
            display: block;
            font-size: 13px;
            color: #475569;
        }
        .pv-chip {
            flex: 0 0 auto;
            padding: 2px 10px;
            border-radius: 999px;
            background: #eef2f6;
            color: #334155;
            font-size: 13px;
            font-weight: 600;
        }
        .pv-note-head {
            display: flex;
            justify-content: space-between;
            font-weight: 600;
            margin-bottom: 6px;
        }
        .pv-note-count {
            font-weight: 500;
            color: #475569;
        }
        .pv-note-box {
            min-height: 72px;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 10px 12px;
            color: #94a3b8;
        }
        .pv-note-hint {
            margin: 6px 0 0;
            font-size: 13px;
            color: #475569;
        }
    `,
    template: `
        <div class="pv-card" aria-label="Müşterinin göreceği talep formu (önizleme)" data-testid="online-preview">
            <div class="pv-step"><span class="pv-step-num" aria-hidden="true">1</span>Ne için geliyorsunuz?</div>

            <div class="pv-urgent">
                <div class="pv-urgent-text">
                    <i class="pi pi-exclamation-triangle mt-1" aria-hidden="true"></i>
                    <span><strong>Acil durum mu?</strong> Online talep kliniğin onayını bekler; acil durumda beklemeyin, kliniği telefonla arayın.</span>
                </div>
                @if (phone(); as p) {
                    <div class="pv-urgent-phone">
                        <span>
                            <span class="pv-phone-label">Klinik telefonu</span>
                            <span class="pv-phone-number" data-testid="online-preview-phone">{{ p }}</span>
                        </span>
                        <span class="pv-call" aria-hidden="true"><i class="pi pi-phone"></i>Ara</span>
                    </div>
                }
            </div>

            <ul class="pv-reasons" data-testid="online-preview-reasons">
                @for (reason of visible(); track reason.id) {
                    <li class="pv-reason">
                        <span class="pv-radio" aria-hidden="true"></span>
                        <span class="pv-reason-body">{{ reason.name }}</span>
                        <span class="pv-chip">~{{ reason.defaultDurationMinutes }} dk</span>
                    </li>
                }
                <li class="pv-reason pv-reason--other">
                    <span class="pv-radio" aria-hidden="true"></span>
                    <span class="pv-reason-body">
                        {{ other.name }}
                        <span class="pv-reason-hint">Ne için geldiğinizi aşağıya yazın</span>
                    </span>
                    <span class="pv-chip">~{{ other.durationMinutes }} dk</span>
                </li>
            </ul>

            <div>
                <div class="pv-note-head"><span>Not (isteğe bağlı)</span><span class="pv-note-count">0/500</span></div>
                <div class="pv-note-box" aria-hidden="true">Örn. iki gündür iştahsız, sol arka bacağını aksatıyor</div>
                <p class="pv-note-hint">Şikâyet, belirti ya da istediğiniz işlem; "{{ other.name }}" seçilirse zorunlu.</p>
            </div>
        </div>
    `
})
export class OnlineBookingPreviewComponent {
    readonly reasons = input.required<readonly AppointmentReasonVm[]>();
    readonly clinicPhone = input<string | null>(null);

    readonly other = ONLINE_OTHER_REASON;
    readonly visible = computed(() => onlineVisibleReasons(this.reasons()));
    /** Telefon yoksa portalda satır çıkmaz; önizleme de göstermez. */
    readonly phone = computed(() => (this.clinicPhone()?.trim() ? formatClinicPhoneForDisplay(this.clinicPhone()) : null));
}
