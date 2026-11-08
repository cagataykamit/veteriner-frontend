import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { ApiClient } from '@/app/core/api/api.client';
import { SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ApiKeyDto, ApiKeyListDto, CreatedApiKeyDto } from '@/app/entities/api-key/models/api-key.model';
import { ApiKeysService } from '@/app/entities/api-key/services/api-keys.service';
import { apiKeyScopeLabel, maskedApiKey } from '@/app/entities/api-key/utils/api-key-labels.utils';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

const NAME_MAX = 100;

/**
 * Ayarlar > API erişimi (TIER-009, `EXTERNAL_API_CONTRACT.md` §6): kiracıya özel dış API anahtarı oluşturma, listeleme ve iptal.
 * Açık anahtar yalnız oluşturma yanıtında gelir; ekranda bir kez gösterilir, hiçbir yerde saklanmaz. Oluşturma Kurumsal ister; paket
 * düşmüşse mevcut anahtarlar listede kalır ve iptal edilebilir (iptal salt okunur abonelikte de açıktır).
 */
@Component({
    selector: 'app-api-access-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ButtonModule,
        CheckboxModule,
        ConfirmDialogModule,
        InputTextModule,
        MessageModule,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppPlanUpgradeNoticeComponent,
        AppStatusTagComponent
    ],
    providers: [ConfirmationService],
    template: `
        <app-page-header
            [categoryLink]="settingsRoute"
            categoryLinkLabel="Ayarlar"
            title="API erişimi"
            description="Kendi yazılımınızın müşteri, hayvan, randevu ve aşı listelerini okuması için kliniğinize özel anahtar. Anahtar yalnız okur; kayıt değiştiremez."
        />

        @if (planLocked()) {
            <section class="card mb-4" data-testid="api-access-locked">
                <app-plan-upgrade-notice
                    feature="ExternalApi"
                    [detail]="hasKeys() ? 'Mevcut anahtarlar silinmedi ama istekleri reddedilir; listede kalır ve iptal edilebilir.' : 'Kendi yazılımınız müşteri, hayvan, randevu ve aşı listelerini kliniğe özel anahtarla okur.'"
                />
            </section>
        }

        @if (revealed(); as r) {
            <section class="card mb-4 border border-amber-400" aria-labelledby="revealedTitle" data-testid="api-key-revealed">
                <h5 id="revealedTitle" class="mt-0">Yeni anahtar: {{ r.key.name }}</h5>
                <p-message severity="warn" class="w-full mb-3" role="alert">Bu anahtar bir daha gösterilmeyecek. Şimdi kopyalayıp güvenli bir yere saklayın; kaybederseniz iptal edip yenisini oluşturun.</p-message>
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <input pInputText readonly class="flex-1 min-w-0 font-mono" [value]="r.plainTextKey" aria-label="API anahtarı" (focus)="selectAll($event)" data-testid="api-key-plain" />
                    <button pButton type="button" severity="secondary" (click)="copyKey(r.plainTextKey)" data-testid="api-key-copy"><i class="pi pi-copy"></i>{{ copied() ? 'Kopyalandı' : 'Kopyala' }}</button>
                </div>
                <button pButton type="button" (click)="dismissRevealed()" data-testid="api-key-dismiss"><i class="pi pi-check"></i>Kaydettim, kapat</button>
            </section>
        }

        @if (loading()) {
            <app-loading-state message="Anahtarlar yükleniyor…" />
        } @else if (error(); as err) {
            <app-error-state [detail]="err" (retry)="reload()" />
        } @else if (data(); as d) {
            <div class="grid grid-cols-12 gap-4">
                @if (!planLocked()) {
                    <section class="card col-span-12 lg:col-span-5 mb-0" aria-labelledby="newKeyTitle">
                        <h5 id="newKeyTitle" class="mt-0">Yeni anahtar</h5>
                        @if (ro.mutationBlocked()) {
                            <p class="m-0 text-sm text-amber-700 dark:text-amber-300" role="status">Abonelik durumu nedeniyle yeni anahtar oluşturulamaz.</p>
                        } @else if (activeCount() >= d.maxActiveKeys) {
                            <p class="m-0 text-sm text-muted-color" role="status">En fazla {{ d.maxActiveKeys }} etkin anahtar olabilir; kullanılmayan bir anahtarı iptal edin.</p>
                        } @else {
                            <form class="flex flex-col gap-3" (ngSubmit)="create()">
                                <div class="flex flex-col gap-1">
                                    <label for="apiKeyName" class="text-sm font-medium">Ad</label>
                                    <input id="apiKeyName" name="apiKeyName" pInputText [maxlength]="nameMax" [ngModel]="name()" (ngModelChange)="name.set($event)" placeholder="Örn. Muhasebe aktarımı" data-testid="api-key-name" />
                                    <small class="text-muted-color">Anahtarı hangi yazılımın kullandığını tanımak için.</small>
                                </div>
                                <fieldset class="flex flex-col gap-2 border-0 p-0 m-0">
                                    <legend class="text-sm font-medium mb-1">Okuyabileceği kayıtlar</legend>
                                    @for (scope of d.availableScopes; track scope) {
                                        <div class="flex items-center gap-2">
                                            <p-checkbox [inputId]="'scope-' + scope" [binary]="true" [ngModel]="selected().has(scope)" [ngModelOptions]="{ standalone: true }" (ngModelChange)="toggleScope(scope, $event)" />
                                            <label [for]="'scope-' + scope">{{ scopeLabel(scope) }}</label>
                                        </div>
                                    }
                                    <small class="text-muted-color">Yalnız gerekeni seçin. Kimlik ve vergi numarası, adres, notlar ve muayene içeriği hiçbir kapsamla verilmez.</small>
                                </fieldset>
                                @if (createError(); as m) {
                                    <p-message severity="error" class="w-full" role="alert">{{ m }}</p-message>
                                }
                                <div>
                                    <button pButton type="submit" [disabled]="!canSubmit()" data-testid="api-key-create"><i class="pi pi-key"></i>Anahtar oluştur</button>
                                </div>
                            </form>
                        }
                    </section>
                }

                <section [class]="planLocked() ? 'card col-span-12 mb-0' : 'card col-span-12 lg:col-span-7 mb-0'" aria-labelledby="keysTitle">
                    <h5 id="keysTitle" class="mt-0">Anahtarlar</h5>
                    @if (listMessage(); as m) {
                        <p-message [severity]="m.severity" class="w-full mb-3" role="status">{{ m.text }}</p-message>
                    }
                    @if (d.items.length === 0) {
                        <p class="m-0 text-sm text-muted-color" data-testid="api-keys-empty">Henüz anahtar yok.</p>
                    } @else {
                        <div class="overflow-x-auto table-stack-phone">
                            <p-table [value]="items()" [tableStyle]="{ 'min-width': '40rem' }" data-testid="api-keys-table">
                                <ng-template #header>
                                    <tr>
                                        <th>Ad</th>
                                        <th>Kapsam</th>
                                        <th>Oluşturma</th>
                                        <th>Son kullanım</th>
                                        <th>Durum</th>
                                        <th><span class="sr-only">İşlem</span></th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-k>
                                    <tr data-testid="api-key-row">
                                        <td data-label="Ad">
                                            <div class="font-medium">{{ k.name }}</div>
                                            <small class="text-muted-color font-mono">{{ masked(k.prefix) }}</small>
                                        </td>
                                        <td data-label="Kapsam">{{ scopesText(k) }}</td>
                                        <td data-label="Oluşturma">
                                            <div>{{ fmt(k.createdAtUtc) }}</div>
                                            @if (k.createdByName) {
                                                <small class="text-muted-color">{{ k.createdByName }}</small>
                                            }
                                        </td>
                                        <td data-label="Son kullanım">{{ k.lastUsedAtUtc ? fmt(k.lastUsedAtUtc) : 'Kullanılmadı' }}</td>
                                        <td data-label="Durum">
                                            @if (k.isRevoked) {
                                                <app-status-tag label="İptal edildi" severity="secondary" />
                                                @if (k.revokedAtUtc) {
                                                    <small class="block text-muted-color">{{ fmt(k.revokedAtUtc) }}{{ k.revokedByName ? ' · ' + k.revokedByName : '' }}</small>
                                                }
                                            } @else {
                                                <app-status-tag label="Etkin" severity="success" />
                                            }
                                        </td>
                                        <td>
                                            @if (!k.isRevoked) {
                                                <button pButton type="button" severity="danger" [outlined]="true" class="p-button-sm" [disabled]="revoking()" (click)="confirmRevoke(k)" data-testid="api-key-revoke">
                                                    <i class="pi pi-ban"></i>İptal et
                                                </button>
                                            }
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    }
                </section>

                <section class="card col-span-12 mb-0" aria-labelledby="usageTitle">
                    <h5 id="usageTitle" class="mt-0">Kullanım</h5>
                    <ul class="m-0 pl-5 text-sm flex flex-col gap-1">
                        <li>Adres: <span class="font-mono" data-testid="api-base-url">{{ externalBaseUrl }}</span> altında <span class="font-mono">clients</span>, <span class="font-mono">pets</span>, <span class="font-mono">appointments</span>, <span class="font-mono">vaccinations</span>.</li>
                        <li>Anahtar <span class="font-mono">X-Api-Key</span> başlığıyla gönderilir; adrese yazılmaz. Panel oturumu bu adreste geçmez.</li>
                        <li>Listeler sayfalıdır (en çok 200 kayıt); <span class="font-mono">updatedSince</span> ile yalnız değişenler alınır. Anahtar başına dakikada 60 istek.</li>
                        <li>Anahtar sızdıysa hemen iptal edin; iptal geri alınmaz.</li>
                    </ul>
                </section>
            </div>
        }

        <p-confirmdialog [style]="{ width: 'min(480px, 95vw)' }" />
    `
})
export class ApiAccessPageComponent implements OnInit {
    readonly settingsRoute = SETTINGS_ROUTE;
    readonly nameMax = NAME_MAX;

