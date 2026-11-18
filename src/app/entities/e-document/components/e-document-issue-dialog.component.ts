import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DialogFocusReturnDirective } from '@/app/shared/ui/dialog/dialog-focus-return.directive';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { EDocumentDto, EDocumentPreviewDto, EDocumentPreviewGroupDto, EDocumentSetupIssueCode, EDocumentSource } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import {
    E_DOCUMENT_SETUP_ISSUE,
    E_DOCUMENT_SETUP_ORDER,
    eDocumentSetupDoneValue,
    eDocumentStatusLabel,
    eDocumentStatusSeverity,
    eDocumentTypeLabel,
    isEDocumentPending
} from '@/app/entities/e-document/utils/e-document-labels';
import { E_DOCUMENT_RETURN_PARAM, storeEDocumentResume, withoutEDocumentResumeParam } from '@/app/entities/e-document/utils/e-document-resume';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { triggerBlobDownload } from '@/app/shared/utils/file-download.utils';

interface GroupState {
    group: EDocumentPreviewGroupDto;
    /** Grup başına bir kez üretilir; tekrar tıklamada aynı değer gider (çift belge oluşmaz). */
    requestId: string;
    busy: boolean;
    error: string | null;
    document: EDocumentDto | null;
}

/**
 * "Belge kes" diyaloğu (ADR-036 AK-4): seçim (ücretler / satış / ziyaret) önizlenir, alıcı ve eksik alanlar gösterilir,
 * belge türüne ayrılan her grup ayrı kesilir (e-SMM ve fatura tek belgede birleşmez). Belge türü backend kuralındadır. Klinik ayarı
 * eksikse (mükellef türü, entegratör bağlantısı) önizleme yerine hazırlık listesi çıkar; düğme ayar sayfasına götürür ve seçim
 * dönüşte geri yüklenir (`e-document-resume`).
 */
