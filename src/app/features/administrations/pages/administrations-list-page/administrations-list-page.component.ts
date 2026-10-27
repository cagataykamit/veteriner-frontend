import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { ADMINISTRATIONS_CORRECT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AdministrationRowMarksComponent } from '@/app/features/administrations/components/administration-row-marks.component';
import { AdministrationVoidDialogComponent } from '@/app/features/administrations/components/administration-void-dialog.component';
import type { AdministrationVm } from '@/app/features/administrations/models/administration-vm.model';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

@Component({
    selector: 'app-administrations-list-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        ButtonModule,
        CheckboxModule,
        SelectModule,
        FilterFieldComponent,
        AdministrationRowMarksComponent,
        AdministrationVoidDialogComponent,
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        AppRowActionButtonComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="card">
            <app-list-header class="mb-4" title="Uygulamalar" [count]="totalItems()" />
            <div class="flex flex-wrap items-end gap-3 mb-4 rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                <app-filter-field label="Ürün" labelId="lblAdminProduct" [active]="!!productId" width="select">
                    <p-select
                        ariaLabelledBy="lblAdminProduct"
                        inputId="adminProduct"
                        [options]="productOptions()"
                        [(ngModel)]="productId"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tümü"
                        [filter]="true"
                        filterBy="label"
                        [showClear]="true"
                        class="w-full"
                        (ngModelChange)="applyFilters()"
                    />
                </app-filter-field>
                <app-filter-field label="İptal edilenler" labelFor="adminVoided" [active]="includeVoided" width="select">
                    <label class="flex items-center gap-2 h-[2.5rem]">
                        <p-checkbox inputId="adminVoided" [binary]="true" [(ngModel)]="includeVoided" (ngModelChange)="applyFilters()" />
                        <span class="text-sm">İptal edilenleri göster</span>
                    </label>
                </app-filter-field>
                @if (petId) {
                    <div class="flex items-center gap-2 pb-1">
                        <app-status-tag label="Hasta filtresi" severity="info" />
                        <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="clearPet()"><i class="p-button-icon pi pi-times"></i>Temizle</button>
                    </div>
                }
            </div>

            @if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (loading() && rows().length === 0) {
                <app-loading-state message="Uygulama listesi yükleniyor…" />
            } @else if (!loading() && rows().length === 0) {
                <app-empty-state message="Uygulama kaydı yok." hint="Filtreyi temizleyin veya bir muayene/tedavi kaydından uygulama ekleyin." />
            } @else {
                <div class="overflow-x-auto">
                    <p-table
                        [value]="rows()"
                        [lazy]="true"
                        [paginator]="true"
                        [rows]="pageSize()"
                        [first]="first()"
                        [totalRecords]="totalItems()"
                        [loading]="loading()"
                        [rowsPerPageOptions]="[10, 20, 50]"
                        [paginatorDropdownAppendTo]="'body'"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        (onLazyLoad)="onLazyLoad($event)"
                        [tableStyle]="{ 'min-width': '52rem' }"
                    >
                        <ng-template #header>
                            <tr>
                                <th>Zaman</th>
                                <th>Ürün</th>
                                <th class="text-right">Miktar</th>
                                <th>Kayıt</th>
                                <th>Not</th>
                                @if (canCorrect) {
                                    <th style="width: 8rem">İşlemler</th>
                                }
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr [class.opacity-60]="row.isVoided">
                                <td>{{ row.administeredAtUtc | trDateTime }}</td>
                                <td class="break-words">
                                    {{ row.productName }}
                                    <app-administration-row-marks [row]="row" />
                                </td>
                                <td class="text-right whitespace-nowrap">{{ row.quantity }} {{ row.unit }}</td>
                                <td class="whitespace-nowrap">
                                    <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">Hasta</a>
                                    @if (row.examinationId) {
                                        · <a [routerLink]="['/panel/examinations', row.examinationId]" class="text-primary font-medium no-underline">Muayene</a>
                                    }
                                    @if (row.treatmentId) {
                                        · <a [routerLink]="['/panel/treatments', row.treatmentId]" class="text-primary font-medium no-underline">Tedavi</a>
                                    }
                                </td>
                                <td class="break-words">{{ row.notes || '—' }}</td>
                                @if (canCorrect) {
                                    <td class="whitespace-nowrap">
                                        @if (!row.isVoided && !ro.mutationBlocked()) {
                                            <app-row-action-button action="void" (pressed)="openVoid(row)" />
                                        }
                                    </td>
                                }
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>

        <app-administration-void-dialog [(visible)]="voidVisible" [target]="voidTarget()" (voided)="reload()" />
    `
})
export class AdministrationsListPageComponent implements OnInit {
    private readonly administrationsService = inject(AdministrationsService);
    private readonly productService = inject(ProductService);
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCorrect = this.auth.hasOperationClaim(ADMINISTRATIONS_CORRECT_CLAIM);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<AdministrationVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(20);
    readonly first = signal(0);
    readonly productOptions = signal<{ value: string; label: string }[]>([]);

    petId: string | null = null;
    productId: string | null = null;
    includeVoided = false;

    readonly voidTarget = signal<AdministrationVm | null>(null);
    voidVisible = false;

    ngOnInit(): void {
        this.petId = this.route.snapshot.queryParamMap.get('petId')?.trim() || null;
        this.productService.getProducts({ page: 1, pageSize: 200, stockTrackedOnly: true }).subscribe({
            next: (r) => this.productOptions.set(r.items.map((p) => ({ value: p.id, label: p.name }))),
            error: () => this.productOptions.set([])
        });
        this.load(1, this.pageSize());
    }

    openVoid(row: AdministrationVm): void {
        this.voidTarget.set(row);
        this.voidVisible = true;
    }

    reload(): void {
        this.load(Math.floor(this.first() / this.pageSize()) + 1, this.pageSize());
    }

    applyFilters(): void {
        this.load(1, this.pageSize());
    }

    clearPet(): void {
        this.petId = null;
        this.applyFilters();
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        const rows = event.rows ?? this.pageSize();
        const page = Math.floor((event.first ?? 0) / rows) + 1;

        if (page === Math.floor(this.first() / this.pageSize()) + 1 && rows === this.pageSize()) {
            return;
        }

        this.load(page, rows);
    }

    private load(page: number, pageSize: number): void {
        this.loading.set(true);
        this.error.set(null);
        this.administrationsService
            .getAdministrations({
                page,
                pageSize,
                petId: this.petId ?? undefined,
                productId: this.productId ?? undefined,
                includeVoided: this.includeVoided
            })
            .subscribe({
                next: (r) => {
                    if (r.items.length === 0 && page > 1) {
                        this.load(page - 1, pageSize);

                        return;
                    }

                    this.rows.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.pageSize.set(r.pageSize);
                    this.first.set((r.page - 1) * r.pageSize);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
    }
}
