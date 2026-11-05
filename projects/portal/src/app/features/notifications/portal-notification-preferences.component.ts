import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { from, Observable, Subscription, switchMap } from 'rxjs';
import { isClinicPortalClosed } from '@portal/app/core/auth/portal-auth.models';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalErrorMessage } from '@portal/app/core/errors/portal-errors';
import { PortalPushDevice } from '@portal/app/core/push/portal-push-device';
import { portalLoad } from '@portal/app/shared/data/portal-load';
import { formatPortalDate } from '@portal/app/shared/format/portal-date';
import { PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import {
    PortalAccountNotificationPreferences,
    PortalLinkNotificationPreferences,
    PortalLinkNotificationPreferencesPatch,
    PortalNotificationPreferencesApi
} from './portal-notification-preferences.api';

type PreferenceKey = 'push' | 'reminders' | 'marketing';

/**
 * Bildirim tercihleri (PORTAL-007, sözleşme §10): hesap düzeyi anlık bildirim (push, MOBILE-003 §14) ve seçili klinikteki hatırlatma
 * (§5.11 ile aynı alan) ile ticari ileti onayı. Anahtar değişince hemen kaydedilir; kayıt sürerken anahtarlar kilitlenir, hata
 * olursa sunucudaki değer korunur. İşlem iletileri tercihle kapanmaz. Push sağlayıcısı yokken ve ticari gönderim kapalıyken tercih
 * yine saklanır. Cihaz jetonu `PortalPushDevice`'tan gelir (tarayıcıda yok; mağaza paketinde MOBILE-002).
 */
@Component({
    selector: 'portal-notification-preferences',
    standalone: true,
    imports: [MessageModule, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="portal-card portal-stack" aria-labelledby="account-notifications-title">
            <h2 id="account-notifications-title" class="portal-subtitle">Bildirim tercihleri</h2>
            <p class="portal-muted">Giriş kodu, davet, randevu talebi ve veri talebi yanıtı gibi işlem e-postaları tercihten bağımsız olarak her zaman gönderilir.</p>

            @switch (account.state()) {
                @case ('loading') {
                    <portal-skeleton [rows]="1" message="Bildirim tercihi yükleniyor…" />
                }
                @case ('error') {
                    <portal-error-state [message]="account.error()" (retry)="account.retry()" />
                }
                @default {
                    @if (account.data(); as a) {
                        <label class="portal-check">
                            <input
                                type="checkbox"
                                role="switch"
                                data-testid="push-switch"
                                [checked]="a.push.enabled"
                                [disabled]="saving() !== null"
                                [attr.aria-checked]="a.push.enabled"
                                aria-describedby="account-push-hint"
                                (change)="togglePush($any($event.target))"
                            />
                            <span>
                                Anlık bildirim
                                <span id="account-push-hint" class="portal-field-hint" data-testid="push-hint">{{
                                    a.push.available
                                        ? '"Verilerimle ilgili talep" yanıtları cihazınıza anlık bildirim olarak da gelir.'
                                        : 'Anlık bildirimler henüz etkin değil. Tercihiniz şimdiden kaydedilir; etkinleştiğinde yeniden sorulmaz.'
                                }}</span>
                            </span>
                        </label>
                        @if (pushNote(); as note) {
                            <div class="portal-note" data-testid="push-note">
                                <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                                <p>{{ note }}</p>
                            </div>
                        }
                    }
                }
            }

            @if (linkVisible()) {
                <h3 class="portal-subtitle">{{ clinicName() }} kliniğinden gelenler</h3>
                @switch (link.state()) {
                    @case ('loading') {
                        <portal-skeleton [rows]="2" message="Klinik tercihleri yükleniyor…" />
                    }
                    @case ('error') {
                        <portal-error-state [message]="link.error()" (retry)="link.retry()" />
                    }
                    @default {
                        @if (link.data(); as p) {
                            <label class="portal-check">
                                <input
                                    type="checkbox"
                                    role="switch"
                                    data-testid="reminders-switch"
                                    [checked]="!p.remindersOptedOut"
                                    [disabled]="saving() !== null || (p.remindersOptedOut && !p.canEnableReminders)"
                                    [attr.aria-checked]="!p.remindersOptedOut"
                                    aria-describedby="account-reminders-hint"
                                    (change)="toggleReminders($any($event.target))"
                                />
                                <span>
                                    Aşı ve randevu hatırlatmaları gönderilsin
                                    <span id="account-reminders-hint" class="portal-field-hint">{{ remindersHint() }}</span>
                                </span>
                            </label>
                            @if (p.remindersOptedOut && !p.canEnableReminders) {
                                <p class="portal-muted" data-testid="reminders-kvkk-note">Klinikteki KVKK açık rıza kaydınız "Ret" olduğu için hatırlatmalar kapalı. Açmak için kliniğinizle görüşün.</p>
                            }

                            <label class="portal-check">
                                <input
                                    type="checkbox"
                                    role="switch"
                                    data-testid="marketing-switch"
                                    [checked]="p.marketingConsented"
                                    [disabled]="saving() !== null"
                                    [attr.aria-checked]="p.marketingConsented"
                                    aria-describedby="account-marketing-hint"
                                    (change)="toggleMarketing($any($event.target))"
                                />
                                <span>
                                    Kampanya ve duyuru iletileri almak istiyorum
                                    <span id="account-marketing-hint" class="portal-field-hint">{{ marketingHint() }}</span>
                                </span>
                            </label>
                            @if (!p.marketingSendingEnabled) {
                                <div class="portal-note" data-testid="marketing-off-note">
                                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                                    <p>Kampanya/duyuru gönderimi şu an kapalıdır; onayınız kaydedilir.</p>
                                </div>
                            }
                        }
                    }
                }
            }

            <p class="sr-only" aria-live="polite">{{ status() }}</p>
            @if (saveError(); as message) {
                <p-message severity="error" role="alert">{{ message }}</p-message>
            }
        </section>
    `
})
export class PortalNotificationPreferencesComponent {
    private readonly session = inject(PortalSessionService);
    private readonly api = inject(PortalNotificationPreferencesApi);
    private readonly pushDevice = inject(PortalPushDevice);

    readonly account = portalLoad<PortalAccountNotificationPreferences>();
    readonly link = portalLoad<PortalLinkNotificationPreferences>();
    readonly saving = signal<PreferenceKey | null>(null);
    readonly saveError = signal<string | null>(null);
    readonly status = signal('');
    /** Bu cihazın jetonu alınamadı/kaydedilemedi (izin verilmedi vb.); tercih yine kayıtlıdır. */
    private readonly deviceError = signal<string | null>(null);

    /** Klinik portalı kapattıysa bağ kapsamlı uçlar 404 döner (§12); bölüm hiç sorulmaz. */
    readonly linkVisible = computed(() => {
        const link = this.session.activeLink();

        return !!link && !isClinicPortalClosed(link);
    });

    readonly clinicName = computed(() => this.session.activeLink()?.clinicName?.trim() || 'Kliniğiniz');

    readonly remindersHint = computed(() =>
        this.link.data()?.remindersOptedOut ? `${this.clinicName()} size otomatik hatırlatma göndermiyor.` : `${this.clinicName()} yaklaşan aşı ve randevularınızı size hatırlatır.`
    );

    readonly marketingHint = computed(() => {
        const prefs = this.link.data();
        const since = prefs?.marketingConsented ? formatPortalDate(prefs.marketingConsentedAtUtc) : '';

        return since ? `Onay tarihi: ${since}. Onayınızı istediğiniz zaman geri çekebilirsiniz.` : 'Onayınızı istediğiniz zaman geri çekebilirsiniz.';
    });

    /**
     * Anlık bildirim açıkken bu cihazın durumu: cihaz izni alınamadıysa o; tarayıcı/paket jeton üretemiyorsa bildirimin nereye
     * gideceği. Sağlayıcı yokken ipucu yeterlidir (not yok).
     */
    readonly pushNote = computed(() => {
        const push = this.account.data()?.push;

        if (!push?.enabled || !push.available) {
            return null;
        }

        if (this.deviceError()) {
            return this.deviceError();
        }

        if (this.pushDevice.supported) {
            return null;
        }

        return push.deviceCount > 0
            ? `Bildirimler kayıtlı ${push.deviceCount} cihazınıza gelir. Bu tarayıcı anlık bildirim almıyor.`
            : 'Bu tarayıcıda anlık bildirim alınamıyor. Bildirimler, Vetinity mobil uygulamasında oturum açtığınız cihaza gelir.';
    });

    private request: Subscription | null = null;

    constructor() {
        this.account.run(() => this.api.getAccount());

        effect(() => {
            const link = this.session.activeLink();
            const visible = this.linkVisible();

            untracked(() => {
                this.request?.unsubscribe();
                this.saving.set(null);
                this.saveError.set(null);

                if (link && visible) {
                    this.link.run(() => this.api.getLink(link.linkId));
                }
            });
        });
    }

    togglePush(input: HTMLInputElement): void {
        const current = this.account.data();

        if (!current) {
            return;
        }

        this.deviceError.set(null);
        this.save('push', input, current.push.enabled, this.api.updateAccount(input.checked), (saved) => {
            this.account.data.set(saved);
            this.registerThisDevice(saved);

            return saved.push.enabled ? 'Anlık bildirimler açıldı.' : 'Anlık bildirimler kapatıldı.';
        });
    }

    /**
     * Tercih açılınca bu cihaz jeton üretebiliyorsa izin istenir ve jeton kaydedilir (§14.2); sayaç sunucudan yeniden okunur.
     * Kapatmada sunucu tüm cihazları siler, istemcinin ayrıca bir şey yapması gerekmez.
     */
    private registerThisDevice(saved: PortalAccountNotificationPreferences): void {
        if (!saved.push.enabled || !saved.push.available || !this.pushDevice.supported) {
            return;
        }

        from(this.pushDevice.obtainToken())
            .pipe(
                switchMap((token) => this.api.registerPushDevice(this.pushDevice.platform, token)),
                switchMap(() => this.api.getAccount())
            )
            .subscribe({
                next: (fresh) => this.account.data.set(fresh),
                error: () => this.deviceError.set('Bu cihaz için bildirim izni alınamadı. Cihaz ayarlarından bildirimlere izin verip anahtarı kapatıp yeniden açın.')
            });
    }

    toggleReminders(input: HTMLInputElement): void {
        this.saveLink('reminders', input, (p) => !p.remindersOptedOut, { remindersOptedOut: !input.checked }, (saved) =>
            saved.remindersOptedOut ? 'Hatırlatmalar kapatıldı.' : 'Hatırlatmalar açıldı.'
        );
    }

    toggleMarketing(input: HTMLInputElement): void {
        this.saveLink('marketing', input, (p) => p.marketingConsented, { marketingConsented: input.checked }, (saved) =>
            saved.marketingConsented ? 'Kampanya ve duyuru onayınız kaydedildi.' : 'Kampanya ve duyuru onayınız geri çekildi.'
        );
    }

    private saveLink(
        key: PreferenceKey,
        input: HTMLInputElement,
        checkedOf: (prefs: PortalLinkNotificationPreferences) => boolean,
        patch: PortalLinkNotificationPreferencesPatch,
        done: (saved: PortalLinkNotificationPreferences) => string
    ): void {
        const link = this.session.activeLink();
        const current = this.link.data();

        if (!link || !current) {
            return;
        }

        this.save(key, input, checkedOf(current), this.api.updateLink(link.linkId, patch), (saved) => {
            this.link.data.set(saved);

            return done(saved);
        });
    }

    private save<T>(key: PreferenceKey, input: HTMLInputElement, previous: boolean, request: Observable<T>, done: (saved: T) => string): void {
        if (this.saving()) {
            input.checked = previous;

            return;
        }

        this.saving.set(key);
        this.saveError.set(null);
        this.status.set('');
        this.request = request.subscribe({
            next: (saved) => {
                this.saving.set(null);
                this.status.set(done(saved));
            },
            error: (err: unknown) => {
                // Bağlama değeri değişmediği için Angular DOM'u yeniden yazmaz; anahtar sunucudaki değere elle döner.
                input.checked = previous;
                this.saving.set(null);
                this.saveError.set(portalErrorMessage(err));
            }
        });
    }
}
