import { Component, inject, OnInit, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    EXAMINATION_TEMPLATES_CREATE_CLAIM,
    EXAMINATION_TEMPLATES_DEACTIVATE_CLAIM,
    EXAMINATION_TEMPLATES_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { DEFINITIONS_ROUTE } from '@/app/core/routing/panel-navigation';
import {
    ExaminationTemplateEditorDialogComponent,
    type ExaminationTemplateEditorMode
} from '@/app/features/examination-templates/components/examination-template-editor-dialog.component';
import type { ExaminationTemplateDto } from '@/app/features/examination-templates/models/examination-template.model';
import { ExaminationTemplatesService } from '@/app/features/examination-templates/services/examination-templates.service';
import { templateContentSummary, templateInactiveLineNames } from '@/app/features/examination-templates/utils/examination-template.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

const PAGE_SIZE = 50;

/**
 * Muayene şablonları yönetimi (ADR-020 S4), Tanımlar altında. Pasifler dahil listelenir; sistem şablonları salt okunurdur,
 * rozetle ayrışır ve "Kopyala ve düzenle" ile kliniğe özel şablona dönüştürülür (içerik yeni adla POST; ayrı uç yok).
 * Ekle / düzenle / pasifleştir-etkinleştir düğmeleri izne ve salt okunur kiracı durumuna göre görünür.
 */
@Component({
    selector: 'app-examination-templates-page',
    standalone: true,
    imports: [
        ButtonModule,
        ConfirmDialogModule,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        SearchInputComponent,
        ExaminationTemplateEditorDialogComponent
    ],
    providers: [ConfirmationService],
    template: `
        <app-page-header
            [categoryLink]="definitionsRoute"
            categoryLinkLabel="Tanımlar"
            title="Muayene şablonları"
            description="Muayenede tek seçimle şikâyet, bulgu, plan ve işlem satırlarını ön dolduran paketler. Sistem şablonları ortaktır; kopyalayıp kliniğinize uyarlayabilirsiniz."
        >
            @if (canCreate && !ro.mutationBlocked()) {
                <button actions pButton type="button" label="Yeni şablon" icon="pi pi-plus" data-testid="template-new" (click)="openEditor('create', null)"></button>
            }
        </app-page-header>

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle şablon yönetimi salt okunur.</p>
        }

        <div class="card">
            <div class="w-full md:max-w-sm mb-4">
                <app-search-input inputId="templateSearch" placeholder="Şablon adı…" ariaLabel="Şablon ara" [(value)]="searchInput" (search)="applySearch()" />
            </div>

            @if (listActionError()) {
                <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ listActionError() }}</p>
            }

            @if (loading() && rows().length === 0) {
                <app-loading-state message="Şablonlar yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (rows().length === 0) {
                <app-empty-state [message]="activeSearch() ? copy.listEmptyMessage : 'Henüz şablon yok.'" [hint]="activeSearch() ? copy.listEmptyHint : ''" />
            } @else {
                <div class="overflow-x-auto">
                    <p-table
                        [value]="rows()"
                        [lazy]="true"
                        [paginator]="totalItems() > pageSize"
                        [rows]="pageSize"
                        [first]="first()"
                        [totalRecords]="totalItems()"
                        [loading]="loading()"
                        (onLazyLoad)="onLazyLoad($event)"
                        [tableStyle]="{ 'min-width': '44rem' }"
                    >
                        <ng-template #header>
                            <tr>
                                <th>Ad</th>
                                <th>İçerik</th>
                                <th>Kaynak</th>
                                <th>Durum</th>
                                <th style="min-width: 14rem">İşlem</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr data-testid="template-row">
                                <td class="font-medium" [class.text-muted-color]="!row.isActive">{{ row.name }}</td>
                                <td class="text-sm">
                                    {{ contentSummary(row) }}
                                    @if (hasInactiveLine(row)) {
                                        <app-status-tag label="Pasif ürün var" severity="warn" />
                                    }
                                </td>
                                <td>
                                    <app-status-tag [label]="row.isSystem ? 'Sistem' : 'Kliniğe özel'" [severity]="row.isSystem ? 'secondary' : 'info'" />
                                </td>
                                <td>
                                    <app-status-tag [label]="row.isActive ? 'Aktif' : 'Pasif'" [severity]="row.isActive ? 'success' : 'warn'" />
                                </td>
                                <td>
                                    <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                        @if (row.isSystem) {
                                            <span class="text-sm text-muted-color">Salt okunur</span>
                                        }
                                        @if (!ro.mutationBlocked()) {
                                            @if (canUpdate && !row.isSystem) {
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="mutatingId() !== null" (click)="openEditor('edit', row)">
                                                    Düzenle
                                                </button>
                                            }
                                            @if (canCreate) {
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="mutatingId() !== null" (click)="openEditor('copy', row)">
                                                    Kopyala ve düzenle
                                                </button>
                                            }
                                            @if (canDeactivate && !row.isSystem && row.isActive) {
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50" [disabled]="mutatingId() !== null" (click)="confirmDeactivate(row)">
                                                    Pasifleştir
                                                </button>
                                            }
                                            @if (canDeactivate && !row.isSystem && !row.isActive) {
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="mutatingId() !== null" (click)="setActive(row, true)">
                                                    Etkinleştir
                                                </button>
                                            }
                                        }
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>

        <app-examination-template-editor-dialog
            [(visible)]="editorVisible"
            [mode]="editorMode()"
            [source]="editorSource()"
            (saved)="reload()"
            (conflict)="onEditorConflict($event)"
        />

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class ExaminationTemplatesPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly definitionsRoute = DEFINITIONS_ROUTE;
    readonly pageSize = PAGE_SIZE;

    private readonly templates = inject(ExaminationTemplatesService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreate = this.auth.hasOperationClaim(EXAMINATION_TEMPLATES_CREATE_CLAIM);
    readonly canUpdate = this.auth.hasOperationClaim(EXAMINATION_TEMPLATES_UPDATE_CLAIM);
    readonly canDeactivate = this.auth.hasOperationClaim(EXAMINATION_TEMPLATES_DEACTIVATE_CLAIM);

    readonly activeSearch = signal('');
    searchInput = '';

    readonly rows = signal<ExaminationTemplateDto[]>([]);
    readonly totalItems = signal(0);
    readonly first = signal(0);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly listActionError = signal<string | null>(null);
    readonly mutatingId = signal<string | null>(null);

    readonly editorVisible = signal(false);
    readonly editorMode = signal<ExaminationTemplateEditorMode>('create');
    readonly editorSource = signal<ExaminationTemplateDto | null>(null);

    ngOnInit(): void {
        this.load(1);
    }

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.load(1);
    }

    reload(): void {
        this.load(this.first() / PAGE_SIZE + 1);
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        const page = Math.floor((event.first ?? 0) / PAGE_SIZE) + 1;
        if (page !== this.first() / PAGE_SIZE + 1) {
            this.load(page);
        }
    }

    readonly contentSummary = templateContentSummary;

    hasInactiveLine(t: ExaminationTemplateDto): boolean {
        return templateInactiveLineNames(t).length > 0;
    }

    openEditor(mode: ExaminationTemplateEditorMode, row: ExaminationTemplateDto | null): void {
        const allowed = mode === 'edit' ? this.canUpdate && !!row && !row.isSystem : this.canCreate;
        if (!allowed || this.ro.mutationBlocked()) {
            return;
        }
        this.listActionError.set(null);
        this.editorMode.set(mode);
        this.editorSource.set(row);
        this.editorVisible.set(true);
    }

    /** Eski sürümle tekrar denenmesin: pencere kapanır, liste yenilenir, kullanıcı güncel kayıtla yeniden açar. */
    onEditorConflict(message: string): void {
        this.listActionError.set(message);
        this.reload();
    }

    confirmDeactivate(row: ExaminationTemplateDto): void {
        this.confirmation.confirm({
            header: 'Şablonu pasifleştir',
            message: `"${row.name}" muayenede seçilemez. Daha önce uygulandığı muayeneler değişmez; şablonu sonra yeniden etkinleştirebilirsiniz.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.setActive(row, false)
        });
    }

    setActive(row: ExaminationTemplateDto, active: boolean): void {
        if (!this.canDeactivate || row.isSystem || this.ro.mutationBlocked() || this.mutatingId() !== null) {
            return;
        }
        this.mutatingId.set(row.id);
        this.listActionError.set(null);
        this.templates.setActive(row.id, active).subscribe({
            next: () => {
                this.mutatingId.set(null);
                this.reload();
            },
            error: (e: unknown) => {
                this.mutatingId.set(null);
                this.listActionError.set(e instanceof Error ? e.message : 'İşlem başarısız.');
            }
        });
    }

    private load(page: number): void {
        this.loading.set(true);
        this.error.set(null);
        this.templates.list({ search: this.activeSearch(), includeInactive: true, page, pageSize: PAGE_SIZE }).subscribe({
            next: (r) => {
                this.rows.set(r.items);
                this.totalItems.set(r.totalItems);
                this.first.set((r.page - 1) * PAGE_SIZE);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Şablonlar yüklenemedi.');
                this.loading.set(false);
            }
        });
    }
}
