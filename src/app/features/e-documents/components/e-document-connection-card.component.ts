import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import type { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { EDocumentConnectionDto } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppStatusTagComponent, type StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/** OAuth dönüşündeki `reason` kodlarının kullanıcı metni (backend E_DOCUMENTS_API_CONTRACT §3.3). */
const RETURN_REASONS: Record<string, string> = {
    denied: 'Yetkilendirme entegratör ekranında onaylanmadı.',
    expired: 'Bağlantı isteğinin süresi doldu; tekrar deneyin.',
    'exchange-failed': 'Entegratör yetkilendirmeyi tamamlamadı; tekrar deneyin.',
    'accounts-failed': 'Entegratör hesapları okunamadı; tekrar deneyin.',
    'no-account': 'Bu kullanıcının erişebildiği bir firma yok.',
    'not-configured': 'e-belge sağlayıcısı sunucuda yapılandırılmamış.'
};

/**
 * Klinik ayarlarındaki "e-belge entegratörü" kartı (ADR-036 AK-1 a): kliniğin kendi Paraşüt hesabı OAuth ile bağlanır
 * (kimlik bilgisi sunucuda şifreli; panele hiç gelmez), durum, hesap seçimi, bağlantı sınaması ve koparma.
 * Yalnız `Clinics.Update` olan kullanıcıya gösterilir (sayfa koşulu).
 */
@Component({
    selector: 'app-clinic-e-document-connection-section',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, SelectModule, AppLoadingStateComponent, AppErrorStateComponent, AppStatusTagComponent, TrDateTimePipe],
    template: `
        <div class="card mb-4" data-testid="clinic-e-document-connection">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h5 class="m-0">e-belge entegratörü</h5>
                @if (connection(); as c) {
                    <app-status-tag [label]="statusText()" [severity]="statusSeverity()" />
                }
            </div>
            <p class="text-sm text-muted-color mt-0 mb-4">e-SMM, e-Arşiv ve e-Fatura kliniğin kendi entegratör hesabıyla kesilir; kontör ücreti entegratörle yaptığınız sözleşmededir. Hesap şifreniz Vetinity'ye girilmez, bağlantı entegratörün kendi ekranında onaylanır.</p>

            @if (loading()) {
                <app-loading-state message="Bağlantı durumu yükleniyor…" />
            } @else if (loadError(); as err) {
                <app-error-state [detail]="err" (retry)="load()" />
            } @else if (connection(); as c) {
                @if (actionError()) {
                    <p class="text-danger text-sm mt-0 mb-3" role="alert">{{ actionError() }}</p>
                }

                @if (c.status === 'Connected' || c.status === 'AccountSelectionRequired') {
                    <dl class="grid grid-cols-12 gap-x-4 gap-y-2 m-0 text-sm">
                        <dt class="col-span-12 sm:col-span-4 text-muted-color">Sağlayıcı</dt>
                        <dd class="col-span-12 sm:col-span-8 m-0">{{ c.providerName }} @if (c.environment === 'Test') {<span class="text-muted-color">(test ortamı)</span>}</dd>
                        @if (c.accountName) {
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hesap</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ c.accountName }}</dd>
                        }
                        @if (c.lastVerifiedAtUtc) {
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Son sınama</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0" [class.text-danger]="c.lastVerificationOk === false">{{ c.lastVerifiedAtUtc | trDateTime }} · {{ c.lastVerificationMessage }}</dd>
                        }
                    </dl>
                }

                @if (c.status === 'AccountSelectionRequired') {
                    <div class="mt-4 flex flex-wrap items-end gap-2">
                        <div class="grow min-w-[14rem]">
                            <label for="edocAccount" class="block text-sm font-medium text-muted-color mb-2">Bağlanacak firma</label>
                            <p-select inputId="edocAccount" class="w-full" [options]="c.accountChoices ?? []" optionLabel="accountName" optionValue="accountId" [(ngModel)]="selectedAccount" [ngModelOptions]="{ standalone: true }" placeholder="Firma seçin" />
                        </div>
                        <button pButton type="button" [disabled]="!selectedAccount || busy() || ro.mutationBlocked()" (click)="selectAccount()">Firmayı bağla</button>
                    </div>
                } @else if (c.status === 'ReauthorizationRequired') {
                    <p class="text-sm m-0">Entegratör yetkisi sona erdi ({{ c.lastVerificationMessage }}). Belge kesmek için hesabı yeniden bağlayın.</p>
                } @else if (c.status === 'NotConnected') {
                    <p class="text-sm m-0">Henüz bağlı bir hesap yok.</p>
                }

                <div class="mt-4 flex flex-wrap justify-end gap-2">
                    @if (c.status === 'Connected') {
                        <button pButton type="button" severity="secondary" [outlined]="true" [disabled]="busy()" (click)="verify()" data-testid="edoc-verify"><i class="p-button-icon pi pi-check-circle"></i>Bağlantıyı sına</button>
                    }
                    @if (c.status !== 'NotConnected') {
                        <button pButton type="button" severity="danger" [text]="true" [disabled]="busy() || ro.mutationBlocked()" (click)="disconnect()">Bağlantıyı kopar</button>
                    }
                    @for (p of connectableProviders(); track p.provider) {
                        <button pButton type="button" [severity]="c.status === 'Connected' ? 'secondary' : 'primary'" [disabled]="busy() || ro.mutationBlocked() || !p.configured" (click)="connect(p.provider)" [attr.data-testid]="'edoc-connect-' + p.provider">
                            <i class="p-button-icon pi pi-link"></i>{{ c.status === 'NotConnected' ? p.providerName + ' hesabını bağla' : 'Yeniden bağla' }}
                        </button>
                    }
                </div>
            }
        </div>
    `
})
export class ClinicEDocumentConnectionSectionComponent implements OnInit {
    readonly clinicId = input.required<string>();

