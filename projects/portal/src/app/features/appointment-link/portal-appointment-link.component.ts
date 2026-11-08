import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES, portalErrorMessage, portalProblemCode } from '@portal/app/core/errors/portal-errors';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import { formatPortalDate, formatPortalTime, formatPortalWeekday } from '@portal/app/shared/format/portal-date';
import { PortalAddToCalendar } from '@portal/app/shared/ui/portal-add-to-calendar.component';
import { PortalErrorState, PortalLoadingState } from '@portal/app/shared/ui/portal-states.component';
import { PortalAppointmentLinkApi, PortalAppointmentLinkPage } from './portal-appointment-link.api';

type LinkState = 'loading' | 'invalid' | 'error' | 'ready' | 'confirmed' | 'cancelled';
type LinkAction = 'confirm' | 'cancel';

/**
 * Hatırlatmadaki "onayla / iptal et" bağlantısı (`/randevu-yanit?token=…&islem=onayla|iptal`; TIER-019). Kimliksiz ve kabuk
 * dışında. Sayfayı açmak hiçbir şeyi değiştirmez (e-posta tarayıcıları bağlantıyı açar): yalnız randevu bilgisi okunur,
 * eylem düğmeyle gönderilir. Bağlantı tek kullanımlıktır; geçersiz/kullanılmış/süresi dolmuş bağlantı tek mesajla gösterilir.
 * "Takvime ekle" (TIER-020) onay görünümünde ve onaydan sonra çıkar; .ics aynı tokenle alınır (okuma, tüketmez).
 */
@Component({
    selector: 'portal-appointment-link',
    standalone: true,
    imports: [ButtonModule, MessageModule, PortalAddToCalendar, PortalBrandHeader, PortalFooter, PortalLoadingState, PortalErrorState],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-appointment-link.component.html'
})
export class PortalAppointmentLinkComponent implements OnInit {
    private readonly api = inject(PortalAppointmentLinkApi);

    /** `?token=` (component input binding). Konsola/loga yazılmaz. */
    readonly token = input<string | undefined>();
    /** `?islem=` e-postadaki düğme: `iptal` iptali öne çıkarır, diğer her değer onayı. */
    readonly islem = input<string | undefined>();

    readonly state = signal<LinkState>('loading');
    readonly page = signal<PortalAppointmentLinkPage | null>(null);
    readonly loadError = signal('');
    readonly actionError = signal<string | null>(null);
    readonly pending = signal<LinkAction | null>(null);

    /** Görünüm: e-postadaki düğmeden başlar; onay görünümündeki "iptal et" önce iptal görünümüne geçer (tek tıkla iptal yok). */
    readonly mode = signal<LinkAction>('confirm');

    readonly invalidMessage = PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.appointmentLinkNotFound];

    /** .ics isteği: token gövdede gider. */
    readonly calendarFile = (): Observable<Blob> => this.api.calendar(this.token()?.trim() ?? '');

    /** İptal görünümü ve klinik iptale izin veriyor. */
    readonly cancelFirst = computed(() => this.mode() === 'cancel' && !!this.page()?.cancelEnabled);
    /** Klinik bağlantıdan iptali kapattı: iptal düğmesi yerine "kliniği arayın". */
    readonly cancelUnavailable = computed(() => this.page()?.cancelEnabled === false);

    readonly whenText = computed(() => {
        const at = this.page()?.scheduledAtUtc;

        return at ? `${formatPortalDate(at)} ${formatPortalWeekday(at)}, saat ${formatPortalTime(at)}` : '';
    });

    ngOnInit(): void {
        this.mode.set(this.islem() === 'iptal' ? 'cancel' : 'confirm');
        this.load();
    }

    askCancel(): void {
        this.actionError.set(null);
        this.mode.set('cancel');
    }

    load(): void {
        const token = this.token()?.trim();

        if (!token) {
            this.state.set('invalid');

            return;
        }

        this.state.set('loading');
        this.api.preview(token).subscribe({
            next: (page) => {
                this.page.set(page);
                this.state.set('ready');
            },
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                    this.state.set('invalid');

                    return;
                }

                this.loadError.set(portalErrorMessage(err));
                this.state.set('error');
            }
        });
    }

    confirm(): void {
        this.run('confirm');
    }

    cancel(): void {
        this.run('cancel');
    }

    private run(action: LinkAction): void {
        const token = this.token()?.trim();

        if (!token || this.pending()) {
            return;
        }

        this.actionError.set(null);
        this.pending.set(action);
        const request$ = action === 'cancel' ? this.api.cancel(token) : this.api.confirm(token);

        request$.subscribe({
            next: () => {
                this.pending.set(null);
                this.state.set(action === 'cancel' ? 'cancelled' : 'confirmed');
            },
            error: (err: unknown) => {
                this.pending.set(null);
                const code = portalProblemCode(err);

                if (code === PORTAL_ERROR_CODES.appointmentLinkNotFound) {
                    this.state.set('invalid');

                    return;
                }

                // Klinik bu arada iptali kapattıysa sayfa iptal düğmesini kaldırır; onay açık kalır.
                if (code === PORTAL_ERROR_CODES.appointmentLinkCancelDisabled) {
                    this.page.update((p) => (p ? { ...p, cancelEnabled: false } : p));
                }

                this.actionError.set(portalErrorMessage(err));
            }
        });
    }
}