@Component({
    selector: 'app-e-document-issue-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterLink, ButtonModule, DialogModule, DialogFocusReturnDirective, InputTextModule, AppStatusTagComponent, AppLoadingStateComponent, MoneyPipe],
    template: `
        <p-dialog [header]="header()" [modal]="true" [dismissableMask]="!busy() && !note.trim()" [style]="{ width: 'min(560px, 95vw)' }" [(visible)]="visible" (onShow)="load()" (onHide)="onHide()">
            @if (loading()) {
                <app-loading-state message="Belge hazırlanıyor…" />
            } @else if (loadError()) {
                <p class="text-danger m-0" role="alert">{{ loadError() }}</p>
            } @else if (preview(); as p) {
                @if (setupIssues().length > 0) {
                    <div class="flex flex-col gap-4" data-testid="e-document-setup">
                        <div class="edoc-lead">
                            <span class="edoc-lead__icon" aria-hidden="true"><i class="pi pi-list-check"></i></span>
                            <div>
                                <h3 class="edoc-lead__title">Belge kesmeden önce {{ setupIssues().length === 1 ? 'bir ayar' : setupIssues().length + ' ayar' }} gerekli</h3>
                                <p class="m-0 text-sm text-muted-color">
                                    {{ setupIssues().length === 1 ? 'Bu, kliniğin bir kerelik ayarı' : 'Bunlar kliniğin bir kerelik ayarları' }}; tamamlandıktan sonra bir daha sorulmaz. Seçtiğiniz
                                    ücretler belgesiz olarak bekler, bir şey kaybolmaz.
                                </p>
                            </div>
                        </div>
                        <ul class="edoc-checklist" data-testid="e-document-setup-list">
                            @for (item of setupItems(); track item.code) {
                                @if (item.missingIndex !== null) {
                                    <li [attr.data-testid]="'e-document-setup-' + item.code">
                                        <span class="edoc-checklist__num" aria-hidden="true">{{ item.missingIndex + 1 }}</span>
                                        <div class="min-w-0">
                                            <div class="font-medium">{{ item.info.title }}</div>
                                            <div class="text-sm text-muted-color">{{ item.info.reason }}</div>
                                        </div>
                                        @if (canFixSetup) {
                                            <button pButton type="button" size="small" severity="secondary" [outlined]="true" (click)="openSetup(item.code)" [attr.aria-label]="item.info.action">
                                                Aç<i class="p-button-icon p-button-icon-right pi pi-angle-right"></i>
                                            </button>
                                        }
                                    </li>
                                } @else {
                                    <li class="edoc-checklist__done" [attr.data-testid]="'e-document-setup-done-' + item.code">
                                        <span class="edoc-checklist__ok" aria-hidden="true"><i class="pi pi-check"></i></span>
                                        <div class="min-w-0 text-muted-color">{{ item.info.title }}</div>
                                        <span class="text-sm text-muted-color">{{ item.doneValue }}</span>
                                    </li>
                                }
                            }
                        </ul>
                        @if (!canFixSetup) {
                            <div class="edoc-note" data-testid="e-document-setup-locked">
                                <i class="pi pi-lock" aria-hidden="true"></i>
                                <span>
                                    {{ setupIssues().length === 1 ? 'Bu ayarı' : 'Bu ayarları' }} klinik ayarlarını düzenleme yetkisi olan biri tamamlayabilir. Klinik yöneticinize
                                    <strong>“{{ missingTitles() }}”</strong> eksik deyin; tamamlanınca buradan belgeyi kesebilirsiniz.
                                </span>
                            </div>
                        }
                    </div>
                } @else {
                    <div class="flex flex-col gap-4" data-testid="e-document-issue">
                        @if (p.connection.environment === 'Test') {
                            <div class="edoc-note" data-testid="e-document-test-env">
                                <i class="pi pi-info-circle" aria-hidden="true"></i>
                                <span>Test ortamı: kesilen belge gerçek değildir.</span>
                            </div>
                        }
    
                        <section aria-label="Alıcı">
                            <div class="text-sm text-muted-color mb-1">Alıcı</div>
                            @if (p.buyer; as b) {
                                <div class="font-medium">{{ b.name }}</div>
                                <div class="text-sm text-muted-color">
                                    {{ b.kind === 'Corporate' ? 'VKN' : 'TCKN' }} {{ b.identityMasked }}
                                    @if (b.isUnknownBuyer) {
                                        · kimlik verilmedi (nihai tüketici)
                                    }
                                    @if (b.taxOffice) {
                                        · {{ b.taxOffice }}
                                    }
                                </div>
                            } @else {
                                <div class="edoc-note edoc-note--warn" role="alert" data-testid="e-document-missing-buyer">
                                    <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
                                    <span>
                                        {{ missingBuyerText(p.missingBuyerFields) }}
                                        <a [routerLink]="['/panel/clients', p.clientId, 'edit']" (click)="visible.set(false)">Fatura bilgilerini tamamlayın</a>.
                                    </span>
                                </div>
                            }
                        </section>
    
                        @if (p.skipped.length > 0) {
                            <p class="text-sm text-muted-color m-0" role="status">{{ p.skipped.length }} ücret zaten belgeli veya iptal edilmiş; bu belgeye girmez.</p>
                        }
    
                        @if (groups().length === 0) {
                            <p class="m-0 text-muted-color" data-testid="e-document-nothing">Belgesi kesilecek ücret yok.</p>
                        } @else {
                            @if (groups().length > 1) {
                                <p class="text-sm m-0">Seçim iki belge türüne ayrılıyor; her belgeyi ayrı kesin.</p>
                            }
                            <ul class="edoc-groups" data-testid="e-document-groups">
                                @for (g of groups(); track g.requestId) {
                                    <li class="edoc-group">
                                        <div class="min-w-0">
                                            <div class="font-medium">{{ typeLabel(g.group.documentType) }}</div>
                                            <div class="text-sm text-muted-color">{{ g.group.lineCount }} kalem · {{ g.group.totalAmount | money: 'TRY' }}</div>
                                            @if (g.document; as d) {
                                                @if (d.documentNumber) {
                                                    <div class="text-sm">No: {{ d.documentNumber }}</div>
                                                }
                                                @if (d.lastError) {
                                                    <div class="text-sm text-danger" role="alert">{{ d.lastError.message }}</div>
                                                }
                                            }
                                            @if (g.error) {
                                                <div class="text-sm text-danger" role="alert">{{ g.error }}</div>
                                            }
                                        </div>
                                        <div class="flex items-center gap-2 shrink-0">
                                            @if (g.document; as d) {
                                                <app-status-tag [label]="statusLabel(d.status)" [severity]="statusSeverity(d.status)" />
                                                @if (pending(d.status)) {
                                                    <button pButton type="button" size="small" [text]="true" [disabled]="g.busy" (click)="refresh(g)" aria-label="Durumu yenile"><i class="p-button-icon pi pi-refresh" [class.pi-spin]="g.busy"></i></button>
                                                }
                                                @if (d.canDownloadPdf) {
                                                    <button pButton type="button" size="small" severity="secondary" [outlined]="true" [disabled]="g.busy" (click)="downloadPdf(g)"><i class="p-button-icon pi pi-file-pdf"></i>PDF</button>
                                                }
                                            } @else {
                                                <button pButton type="button" size="small" [disabled]="!canIssue(p) || g.busy" (click)="issue(g)" [attr.data-testid]="'e-document-issue-' + g.group.documentType">
                                                    <i class="p-button-icon" [class]="g.busy ? 'pi pi-spin pi-spinner' : 'pi pi-send'"></i>Kes
                                                </button>
                                            }
                                        </div>
                                    </li>
                                }
                            </ul>
    
                            <div>
                                <label for="edocNote" class="block text-sm font-medium text-muted-color mb-1">Belge notu (isteğe bağlı)</label>
                                <input id="edocNote" pInputText class="w-full" [(ngModel)]="note" maxlength="500" [disabled]="anyIssued()" />
                            </div>
                        }
                    </div>
                }
            }
            <ng-template #footer>
                @if (setupIssues().length > 0) {
                    <span class="mr-auto self-center text-sm text-muted-color" data-testid="e-document-setup-progress">{{ setupReadyCount() }} / {{ setupOrder.length }} hazır</span>
                }
                <button pButton type="button" severity="secondary" [text]="true" (click)="visible.set(false)">Kapat</button>
                @if (canFixSetup && setupIssues()[0]; as first) {
                    <button pButton type="button" (click)="openSetup(first.code)" data-testid="e-document-setup-primary">
                        <i class="p-button-icon pi pi-arrow-right"></i>{{ setupInfo[first.code].action }}
                    </button>
                }
            </ng-template>
        </p-dialog>
    `,
    styles: `
        .edoc-note {
            display: flex;
            gap: 0.5rem;
            align-items: flex-start;
            padding: 0.5rem 0.75rem;
            border-radius: var(--p-border-radius-md, 6px);
            background: var(--p-surface-100, #f3f4f6);
            font-size: 0.875rem;
        }
        :host-context(.app-dark) .edoc-note {
            background: var(--p-surface-800, #27272a);
        }
        .edoc-note--warn {
            background: color-mix(in srgb, var(--p-amber-400, #fbbf24) 18%, transparent);
        }
        .edoc-note i {
            margin-top: 0.15rem;
        }
        .edoc-lead {
            display: flex;
            gap: 0.75rem;
            align-items: flex-start;
        }
        .edoc-lead__icon {
            flex: none;
            display: grid;
            place-items: center;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
            color: var(--p-primary-color);
        }
        .edoc-lead__title {
            margin: 0.125rem 0 0.25rem;
            font-size: 1rem;
            font-weight: 600;
        }
        .edoc-checklist {
            list-style: none;
            margin: 0;
            padding: 0;
            border: 1px solid var(--p-content-border-color, #e5e7eb);
            border-radius: var(--p-border-radius-md, 6px);
        }
        .edoc-checklist li {
            display: grid;
            grid-template-columns: 1.75rem 1fr auto;
            gap: 0.625rem;
            align-items: center;
            padding: 0.75rem 0.875rem;
        }
        .edoc-checklist li + li {
            border-top: 1px solid var(--p-content-border-color, #e5e7eb);
        }
        .edoc-checklist__num,
        .edoc-checklist__ok {
            display: grid;
            place-items: center;
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 50%;
            font-size: 0.75rem;
            font-weight: 700;
        }
        .edoc-checklist__num {
            border: 1.5px solid var(--p-primary-color);
            color: var(--p-primary-color);
        }
        .edoc-checklist__ok {
            background: color-mix(in srgb, var(--p-green-500, #22c55e) 16%, transparent);
            color: var(--p-green-600, #16a34a);
        }
        .edoc-groups {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .edoc-group {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border: 1px solid var(--p-content-border-color, #e5e7eb);
            border-radius: var(--p-border-radius-md, 6px);
        }
    `
})
export class EDocumentIssueDialogComponent {
    readonly visible = model(false);
    readonly source = input<EDocumentSource | null>(null);
    readonly header = input('e-Belge kes');
    /** Belge kesildi veya durumu değişti; liste yenilensin. */
    readonly changed = output<EDocumentDto>();

