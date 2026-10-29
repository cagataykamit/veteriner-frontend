import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { Subscription } from 'rxjs';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalErrorMessage } from '@portal/app/core/errors/portal-errors';
import { portalLoad } from '@portal/app/shared/data/portal-load';
import { PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { PortalReminderPreferences, PortalReminderPreferencesApi } from './portal-reminder-preferences.api';

/**
 * Hatırlatma tercihi (APPT-014, sözleşme §5.11): seçili kliniğin aşı/randevu hatırlatmalarını sahip kendisi kapatıp açar.
 * Anahtar değişince hemen kaydedilir; yanıt gelene dek kilitlenir, hata olursa sunucudaki değer korunur.
 * Klinikte KVKK "Ret" kaydı varsa açma sunulmaz (sunucu da reddeder).
 */
@Component({
    selector: 'portal-reminder-preferences',
    standalone: true,
    imports: [MessageModule, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="portal-card portal-stack" aria-labelledby="account-reminders-title">
            <h2 id="account-reminders-title" class="portal-subtitle">Hatırlatmalar</h2>
            @switch (prefs.state()) {
                @case ('loading') {
                    <portal-skeleton [rows]="1" message="Hatırlatma tercihi yükleniyor…" />
                }
                @case ('error') {
                    <portal-error-state [message]="prefs.error()" (retry)="prefs.retry()" />
                }
                @default {
                    @if (prefs.data(); as p) {
                        <label class="portal-check">
                            <input
                                type="checkbox"
                                role="switch"
                                data-testid="reminders-switch"
                                [checked]="!p.remindersOptedOut"
                                [disabled]="saving() || (p.remindersOptedOut && !p.canEnableReminders)"
                                [attr.aria-checked]="!p.remindersOptedOut"
                                aria-describedby="account-reminders-hint"
                                (change)="toggle($any($event.target))"
                            />
                            <span>
                                Aşı ve randevu hatırlatmaları gönderilsin
                                <span id="account-reminders-hint" class="portal-field-hint">{{ hint() }}</span>
                            </span>
                        </label>
                        @if (p.remindersOptedOut && !p.canEnableReminders) {
                            <p class="portal-muted" data-testid="reminders-kvkk-note">Klinikteki KVKK açık rıza kaydınız "Ret" olduğu için hatırlatmalar kapalı. Açmak için kliniğinizle görüşün.</p>
                        }
                        <p class="sr-only" aria-live="polite">{{ status() }}</p>
                        @if (saveError(); as message) {
                            <p-message severity="error" role="alert">{{ message }}</p-message>
                        }
                    }
                }
            }
        </section>
    `
})
export class PortalReminderPreferencesComponent {
    private readonly session = inject(PortalSessionService);
    private readonly api = inject(PortalReminderPreferencesApi);

    readonly prefs = portalLoad<PortalReminderPreferences>();
    readonly saving = signal(false);
    readonly saveError = signal<string | null>(null);
    readonly status = signal('');

    readonly hint = computed(() => {
        const clinicName = this.session.activeLink()?.clinicName?.trim() || 'Kliniğiniz';

        return this.prefs.data()?.remindersOptedOut
            ? `${clinicName} size otomatik hatırlatma göndermiyor.`
            : `${clinicName} yaklaşan aşı ve randevularınızı size hatırlatır.`;
    });

    private request: Subscription | null = null;

    constructor() {
        effect(() => {
            const link = this.session.activeLink();

            untracked(() => {
                this.request?.unsubscribe();
                this.saving.set(false);
                this.saveError.set(null);

                if (link) {
                    this.prefs.run(() => this.api.get(link.linkId));
                }
            });
        });
    }

    toggle(input: HTMLInputElement): void {
        const enabled = input.checked;
        const link = this.session.activeLink();
        const current = this.prefs.data();

        if (!link || !current || this.saving()) {
            return;
        }

        this.saving.set(true);
        this.saveError.set(null);
        this.status.set('');
        this.request = this.api.update(link.linkId, !enabled).subscribe({
            next: (saved) => {
                this.prefs.data.set(saved);
                this.saving.set(false);
                this.status.set(saved.remindersOptedOut ? 'Hatırlatmalar kapatıldı.' : 'Hatırlatmalar açıldı.');
            },
            error: (err: unknown) => {
                // Bağlama değeri değişmediği için Angular DOM'u yeniden yazmaz; anahtar sunucudaki değere elle döner.
                input.checked = !current.remindersOptedOut;
                this.saving.set(false);
                this.saveError.set(portalErrorMessage(err));
            }
        });
    }
}
