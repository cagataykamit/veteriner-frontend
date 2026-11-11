import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import type { TableLazyLoadEvent } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { EDOCUMENTS_CANCEL_CLAIM, EDOCUMENTS_ISSUE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { EDocumentIssueDialogComponent } from '@/app/entities/e-document/components/e-document-issue-dialog.component';
import type { EDocumentListItemDto, EDocumentSource, EDocumentStatus, EDocumentType, UndocumentedChargeDto } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import {
    EDOCUMENT_STATUS_FILTER_OPTIONS,
    EDOCUMENT_TYPE_FILTER_OPTIONS,
    eDocumentOriginLabel,
    eDocumentStatusLabel,
    eDocumentStatusSeverity,
    eDocumentTypeLabel,
    isEDocumentPending
} from '@/app/entities/e-document/utils/e-document-labels';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { triggerBlobDownload } from '@/app/shared/utils/file-download.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

type View = 'documents' | 'undocumented';

/**
 * e-belgeler (ADR-036 Dilim 4): kesilen belgeler (durum, PDF, yenile, yeniden dene, vazgeç, iptal) ve AK-4 "belgesi
 * kesilmemiş ücretler" listesi (aynı müşterinin ücretleri seçilip tek seferde kesilir).
 */
@Component({
    selector: 'app-e-documents-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        CheckboxModule,
        SelectModule,
        SelectButtonModule,
        TableModule,
        ToastModule,
        ClientSearchComponent,
        EDocumentIssueDialogComponent,
        ReasonConfirmDialogComponent,
        AppListHeaderComponent,
        FilterFieldComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        MoneyPipe,
        TrDateTimePipe
    ],
    template: `
        <p-toast position="top-right" />
        <div class="card">
            <app-list-header class="mb-4" title="e-Belgeler" [count]="total()">
                <app-filter-field label="Müşteri" labelFor="edocClientFilter" [active]="!!clientId">
                    <app-client-search inputId="edocClientFilter" placeholder="Müşteri ara…" [ngModel]="clientId" (ngModelChange)="onClientChange($event)" />
                </app-filter-field>
                @if (view() === 'documents') {
                    <app-filter-field label="Durum" labelFor="edocStatus" [active]="!!status">
                        <p-select inputId="edocStatus" [options]="statusOptions" optionLabel="label" optionValue="value" [(ngModel)]="status" [showClear]="true" placeholder="Tümü" (onChange)="load(1)" />
                    </app-filter-field>
                    <app-filter-field label="Tür" labelFor="edocType" [active]="!!documentType">
                        <p-select inputId="edocType" [options]="typeOptions" optionLabel="label" optionValue="value" [(ngModel)]="documentType" [showClear]="true" placeholder="Tümü" (onChange)="load(1)" />
                    </app-filter-field>
                } @else if (canIssue && !ro.mutationBlocked()) {
                    <button actions pButton type="button" [disabled]="!selectionValid()" (click)="openIssueForSelection()" data-testid="edoc-issue-selected">
                        <i class="p-button-icon pi pi-send"></i>Seçilenlere belge kes ({{ selected().length }})
                    </button>
                }
            </app-list-header>

            <div class="mb-4">
                <p-selectbutton [options]="viewOptions" optionLabel="label" optionValue="value" [ngModel]="view()" (ngModelChange)="setView($event)" [allowEmpty]="false" ariaLabelledBy="edocViewLabel" />
                <span id="edocViewLabel" class="sr-only">Görünüm</span>
            </div>

            @if (view() === 'undocumented' && selected().length > 0 && !selectionValid()) {
                <p class="text-sm text-danger mt-0" role="alert">Tek belgede yalnız aynı müşterinin ücretleri olabilir.</p>
            }

            @if (error()) {
                <app-error-state [detail]="error()!" (retry)="load(page())" />
            } @else if (loading() && total() === 0) {
                <app-loading-state message="Yükleniyor…" />
            } @else if (view() === 'documents') {
                @if (documents().length === 0) {
                    <app-empty-state message="Henüz e-belge yok." hint="Ücret listesinden, satıştan veya 'Belgesiz ücretler' görünümünden belge kesebilirsiniz." />
                } @else {
                    <div class="overflow-x-auto table-stack-phone">
                        <p-table size="small" [value]="documents()" [lazy]="true" [paginator]="true" [rows]="pageSize" [first]="(page() - 1) * pageSize" [totalRecords]="total()" [loading]="loading()" (onLazyLoad)="onLazyLoad($event)" [tableStyle]="{ 'min-width': '56rem' }">
                            <ng-template #header>
                                <tr class="whitespace-nowrap">
                                    <th>Tarih</th>
                                    <th>Müşteri</th>
                                    <th>Tür</th>
                                    <th>Belge no</th>
                                    <th class="text-right">Tutar</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr [attr.data-testid]="'edoc-row-' + row.id">
                                    <td class="whitespace-nowrap" data-label="Tarih">{{ row.createdAtUtc | trDateTime }}</td>
                                    <td data-label="Müşteri"><a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{ row.clientName }}</a></td>
                                    <td data-label="Tür">
                                        {{ typeLabel(row.documentType) }}
                                        @if (row.isTest) {
                                            <span class="text-xs text-muted-color">(test)</span>
                                        }
                                        @if (originLabel(row.origin); as origin) {
                                            <span class="block text-xs text-muted-color">{{ origin }}</span>
                                        }
                                    </td>
                                    <td data-label="Belge no">{{ row.documentNumber || '—' }}</td>
                                    <td class="text-right whitespace-nowrap font-medium" data-label="Tutar">{{ row.totalAmount | money: 'TRY' }}</td>
                                    <td data-label="Durum">
                                        <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                        @if (row.lastErrorMessage && row.status !== 'Issued') {
                                            <div class="text-xs text-danger mt-1 max-w-[16rem] whitespace-normal">{{ row.lastErrorMessage }}</div>
                                        }
                                    </td>
                                    <td class="whitespace-nowrap">
                                        <div class="flex items-center gap-1 flex-wrap">
                                            @if (pending(row.status)) {
                                                <button pButton type="button" size="small" [text]="true" [disabled]="busyId() === row.id" (click)="act(row, 'refresh')"><i class="p-button-icon pi pi-refresh"></i>Yenile</button>
                                            }
                                            @if (hasPdf(row)) {
                                                <button pButton type="button" size="small" [text]="true" [disabled]="busyId() === row.id" (click)="pdf(row)"><i class="p-button-icon pi pi-file-pdf"></i>PDF</button>
                                            }
                                            @if (!ro.mutationBlocked()) {
                                                @if (canIssue && row.status === 'Failed') {
                                                    <button pButton type="button" size="small" [text]="true" [disabled]="busyId() === row.id" (click)="act(row, 'retry')"><i class="p-button-icon pi pi-replay"></i>Yeniden dene</button>
                                                    <button pButton type="button" size="small" [text]="true" severity="secondary" (click)="openReason(row, 'discard')">Vazgeç</button>
                                                }
                                                @if (canCancel && (row.status === 'Issued' || row.status === 'CancelRejected')) {
                                                    <button pButton type="button" size="small" [text]="true" severity="danger" (click)="openReason(row, 'cancel')">İptal et</button>
                                                }
                                            }
                                        </div>
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            } @else {
                @if (charges().length === 0) {
                    <app-empty-state message="Belgesi kesilmemiş ücret yok." />
                } @else {
                    <div class="overflow-x-auto table-stack-phone">
                        <p-table size="small" [value]="charges()" [lazy]="true" [paginator]="true" [rows]="pageSize" [first]="(page() - 1) * pageSize" [totalRecords]="total()" [loading]="loading()" (onLazyLoad)="onLazyLoad($event)" [tableStyle]="{ 'min-width': '48rem' }">
                            <ng-template #header>
                                <tr class="whitespace-nowrap">
                                    @if (canIssue) {
                                        <th class="w-10"><span class="sr-only">Seç</span></th>
                                    }
                                    <th>Tarih</th>
                                    <th>Müşteri</th>
                                    <th>Hasta</th>
                                    <th>Açıklama</th>
                                    <th class="text-right">Tutar</th>
                                    <th>Durum</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    @if (canIssue) {
                                        <td><p-checkbox [binary]="true" [disabled]="!!row.failedDocumentId" [ngModel]="isSelected(row)" (ngModelChange)="toggle(row, $event)" [inputId]="'edoc-sel-' + row.chargeId" [ariaLabel]="row.description + ' seç'" /></td>
                                    }
                                    <td class="whitespace-nowrap" data-label="Tarih">{{ row.createdAtUtc | trDateTime }}</td>
                                    <td data-label="Müşteri"><a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{ row.clientName }}</a></td>
                                    <td data-label="Hasta">{{ row.petName || '—' }}</td>
                                    <td data-label="Açıklama">
                                        {{ row.description }}
                                        @if (row.saleId) {
                                            <a [routerLink]="['/panel/sales', row.saleId]" class="text-xs ml-1">satış</a>
                                        }
                                    </td>
                                    <td class="text-right whitespace-nowrap font-medium" data-label="Tutar">{{ row.amount | money: 'TRY' }}</td>
                                    <td data-label="Durum">
                                        @if (row.reason) {
                                            <span class="text-sm" [class.text-danger]="!!row.failedDocumentId">{{ row.reason }}</span>
                                        } @else {
                                            <span class="text-sm text-muted-color">Kesilmeye hazır</span>
                                        }
                                        @if (row.failedDocumentId && canIssue && !ro.mutationBlocked()) {
                                            <button pButton type="button" size="small" [text]="true" [disabled]="busyId() === row.failedDocumentId" (click)="retryFailed(row.failedDocumentId)"><i class="p-button-icon pi pi-replay"></i>Yeniden dene</button>
                                        }
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            }
        </div>

        <app-e-document-issue-dialog [(visible)]="issueVisible" [source]="issueSource()" (changed)="load(page())" />
        <app-reason-confirm-dialog
            [(visible)]="reasonVisible"
            [header]="reasonMode() === 'cancel' ? 'e-belgeyi iptal et' : 'Hatalı belgeden vazgeç'"
            [summary]="reasonSummary()"
            [description]="reasonMode() === 'cancel' ? 'Belge entegratörde iptal edilir; ücretler yeniden belgelenebilir. İptal süresi sınırlıdır.' : 'Belge kesilmedi; ücretler yeniden belgelenebilir.'"
            [confirmLabel]="reasonMode() === 'cancel' ? 'Belgeyi iptal et' : 'Vazgeç'"
            failureFallback="İşlem yapılamadı."
            [execute]="reasonAction"
            (confirmed)="load(page())"
        />
    `
})
export class EDocumentsPageComponent implements OnInit {
    private readonly service = inject(EDocumentsService);
    private readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly messages = inject(MessageService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canIssue = this.auth.hasOperationClaim(EDOCUMENTS_ISSUE_CLAIM);
    readonly canCancel = this.auth.hasOperationClaim(EDOCUMENTS_CANCEL_CLAIM);

    protected readonly viewOptions = [
        { label: 'Belgeler', value: 'documents' },
        { label: 'Belgesiz ücretler', value: 'undocumented' }
    ];
    protected readonly statusOptions = EDOCUMENT_STATUS_FILTER_OPTIONS;
    protected readonly typeOptions = EDOCUMENT_TYPE_FILTER_OPTIONS;
    protected readonly typeLabel = eDocumentTypeLabel;
    protected readonly statusLabel = eDocumentStatusLabel;
    protected readonly statusSeverity = eDocumentStatusSeverity;
    protected readonly pending = isEDocumentPending;
    protected readonly originLabel = eDocumentOriginLabel;

    readonly pageSize = 20;
    readonly view = signal<View>('documents');
    readonly page = signal(1);
    readonly total = signal(0);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly documents = signal<EDocumentListItemDto[]>([]);
    readonly charges = signal<UndocumentedChargeDto[]>([]);
    readonly selected = signal<UndocumentedChargeDto[]>([]);
    readonly busyId = signal<string | null>(null);
    readonly selectionValid = computed(() => {
        const list = this.selected();

        return list.length > 0 && list.length <= 50 && new Set(list.map((c) => c.clientId)).size === 1;
    });

    clientId: string | null = null;
    status: EDocumentStatus | null = null;
    documentType: EDocumentType | null = null;

    issueVisible = false;
    readonly issueSource = signal<EDocumentSource | null>(null);

    reasonVisible = false;
    readonly reasonMode = signal<'cancel' | 'discard'>('cancel');
    readonly reasonTarget = signal<EDocumentListItemDto | null>(null);
    readonly reasonSummary = computed(() => {
        const d = this.reasonTarget();

        return d ? `${d.clientName} · ${eDocumentTypeLabel(d.documentType)} ${d.documentNumber ?? ''} · ${formatMoney(d.totalAmount, 'TRY')}` : null;
    });
    readonly reasonAction = (reason: string) =>
        this.reasonMode() === 'cancel' ? this.service.cancel(this.reasonTarget()!.id, reason) : this.service.discard(this.reasonTarget()!.id, reason);

    ngOnInit(): void {
        const query = this.route.snapshot.queryParamMap;

        this.clientId = query.get('clientId')?.trim() || null;
        this.view.set(query.get('view') === 'undocumented' ? 'undocumented' : 'documents');
        this.load(1);
    }

    setView(view: View): void {
        this.view.set(view);
        this.selected.set([]);
        this.total.set(0);
        this.load(1);
    }

    onClientChange(clientId: string | null): void {
        this.clientId = clientId || null;
        this.selected.set([]);
        this.load(1);
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        const page = Math.floor((event.first ?? 0) / this.pageSize) + 1;

        if (page !== this.page()) {
            this.load(page);
        }
    }

    load(page: number): void {
        this.loading.set(true);
        this.error.set(null);
        this.page.set(page);

        const done = (total: number) => {
            this.total.set(total);
            this.loading.set(false);
        };

        const fail = (e: unknown) => {
            this.error.set(panelHttpFailureMessage(e, 'Liste yüklenemedi.'));
            this.loading.set(false);
        };

        if (this.view() === 'documents') {
            this.service.list({ page, pageSize: this.pageSize, clientId: this.clientId, status: this.status, documentType: this.documentType }).subscribe({
                next: (r) => {
                    this.documents.set(r.items);
                    done(r.totalItems);
                },
                error: fail
            });
        } else {
            this.service.undocumentedCharges(page, this.pageSize, this.clientId).subscribe({
                next: (r) => {
                    this.charges.set(r.items);
                    this.selected.update((list) => list.filter((s) => r.items.some((i) => i.chargeId === s.chargeId)));
                    done(r.totalItems);
                },
                error: fail
            });
        }
    }

    isSelected(row: UndocumentedChargeDto): boolean {
        return this.selected().some((s) => s.chargeId === row.chargeId);
    }

    toggle(row: UndocumentedChargeDto, on: boolean): void {
        this.selected.update((list) => (on ? [...list, row] : list.filter((s) => s.chargeId !== row.chargeId)));
    }

    /** Kesilemeyen belgeyi aynı dış referansla yeniden gönderir (çift belge oluşmaz). */
    retryFailed(documentId: string): void {
        this.busyId.set(documentId);
        this.service.retry(documentId).subscribe({
            next: (d) => {
                this.busyId.set(null);
                this.messages.add({ severity: d.status === 'Failed' ? 'warn' : 'success', summary: eDocumentStatusLabel(d.status), detail: d.lastError?.message, life: 4000 });
                this.load(this.page());
            },
            error: (e: unknown) => {
                this.busyId.set(null);
                this.messages.add({ severity: 'error', summary: 'İşlem yapılamadı.', detail: panelHttpFailureMessage(e, 'İşlem yapılamadı.'), life: 6000 });
            }
        });
    }

    openIssueForSelection(): void {
        this.issueSource.set({ chargeIds: this.selected().map((s) => s.chargeId) });
        this.issueVisible = true;
    }

    hasPdf(row: EDocumentListItemDto): boolean {
        return !!row.documentNumber && (row.status === 'Issued' || row.status === 'CancelRequested' || row.status === 'CancelRejected' || row.status === 'Cancelled');
    }

    act(row: EDocumentListItemDto, action: 'refresh' | 'retry'): void {
        this.busyId.set(row.id);
        const call$ = action === 'refresh' ? this.service.refresh(row.id) : this.service.retry(row.id);

        call$.subscribe({
            next: (d) => {
                this.busyId.set(null);
                this.messages.add({ severity: d.status === 'Failed' ? 'warn' : 'success', summary: eDocumentStatusLabel(d.status), detail: d.lastError?.message, life: 4000 });
                this.load(this.page());
            },
            error: (e: unknown) => {
                this.busyId.set(null);
                this.messages.add({ severity: 'error', summary: 'İşlem yapılamadı.', detail: panelHttpFailureMessage(e, 'İşlem yapılamadı.'), life: 6000 });
            }
        });
    }

    pdf(row: EDocumentListItemDto): void {
        this.busyId.set(row.id);
        this.service.pdf(row.id).subscribe({
            next: ({ blob, fileName }) => {
                this.busyId.set(null);
                triggerBlobDownload(blob, fileName);
            },
            error: (e: unknown) => {
                this.busyId.set(null);
                this.messages.add({ severity: 'error', summary: 'PDF alınamadı.', detail: panelHttpFailureMessage(e, 'PDF alınamadı.'), life: 6000 });
            }
        });
    }

    openReason(row: EDocumentListItemDto, mode: 'cancel' | 'discard'): void {
        this.reasonTarget.set(row);
        this.reasonMode.set(mode);
        this.reasonVisible = true;
    }
}