    private readonly service = inject(EDocumentsService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly loading = signal(false);
    /** Yalnız ağ / sunucu hatası; eksik klinik ayarı hazırlık listesinde gösterilir. */
    readonly loadError = signal<string | null>(null);
    readonly preview = signal<EDocumentPreviewDto | null>(null);
    readonly groups = signal<GroupState[]>([]);
    readonly setupIssues = computed(() => this.preview()?.clinicSetupIssues ?? []);
    /** Hazırlık listesi: eksikler numaralı (backend sırası), tamam olanlar değeriyle. */
    readonly setupItems = computed(() => {
        const p = this.preview();
        const missing = this.setupIssues().map((i) => i.code);

        return p
            ? E_DOCUMENT_SETUP_ORDER.map((code) => ({
                  code,
                  info: E_DOCUMENT_SETUP_ISSUE[code],
                  missingIndex: missing.includes(code) ? missing.indexOf(code) : null,
                  doneValue: missing.includes(code) ? '' : eDocumentSetupDoneValue(code, p)
              }))
            : [];
    });
    readonly setupReadyCount = computed(() => E_DOCUMENT_SETUP_ORDER.length - this.setupIssues().length);
    readonly missingTitles = computed(() => this.setupIssues().map((i) => E_DOCUMENT_SETUP_ISSUE[i.code].title).join(', '));
    /** Ayar sayfaları (klinik mükellef bilgileri, Ayarlar › e-Belge) bu yetkiyle açılır; yoksa düğme yerine not. */
    readonly canFixSetup = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    protected readonly setupInfo = E_DOCUMENT_SETUP_ISSUE;
    protected readonly setupOrder = E_DOCUMENT_SETUP_ORDER;
    readonly anyIssued = computed(() => this.groups().some((g) => g.document !== null));
    /** Belge kesilirken ya da not yazılmışken dışarı tıklama diyaloğu kapatmaz. */
    readonly busy = computed(() => this.groups().some((g) => g.busy));

    note = '';

    protected readonly typeLabel = eDocumentTypeLabel;
    protected readonly statusLabel = eDocumentStatusLabel;
    protected readonly statusSeverity = eDocumentStatusSeverity;
    protected readonly pending = isEDocumentPending;

    /** Eksik alıcı alanı: bireyselde ad + soyad, kurumsalda vergi numarası (kural backend'de). */
    missingBuyerText(missing: string[]): string {
        return missing.includes('fullName') ? 'Müşterinin adı ve soyadı birlikte yazılmamış.' : 'Kurumsal müşterinin vergi numarası eksik.';
    }

    canIssue(p: EDocumentPreviewDto): boolean {
        return p.clinicSetupIssues.length === 0 && p.buyer !== null;
    }

    /** Eksik ayarın sayfasına gider; seçim saklanır, ayar sayfası "dön" şeridiyle buraya geri getirir. */
    openSetup(code: EDocumentSetupIssueCode): void {
        const source = this.source();
        const returnTo = withoutEDocumentResumeParam(this.router, this.router.url);
        const info = E_DOCUMENT_SETUP_ISSUE[code];

        if (source) {
            storeEDocumentResume(source, returnTo);
        }

        this.visible.set(false);
        void this.router.navigate(info.route(this.auth.getClinicId()), { fragment: info.fragment, queryParams: { [E_DOCUMENT_RETURN_PARAM]: returnTo } });
    }

    load(): void {
        const source = this.source();

        if (!source) {
            return;
        }

        this.loading.set(true);
        this.loadError.set(null);
        this.preview.set(null);
        this.groups.set([]);
        this.note = '';
        this.service.preview(source).subscribe({
            next: (p) => {
                this.preview.set(p);
                this.groups.set(p.groups.map((group) => ({ group, requestId: crypto.randomUUID(), busy: false, error: null, document: null })));
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Belge önizlemesi alınamadı.'));
                this.loading.set(false);
            }
        });
    }

    issue(state: GroupState): void {
        this.patch(state, { busy: true, error: null });
        // Satış kaynağında satış kimliği gider (belge satışa bağlanır); diğerlerinde grubun ücretleri.
        const saleId = this.source()?.saleId;
        const source = saleId ? { saleId } : { chargeIds: state.group.chargeIds };

        this.service.issue(source, state.requestId, this.note).subscribe({
            next: (document) => {
                this.patch(state, { busy: false, document });
                this.changed.emit(document);
            },
            error: (e: unknown) => this.patch(state, { busy: false, error: issueErrorMessage(e) })
        });
    }

    refresh(state: GroupState): void {
        const id = state.document?.id;

        if (!id) {
            return;
        }

        this.patch(state, { busy: true, error: null });
        this.service.refresh(id).subscribe({
            next: (document) => {
                this.patch(state, { busy: false, document });
                this.changed.emit(document);
            },
            error: (e: unknown) => this.patch(state, { busy: false, error: panelHttpFailureMessage(e, 'Durum alınamadı.') })
        });
    }

    downloadPdf(state: GroupState): void {
        const id = state.document?.id;

        if (!id) {
            return;
        }

        this.patch(state, { busy: true, error: null });
        this.service.pdf(id).subscribe({
            next: ({ blob, fileName }) => {
                this.patch(state, { busy: false });
                triggerBlobDownload(blob, fileName);
            },
            error: (e: unknown) => this.patch(state, { busy: false, error: panelHttpFailureMessage(e, 'PDF alınamadı.') })
        });
    }

    onHide(): void {
        this.preview.set(null);
        this.groups.set([]);
    }

    private patch(state: GroupState, changes: Partial<GroupState>): void {
        this.groups.update((list) => list.map((g) => (g.requestId === state.requestId ? { ...g, ...changes } : g)));
    }
}

/** Eksik alıcı alanı (`missingFields`) ve bağlantı hatası Türkçe ve eyleme dönük gösterilir. */
export function issueErrorMessage(e: unknown): string {
    if (e instanceof HttpErrorResponse && Array.isArray(e.error?.missingFields) && e.error.missingFields.length > 0) {
        return e.error.missingFields.includes('fullName')
            ? 'Müşterinin adı ve soyadı birlikte yazılmamış; müşteri adını düzeltip tekrar deneyin.'
            : 'Müşterinin fatura bilgileri eksik (vergi numarası); müşteri kaydını tamamlayıp tekrar deneyin.';
    }

    return panelHttpFailureMessage(e, 'Belge kesilemedi.');
}
