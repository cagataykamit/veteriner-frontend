import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    ADMINISTRATIONS_CORRECT_CLAIM,
    ADMINISTRATIONS_CREATE_CLAIM,
    ADMINISTRATIONS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { AdministrationCreateDialogComponent } from '@/app/features/administrations/components/administration-create-dialog.component';
import { AdministrationRowMarksComponent } from '@/app/features/administrations/components/administration-row-marks.component';
import { AdministrationVoidDialogComponent } from '@/app/features/administrations/components/administration-void-dialog.component';
import type { AdministrationCreateResultVm, AdministrationStockOutcome, AdministrationVm } from '@/app/features/administrations/models/administration-vm.model';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Muayene veya tedavi bağlamında uygulama kayıtları: liste, "Uygulama ekle" ve gerekçeli iptal.
 * Uygulama okuma izni yoksa hiçbir şey çizilmez; yazma düğmeleri izne ve salt okunur kiracı durumuna göre gizlenir.
 */
@Component({
    selector: 'app-administrations-section',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        TableModule,
        AdministrationCreateDialogComponent,
        AdministrationRowMarksComponent,
        AdministrationVoidDialogComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        @if (canRead) {
            <div class="card" data-testid="administrations-section">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h5 class="mt-0 mb-0">Uygulanan ürünler</h5>
                    <div class="flex flex-wrap items-center gap-2">
                        <a routerLink="/panel/administrations" [queryParams]="{ petId: petId() }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        @if (canAdd()) {
                            <p-button label="Uygulama ekle" icon="pi pi-plus" size="small" data-testid="administration-add" (onClick)="createVisible = true" />
                        }
                    </div>
                </div>

                @if (canCreate && locked()) {
                    <p class="text-sm text-muted-color mt-0 mb-3" role="note" data-testid="administrations-locked">
                        Muayene kesinleştirildi. Unutulan uygulama gerekçe yazılarak sonradan eklenebilir; yanlış kayıt iptal edilebilir.
                    </p>
                }
                @if (notice()) {
                    <p class="text-sm mt-0 mb-3" [class.text-amber-700]="noticeIsWarning()" role="status" data-testid="administration-notice">{{ notice() }}</p>
                }

                @if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (loading()) {
                    <app-loading-state message="Uygulamalar yükleniyor…" />
                } @else if (rows().length === 0) {
                    <app-empty-state message="Bu kayıtta uygulanan ürün yok." />
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="rows()" [tableStyle]="{ 'min-width': '34rem' }">
                            <ng-template #header>
                                <tr>
                                    <th>Zaman</th>
                                    <th>Ürün</th>
                                    <th class="text-right">Miktar</th>
                                    <th>Not</th>
                                    @if (canCorrect) {
                                        <th style="width: 8rem"></th>
                                    }
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr [class.opacity-60]="row.isVoided">
                                    <td>{{ formatDate(row.administeredAtUtc) }}</td>
                                    <td class="break-words">
                                        {{ row.productName }}
                                        <app-administration-row-marks [row]="row" />
                                    </td>
                                    <td class="text-right whitespace-nowrap">{{ row.quantity }} {{ row.unit }}</td>
                                    <td class="break-words">{{ row.notes || '—' }}</td>
                                    @if (canCorrect) {
                                        <td class="whitespace-nowrap">
                                            @if (!row.isVoided && !ro.mutationBlocked()) {
                                                <p-button label="İptal et" icon="pi pi-ban" size="small" severity="danger" [text]="true" (onClick)="openVoid(row)" />
                                            }
                                        </td>
                                    }
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            </div>

            <app-administration-create-dialog
                [(visible)]="createVisible"
                [petId]="petId()"
                [petName]="petName()"
                [examinationId]="examinationId()"
                [treatmentId]="treatmentId()"
                [lateEntry]="locked()"
                (saved)="onSaved($event)"
            />
            <app-administration-void-dialog [(visible)]="voidVisible" [target]="voidTarget()" (voided)="onVoided($event)" />
        }
    `
})
export class AdministrationsSectionComponent {
    readonly petId = input.required<string>();
    readonly petName = input<string | null>(null);
    readonly examinationId = input<string | null>(null);
    readonly treatmentId = input<string | null>(null);
    /** Bağlı muayene kesinleşmişse uygulama yalnız gerekçeyle sonradan eklenir (ADR-013). */
    readonly locked = input(false);

    private readonly administrationsService = inject(AdministrationsService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canRead = this.auth.hasOperationClaim(ADMINISTRATIONS_READ_CLAIM);
    readonly canCreate = this.auth.hasOperationClaim(ADMINISTRATIONS_CREATE_CLAIM);
    readonly canCorrect = this.auth.hasOperationClaim(ADMINISTRATIONS_CORRECT_CLAIM);

    readonly canAdd = computed(() => this.canCreate && !this.ro.mutationBlocked());

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<AdministrationVm[]>([]);
    readonly notice = signal<string | null>(null);
    readonly noticeIsWarning = signal(false);

    readonly voidTarget = signal<AdministrationVm | null>(null);
    createVisible = false;
    voidVisible = false;

    readonly formatDate = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);

    constructor() {
        effect(() => {
            this.treatmentId();
            this.examinationId();
            if (this.canRead) {
                untracked(() => this.reload());
            }
        });
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.administrationsService
            .getAdministrations({
                pageSize: 50,
                treatmentId: this.treatmentId() ?? undefined,
                examinationId: this.treatmentId() ? undefined : (this.examinationId() ?? undefined),
                petId: this.treatmentId() || this.examinationId() ? undefined : this.petId(),
                includeVoided: true
            })
            .subscribe({
                next: (r) => {
                    this.rows.set(r.items);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Uygulamalar yüklenemedi.');
                    this.loading.set(false);
                }
            });
    }

    openVoid(row: AdministrationVm): void {
        this.voidTarget.set(row);
        this.voidVisible = true;
    }

    onVoided(outcome: AdministrationStockOutcome): void {
        this.notice.set(outcome === 'WrittenOff' ? 'Uygulama iptal edildi; zarar/imha olarak yazıldı, stok geri artmadı.' : 'Uygulama iptal edildi; ürün stoğa geri verildi.');
        this.noticeIsWarning.set(false);
        this.reload();
    }

    onSaved(result: AdministrationCreateResultVm): void {
        const { administration, stock } = result;
        if (!result.created) {
            this.notice.set('Bu uygulama zaten kaydedilmişti; stok tekrar düşülmedi.');
            this.noticeIsWarning.set(false);
        } else if (stock.isBelowMinimum) {
            this.notice.set(
                `Uygulama kaydedildi. Dikkat: ${administration.productName} stoğu minimum düzeyin altına indi (kalan ${stock.quantityOnHand} ${administration.unit}, minimum ${stock.minimumStockLevel}).`
            );
            this.noticeIsWarning.set(true);
        } else {
            this.notice.set(`Uygulama kaydedildi; kalan stok ${stock.quantityOnHand} ${administration.unit}.`);
            this.noticeIsWarning.set(false);
        }
        this.reload();
    }
}