    private readonly service = inject(ApiKeysService);
    private readonly confirmation = inject(ConfirmationService);
    readonly ro = inject(TenantReadOnlyContextService);
    readonly externalBaseUrl = inject(ApiClient).absoluteUrl('/api/external/v1');

    readonly data = signal<ApiKeyListDto | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly name = signal('');
    readonly selected = signal<ReadonlySet<string>>(new Set());
    readonly saving = signal(false);
    readonly revoking = signal(false);
    readonly createError = signal<string | null>(null);
    readonly listMessage = signal<{ text: string; severity: 'success' | 'error' } | null>(null);
    /** Yalnız bellekte; kapatılınca ya da sayfadan çıkınca kaybolur. */
    readonly revealed = signal<CreatedApiKeyDto | null>(null);
    readonly copied = signal(false);

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('ExternalApi') !== null);
    readonly items = computed(() => [...(this.data()?.items ?? [])]);
    readonly hasKeys = computed(() => this.items().length > 0);
    readonly activeCount = computed(() => this.items().filter((k) => !k.isRevoked).length);
    readonly canSubmit = computed(() => !this.saving() && this.name().trim().length > 0 && this.selected().size > 0);

    scopeLabel = apiKeyScopeLabel;
    masked = maskedApiKey;
    fmt = (utc: string) => formatDateTimeDisplay(utc);

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.service.list().subscribe({
            next: (d) => {
                this.data.set(d);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.error.set(panelHttpFailureMessage(err, 'API anahtarları yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    toggleScope(scope: string, on: boolean): void {
        const next = new Set(this.selected());

        if (on) {
            next.add(scope);
        } else {
            next.delete(scope);
        }

        this.selected.set(next);
    }

    scopesText(key: ApiKeyDto): string {
        return key.scopes.map(apiKeyScopeLabel).join(', ');
    }

    create(): void {
        if (!this.canSubmit()) {
            return;
        }

        const order = this.data()?.availableScopes ?? [];
        const scopes = order.filter((s) => this.selected().has(s));

        this.saving.set(true);
        this.createError.set(null);
        this.listMessage.set(null);
        this.service.create(this.name().trim(), scopes).subscribe({
            next: (created) => {
                this.saving.set(false);
                this.copied.set(false);
                this.revealed.set(created);
                this.name.set('');
                this.selected.set(new Set());
                this.reload();
            },
            error: (err: unknown) => {
                this.saving.set(false);
                this.createError.set(panelHttpFailureMessage(err, 'Anahtar oluşturulamadı.'));
            }
        });
    }

    copyKey(key: string): void {
        void navigator.clipboard?.writeText(key).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        });
    }

    selectAll(event: FocusEvent): void {
        (event.target as HTMLInputElement | null)?.select();
    }

    dismissRevealed(): void {
        this.revealed.set(null);
        this.copied.set(false);
    }

    confirmRevoke(key: ApiKeyDto): void {
        this.confirmation.confirm({
            header: 'Anahtarı iptal et',
            message: `"${key.name}" anahtarıyla gelen istekler hemen reddedilir. İptal geri alınmaz; gerekirse yeni anahtar oluşturursunuz.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'İptal et',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.revoke(key)
        });
    }

    private revoke(key: ApiKeyDto): void {
        this.revoking.set(true);
        this.listMessage.set(null);
        this.service.revoke(key.id).subscribe({
            next: () => {
                this.revoking.set(false);

                if (this.revealed()?.key.id === key.id) {
                    this.dismissRevealed();
                }

                this.listMessage.set({ text: `"${key.name}" iptal edildi.`, severity: 'success' });
                this.reload();
            },
            error: (err: unknown) => {
                this.revoking.set(false);
                this.listMessage.set({ text: panelHttpFailureMessage(err, 'Anahtar iptal edilemedi.'), severity: 'error' });
            }
        });
    }
}