    private readonly service = inject(EDocumentsService);
    private readonly messages = inject(MessageService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly busy = signal(false);
    readonly connection = signal<EDocumentConnectionDto | null>(null);
    selectedAccount: string | null = null;

    readonly connectableProviders = computed(() => this.connection()?.availableProviders ?? []);
    readonly statusText = computed(() => {
        switch (this.connection()?.status) {
            case 'Connected':
                return this.connection()?.lastVerificationOk === false ? 'Sorunlu' : 'Bağlı';
            case 'AccountSelectionRequired':
                return 'Firma seçilmeli';
            case 'ReauthorizationRequired':
                return 'Yeniden bağlanmalı';
            default:
                return 'Bağlı değil';
        }
    });
    readonly statusSeverity = computed<StatusTagSeverity>(() => {
        const c = this.connection();

        if (c?.status === 'Connected') {
            return c.lastVerificationOk === false ? 'warn' : 'success';
        }

        return c?.status === 'NotConnected' ? 'secondary' : 'warn';
    });

    ngOnInit(): void {
        this.announceReturn();
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.service
            .getConnection(this.clinicId())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (c) => {
                    this.connection.set(c);
                    this.loading.set(false);
                },
                error: (e: unknown) => {
                    this.loadError.set(panelHttpFailureMessage(e, 'Bağlantı durumu yüklenemedi.'));
                    this.loading.set(false);
                }
            });
    }

    /** Tarayıcı entegratörün yetki ekranına gider; onaydan sonra API bu sayfaya sonuç koduyla döndürür. */
    connect(provider: string): void {
        this.run(this.service.authorize(this.clinicId(), provider), (url) => this.openAuthorization(url), 'Bağlantı başlatılamadı.');
    }

    /** Tarayıcıyı entegratörün yetki ekranına götürür (testte gözlenebilir olsun diye ayrı). */
    openAuthorization(url: string): void {
        window.location.assign(url);
    }

    selectAccount(): void {
        if (this.selectedAccount) {
            this.run(this.service.selectAccount(this.clinicId(), this.selectedAccount), (c) => this.connection.set(c), 'Firma bağlanamadı.');
        }
    }

    verify(): void {
        this.run(
            this.service.verify(this.clinicId()),
            (c) => {
                this.connection.set(c);
                this.messages.add({ severity: c.lastVerificationOk ? 'success' : 'warn', summary: 'Bağlantı sınandı', detail: c.lastVerificationMessage ?? undefined, life: 5000 });
            },
            'Bağlantı sınanamadı.'
        );
    }

    disconnect(): void {
        this.run(this.service.disconnect(this.clinicId()), () => this.load(), 'Bağlantı koparılamadı.');
    }

    private run<T>(call$: Observable<T>, next: (value: T) => void, fallback: string): void {
        this.busy.set(true);
        this.actionError.set(null);
        call$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (value) => {
                this.busy.set(false);
                next(value);
            },
            error: (e: unknown) => {
                this.busy.set(false);
                this.actionError.set(panelHttpFailureMessage(e, fallback));
            }
        });
    }

    /** OAuth dönüşü `?eDocumentConnection=…&reason=…` bir kez bildirilir ve adresten temizlenir. */
    private announceReturn(): void {
        const query = this.route.snapshot.queryParamMap;
        const outcome = query.get('eDocumentConnection');

        if (!outcome) {
            return;
        }

        if (outcome === 'connected') {
            this.messages.add({ severity: 'success', summary: 'Entegratör bağlandı', life: 4000 });
        } else if (outcome === 'select-account') {
            this.messages.add({ severity: 'info', summary: 'Firma seçin', detail: 'Hesabınızda birden çok firma var; bağlanacak firmayı seçin.', life: 6000 });
        } else {
            const reason = query.get('reason') ?? '';

            this.messages.add({ severity: 'error', summary: 'Entegratör bağlanamadı', detail: RETURN_REASONS[reason] ?? 'Tekrar deneyin.', life: 8000 });
        }

        void this.router.navigate([], { relativeTo: this.route, queryParams: { eDocumentConnection: null, reason: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
}
