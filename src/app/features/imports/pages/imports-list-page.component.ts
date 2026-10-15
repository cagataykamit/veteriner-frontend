import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMPORTS_COMMIT_CLAIM, IMPORTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { IMPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import type { ImportBatchDto, ImportBatchStatus } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { saveDownload } from '@/app/features/imports/utils/import-download.utils';
import {
    IMPORT_STATUS_LABELS,
    importErrorMessage,
    importStatusLabel,
    importStatusSeverity,
    isDiscardable,
    isRollbackScreenAvailable
} from '@/app/features/imports/utils/import-labels.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

/** Parti geçmişi: durum, tarih, sayılar; taslaklar sürdürülür veya silinir. */
@Component({
    selector: 'app-imports-list-page',
    standalone: true,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        MessageModule,
        Paginator,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header title="Veri içe aktarma" description="Eski sistemdeki müşteri, hasta ve aşı geçmişini Excel veya CSV dosyasıyla aktarın. Her adım onayınızla ilerler; aktarmadan önce sonucu görürsünüz.">
            <div actions class="flex flex-wrap gap-2">
                <p-button size="small" severity="secondary" icon="pi pi-download" label="Excel şablonu" [loading]="templateBusy()" (onClick)="downloadTemplate()" />
                @if (canManage) {
                    <p-button size="small" icon="pi pi-plus" label="Yeni içe aktarma" [routerLink]="newRoute" />
                }
            </div>
        </app-page-header>

        @if (!canManage) {
            <p-message severity="info" styleClass="mb-4 w-full">Bu sayfayı yalnızca görüntüleyebilirsiniz. Yükleme, eşleme ve aktarma için yönetici yetkisi gerekir.</p-message>
        }
        @if (notice()) {
            <p-message severity="warn" styleClass="mb-4 w-full" role="alert">{{ notice() }}</p-message>
        }

        <div class="card">
            @if (loading()) {
                <app-loading-state message="İçe aktarma geçmişi yükleniyor…" />
            } @else if (error()) {
                <app-error-state title="İçe aktarma geçmişi yüklenemedi." [detail]="error()!" (retry)="load()" />
            } @else {
                <div class="flex flex-wrap items-end gap-3 mb-4">
                    <div class="flex flex-col gap-1">
                        <label for="importStatusFilter" class="text-sm text-muted-color">Durum</label>
                        <p-select
                            inputId="importStatusFilter"
                            [options]="statusOptions"
                            [(ngModel)]="statusFilter"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Tümü"
                            [showClear]="true"
                            styleClass="w-56"
                            (ngModelChange)="applyFilter()"
                        />
                    </div>
                </div>

                @if (items().length === 0) {
                    <app-empty-state
                        [message]="statusFilter ? 'Bu durumda içe aktarma yok.' : 'Henüz içe aktarma yapılmadı.'"
                        [hint]="statusFilter || !canManage ? undefined : 'Önce şablonu indirip eski kayıtlarınızı doldurun, sonra yeni içe aktarma başlatın.'"
                    />
                } @else {
                    <ul class="list-none p-0 m-0 flex flex-col gap-3">
                        @for (b of items(); track b.id) {
                            <li class="rounded-border border border-surface-200 dark:border-surface-700 p-4 flex flex-wrap items-center gap-3 justify-between">
                                <div class="min-w-0 flex-1 basis-64">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="font-medium break-words">{{ b.name || 'Adsız içe aktarma' }}</span>
                                        <app-status-tag [label]="statusLabel(b.status)" [severity]="statusSeverity(b.status)" />
                                    </div>
                                    <div class="text-sm text-muted-color mt-1">{{ formatDate(b.createdAtUtc) }}</div>
                                    <div class="text-sm mt-1">{{ countsText(b) }}</div>
                                </div>
                                <div class="flex flex-wrap items-center gap-2">
                                    @if (discardingId() === b.id) {
                                        <span class="text-sm">Taslak silinsin mi?</span>
                                        <p-button size="small" severity="danger" label="Sil" [loading]="busyId() === b.id" (onClick)="discard(b)" />
                                        <p-button size="small" severity="secondary" label="Vazgeç" (onClick)="discardingId.set(null)" />
                                    } @else {
                                        <p-button size="small" severity="secondary" [label]="isDraft(b) && canManage ? 'Devam et' : 'Aç'" [routerLink]="[b.id]" />
                                        @if (canCommit && canRollback(b)) {
                                            <p-button size="small" severity="danger" [outlined]="true" icon="pi pi-undo" [label]="b.status === 'RollingBack' ? 'Geri alma durumu' : 'Geri al'" [routerLink]="[b.id, 'rollback']" />
                                        }
                                        @if (canManage && isDraft(b)) {
                                            <p-button size="small" severity="secondary" icon="pi pi-trash" ariaLabel="Taslağı sil" (onClick)="discardingId.set(b.id)" />
                                        }
                                    }
                                </div>
                            </li>
                        }
                    </ul>
                    <p-paginator [rows]="pageSize" [first]="(page() - 1) * pageSize" [totalRecords]="totalItems()" (onPageChange)="onPage($event)" />
                }
            }
        </div>
    `
})
export class ImportsListPageComponent implements OnInit {
    private readonly imports = inject(ImportsService);
    private readonly auth = inject(AuthService);

    readonly canManage = this.auth.hasOperationClaim(IMPORTS_MANAGE_CLAIM);
    readonly canCommit = this.auth.hasOperationClaim(IMPORTS_COMMIT_CLAIM);
    readonly newRoute = `${IMPORTS_ROUTE}/new`;
    readonly pageSize = 20;
    readonly statusOptions = (Object.keys(IMPORT_STATUS_LABELS) as ImportBatchStatus[]).map((value) => ({ value, label: IMPORT_STATUS_LABELS[value] }));
    statusFilter: ImportBatchStatus | null = null;

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);
    readonly items = signal<ImportBatchDto[]>([]);
    readonly page = signal(1);
    readonly totalItems = signal(0);
    readonly discardingId = signal<string | null>(null);
    readonly busyId = signal<string | null>(null);
    readonly templateBusy = signal(false);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.imports.listBatches(this.page(), this.pageSize, this.statusFilter ?? undefined).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.totalItems.set(res.totalItems);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(importErrorMessage(e, 'İçe aktarma geçmişi yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    applyFilter(): void {
        this.page.set(1);
        this.load();
    }

    onPage(e: PaginatorState): void {
        this.page.set((e.page ?? 0) + 1);
        this.load();
    }

    discard(b: ImportBatchDto): void {
        this.busyId.set(b.id);
        this.notice.set(null);
        this.imports.discard(b.id).subscribe({
            next: () => {
                this.busyId.set(null);
                this.discardingId.set(null);
                this.load();
            },
            error: (e: unknown) => {
                this.busyId.set(null);
                this.discardingId.set(null);
                this.notice.set(importErrorMessage(e, 'Taslak silinemedi.'));
            }
        });
    }

    downloadTemplate(): void {
        this.templateBusy.set(true);
        this.notice.set(null);
        this.imports.downloadTemplate('xlsx').subscribe({
            next: (res) => {
                this.templateBusy.set(false);
                saveDownload(res, 'vetinity-iceaktar-sablon.xlsx');
            },
            error: (e: unknown) => {
                this.templateBusy.set(false);
                this.notice.set(importErrorMessage(e, 'Şablon indirilemedi.'));
            }
        });
    }

    protected isDraft(b: ImportBatchDto): boolean {
        return isDiscardable(b.status);
    }

    protected canRollback(b: ImportBatchDto): boolean {
        return isRollbackScreenAvailable(b.status);
    }

    protected statusLabel = importStatusLabel;
    protected statusSeverity = importStatusSeverity;

    protected formatDate(utc: string): string {
        return formatUtcIsoAsLocalDateTimeDisplay(utc);
    }

    protected countsText(b: ImportBatchDto): string {
        const s = b.summary;
        const parts = [
            s.customers.total ? `${s.customers.total} müşteri` : '',
            s.pets.total ? `${s.pets.total} hasta` : '',
            s.vaccinations.total ? `${s.vaccinations.total} aşı` : ''
        ].filter(Boolean);

        return parts.length ? parts.join(' · ') : 'Satır bilgisi yok';
    }
}
