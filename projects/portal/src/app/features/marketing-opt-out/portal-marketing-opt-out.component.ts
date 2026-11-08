import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES, portalErrorMessage, portalProblemCode } from '@portal/app/core/errors/portal-errors';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import { PortalErrorState, PortalLoadingState } from '@portal/app/shared/ui/portal-states.component';
import { PortalMarketingOptOutApi, PortalMarketingOptOutPage } from './portal-marketing-opt-out.api';

type OptOutState = 'loading' | 'invalid' | 'error' | 'ready' | 'done';

/**
 * Ticari iletideki ret bağlantısı (`/ticari-ileti-ret?token=…`; ADR-046 K3). Kimliksiz ve kabuk dışında. Ücretsiz ve tek adımlıdır:
 * sayfayı açmak hiçbir şeyi değiştirmez (e-posta tarayıcıları bağlantıyı açar), ret tek düğmeyle gönderilir. Bağlantı tek kullanımlık
 * değildir; zaten reddedilmişse durum yazılır.
 */
@Component({
    selector: 'portal-marketing-opt-out',
    standalone: true,
    imports: [ButtonModule, MessageModule, PortalBrandHeader, PortalFooter, PortalLoadingState, PortalErrorState],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <main class="portal-page portal-stack">
            <portal-brand-header [clinicName]="page()?.clinicName ?? null" />

            @switch (state()) {
                @case ('loading') {
                    <portal-loading-state message="Bağlantı kontrol ediliyor…" />
                }
                @case ('invalid') {
                    <section class="portal-card portal-stack" aria-labelledby="optout-invalid-title">
                        <h1 id="optout-invalid-title" class="portal-title">Bağlantı geçersiz</h1>
                        <p>{{ invalidMessage }}</p>
                    </section>
                }
                @case ('error') {
                    <portal-error-state [message]="loadError()" (retry)="load()" />
                }
                @case ('done') {
                    <section class="portal-card portal-stack" aria-labelledby="optout-done-title" data-testid="optout-done">
                        <h1 id="optout-done-title" class="portal-title">Ticari ileti almayacaksınız</h1>
                        <p>{{ page()?.clinicName }} size artık ticari ileti göndermeyecek. Randevu ve aşı hatırlatmaları bundan etkilenmez.</p>
                        <p class="portal-muted">Fikrinizi değiştirirseniz portalda Hesabım sayfasındaki bildirim tercihlerinden yeniden onay verebilirsiniz.</p>
                    </section>
                }
                @case ('ready') {
                    @if (page(); as p) {
                        <section class="portal-card portal-stack" aria-labelledby="optout-title">
                            <h1 id="optout-title" class="portal-title">Ticari ileti almak istemiyorum</h1>
                            <p>{{ p.clinicName }} kliniğinden tanıtım ve kampanya iletisi almayı bırakmak için aşağıdaki düğmeye basın. Ücretsizdir.</p>
                            @if (actionError(); as message) {
                                <p-message severity="error" role="alert">{{ message }}</p-message>
                            }
                            <div class="portal-actions">
                                <button pButton type="button" [disabled]="pending()" (click)="confirm()">
                                    @if (pending()) {<i class="p-button-icon fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>}Ticari iletileri reddet
                                </button>
                            </div>
                        </section>
                    }
                }
            }

            <portal-footer />
        </main>
    `
})
export class PortalMarketingOptOutComponent implements OnInit {
    private readonly api = inject(PortalMarketingOptOutApi);

    /** `?token=` (component input binding). Konsola/loga yazılmaz. */
    readonly token = input<string | undefined>();

    readonly state = signal<OptOutState>('loading');
    readonly page = signal<PortalMarketingOptOutPage | null>(null);
    readonly loadError = signal('');
    readonly actionError = signal<string | null>(null);
    readonly pending = signal(false);

    readonly invalidMessage = PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.marketingOptOutNotFound];

    ngOnInit(): void {
        this.load();
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
                this.state.set(page.isOptedOut ? 'done' : 'ready');
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
        const token = this.token()?.trim();

        if (!token || this.pending()) {
            return;
        }

        this.actionError.set(null);
        this.pending.set(true);
        this.api.confirm(token).subscribe({
            next: () => {
                this.pending.set(false);
                this.state.set('done');
            },
            error: (err: unknown) => {
                this.pending.set(false);

                if (portalProblemCode(err) === PORTAL_ERROR_CODES.marketingOptOutNotFound) {
                    this.state.set('invalid');

                    return;
                }

                this.actionError.set(portalErrorMessage(err));
            }
        });
    }
}
