import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import type { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { EDocumentConnectionDto, EDocumentProviderOption } from '@/app/entities/e-document/models/e-document.model';
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
 * e-belge entegratörü kartı (ADR-036 AK-1 a): sağlayıcı seçimi ve seçilen sağlayıcının bağlantısı. Sağlayıcı listesi backend'den
 * gelir; bağlanma yöntemi sağlayıcıya göredir (`OAuth`: entegratörün kendi ekranında onay, şifre Vetinity'ye girilmez). Kimlik
 * bilgisi sunucuda şifreli kalır, panele hiç gelmez.
 */
@Component({
    selector: 'app-e-document-connection-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, AppLoadingStateComponent, AppErrorStateComponent, AppStatusTagComponent, TrDateTimePipe],
    template: `
        <div class="card mb-4" data-testid="e-document-connection">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h5 class="m-0">Entegratör</h5>
                @if (connection()) {
                    <app-status-tag [label]="statusText()" [severity]="statusSeverity()" />
                }
            </div>
            <p class="text-sm text-muted-color mt-0 mb-4">
                Belgeler kliniğin kendi entegratör hesabıyla kesilir; kontör ücreti entegratörle yaptığınız sözleşmededir. Hesap şifreniz Vetinity'ye girilmez: bağlantı ya entegratörün kendi ekranında onaylanır ya da entegratörde ürettiğiniz API anahtarıyla kurulur.
            </p>

            @if (loading()) {
                <app-loading-state message="Bağlantı durumu yükleniyor…" />
            } @else if (loadError(); as err) {
                <app-error-state [detail]="err" (retry)="load()" />
            } @else if (connection(); as c) {
                @if (actionError()) {
                    <p class="text-danger text-sm mt-0 mb-3" role="alert">{{ actionError() }}</p>
                }

                @if (c.status === 'NotConnected' || c.status === 'ReauthorizationRequired') {
                    <div class="mb-4 max-w-md">
                        <label for="edocProvider" class="block text-sm font-medium text-muted-color mb-2">Entegratör</label>
                        <p-select inputId="edocProvider" class="w-full" [options]="providerOptions()" optionLabel="label" optionValue="value" optionDisabled="disabled" [(ngModel)]="selectedProvider" [ngModelOptions]="{ standalone: true }" />
                        <small class="text-muted-color">Listede olmayan entegratör için destekle iletişime geçin; sağlayıcılar zamanla eklenir.</small>
                    </div>
                } @else {
                    <dl class="grid grid-cols-12 gap-x-4 gap-y-2 m-0 text-sm">
                        <dt class="col-span-12 sm:col-span-4 text-muted-color">Entegratör</dt>
                        <dd class="col-span-12 sm:col-span-8 m-0">
                            {{ c.providerName }}
                            @if (c.environment === 'Test') {
                                <span class="text-muted-color">(test ortamı)</span>
                            }
                        </dd>
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
                }

                <div class="mt-4 flex flex-wrap justify-end gap-2">
                    @if (c.status === 'Connected') {
                        <button pButton type="button" severity="secondary" [outlined]="true" [disabled]="busy()" (click)="verify()" data-testid="edoc-verify"><i class="p-button-icon pi pi-check-circle"></i>Bağlantıyı sına</button>
                    }
                    @if (c.status !== 'NotConnected') {
                        <button pButton type="button" severity="danger" [text]="true" [disabled]="busy() || ro.mutationBlocked()" (click)="disconnect()">Bağlantıyı kopar</button>
                    }
                    @if (chosenProvider(); as p) {
                        @if (p.connectionMethod === 'OAuth') {
                            <button pButton type="button" [severity]="c.status === 'Connected' ? 'secondary' : 'primary'" [disabled]="busy() || ro.mutationBlocked() || !p.configured" (click)="connect(p.provider)" data-testid="edoc-connect">
                                <i class="p-button-icon pi pi-link"></i>{{ c.status === 'Connected' ? 'Yeniden bağla' : p.providerName + ' hesabını bağla' }}
                            </button>
                        } @else if (c.status === 'Connected' && !keyFormOpen()) {
                            <button pButton type="button" severity="secondary" [disabled]="busy() || ro.mutationBlocked() || !p.configured" (click)="keyFormOpen.set(true)" data-testid="edoc-change-key">
                                <i class="p-button-icon pi pi-key"></i>Anahtarı değiştir
                            </button>
                        }
                    }
                </div>

                @if (chosenProvider(); as p) {
                    @if (p.connectionMethod === 'Credentials' && (c.status !== 'Connected' || keyFormOpen())) {
                        <form class="mt-4 flex flex-wrap items-end gap-2" (ngSubmit)="connectWithKey(p.provider)" data-testid="edoc-key-form">
                            <div class="grow min-w-[16rem]">
                                <label for="edocApiKey" class="block text-sm font-medium text-muted-color mb-2">{{ p.providerName }} API anahtarı</label>
                                <input pInputText id="edocApiKey" name="apiKey" type="password" class="w-full" autocomplete="off" spellcheck="false" [(ngModel)]="apiKey" [disabled]="busy() || ro.mutationBlocked() || !p.configured" />
                                <small class="text-muted-color">Anahtarı {{ p.providerName }} portalının API tanımları ekranında üretip buraya yapıştırın. Anahtar şifreli saklanır, bir daha gösterilmez.</small>
                            </div>
                            @if (keyFormOpen()) {
                                <button pButton type="button" severity="secondary" [text]="true" [disabled]="busy()" (click)="closeKeyForm()">Vazgeç</button>
                            }
                            <button pButton type="submit" [disabled]="!apiKey.trim() || busy() || ro.mutationBlocked() || !p.configured" data-testid="edoc-key-connect">
                                <i class="p-button-icon pi pi-link"></i>Bağla ve sına
                            </button>
                        </form>
                    }
                }
            }
        </div>
    `
})
export class EDocumentConnectionCardComponent implements OnInit {
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
    readonly keyFormOpen = signal(false);
    selectedAccount: string | null = null;
    selectedProvider: string | null = null;
    apiKey = '';

    readonly providerOptions = computed(() =>
        (this.connection()?.availableProviders ?? []).map((p) => ({ value: p.provider, label: p.configured ? p.providerName : `${p.providerName} (yapılandırılmadı)`, disabled: !p.configured }))
    );

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

    /** Bağlıyken bağlı sağlayıcı; değilse listeden seçilen (ilk yapılandırılmış varsayılan). */
    chosenProvider(): EDocumentProviderOption | null {
        const c = this.connection();

        if (!c) {
            return null;
        }

        const code = c.status === 'Connected' || c.status === 'AccountSelectionRequired' ? c.provider : this.selectedProvider;

        return c.availableProviders.find((p) => p.provider === code) ?? null;
    }

    load(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.service
            .getConnection(this.clinicId())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (c) => this.setConnection(c),
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

    /** API anahtarıyla bağlanma: anahtar sunucuda sınanır; başarıda alan temizlenir (anahtar panelde tutulmaz). */
    connectWithKey(provider: string): void {
        const key = this.apiKey.trim();

        if (!key) {
            return;
        }

        this.run(
            this.service.connectWithCredentials(this.clinicId(), provider, key),
            (c) => {
                this.closeKeyForm();
                this.setConnection(c);
                this.messages.add({ severity: c.lastVerificationOk === false ? 'warn' : 'success', summary: 'Entegratör bağlandı', detail: c.lastVerificationMessage ?? undefined, life: 5000 });
            },
            'Entegratör bağlanamadı.'
        );
    }

    closeKeyForm(): void {
        this.apiKey = '';
        this.keyFormOpen.set(false);
    }

    selectAccount(): void {
        if (this.selectedAccount) {
            this.run(this.service.selectAccount(this.clinicId(), this.selectedAccount), (c) => this.setConnection(c), 'Firma bağlanamadı.');
        }
    }

    verify(): void {
        this.run(
            this.service.verify(this.clinicId()),
            (c) => {
                this.setConnection(c);
                this.messages.add({ severity: c.lastVerificationOk ? 'success' : 'warn', summary: 'Bağlantı sınandı', detail: c.lastVerificationMessage ?? undefined, life: 5000 });
            },
            'Bağlantı sınanamadı.'
        );
    }

    disconnect(): void {
        this.run(this.service.disconnect(this.clinicId()), () => this.load(), 'Bağlantı koparılamadı.');
    }

    private setConnection(c: EDocumentConnectionDto): void {
        this.connection.set(c);
        this.selectedProvider ??= c.provider ?? c.availableProviders.find((p) => p.configured)?.provider ?? null;
        this.loading.set(false);
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
