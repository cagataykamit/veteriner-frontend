import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { ADMINISTRATIONS_CORRECT_CLAIM, ADMINISTRATIONS_CREATE_CLAIM, ADMINISTRATIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AdministrationCreateDialogComponent } from '@/app/features/administrations/components/administration-create-dialog.component';
import { AdministrationRowMarksComponent } from '@/app/features/administrations/components/administration-row-marks.component';
import { administrationSavedNotice } from '@/app/features/administrations/utils/administration-labels';
import { AdministrationVoidDialogComponent } from '@/app/features/administrations/components/administration-void-dialog.component';
import type { AdministrationCreateResultVm, AdministrationStockOutcome, AdministrationVm } from '@/app/features/administrations/models/administration-vm.model';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/**
 * Muayene veya tedavi bağlamında uygulama kayıtları: liste, "Uygulama ekle" ve gerekçeli iptal.
 * Uygulama okuma izni yoksa hiçbir şey çizilmez; yazma düğmeleri izne ve salt okunur kiracı durumuna göre gizlenir.
 */
@Component({
    selector: 'app-administrations-section',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        CheckboxModule,
        ButtonModule,
        TableModule,
        AdministrationCreateDialogComponent,
        AdministrationRowMarksComponent,
        AdministrationVoidDialogComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppRowActionButtonComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (canRead) {
            <div class="card" data-testid="administrations-section">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h5 class="mt-0 mb-0">Uygulanan ürünler</h5>
                    <!-- Süzgeç başlık satırında: kayıt yokken bölüm ayrı bir satır kaplamaz. -->
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div class="flex items-center gap-2">
                            <p-checkbox inputId="administrationsShowVoided" [binary]="true" [ngModel]="showVoided()" (ngModelChange)="setShowVoided($event)" data-testid="administrations-show-voided" />
                            <label for="administrationsShowVoided" class="text-sm cursor-pointer">İptal edilenleri göster</label>
                        </div>
                        <a routerLink="/panel/administrations" [queryParams]="{ petId: petId() }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        @if (canAdd()) {
                            <p-button label="Uygulama ekle" icon="pi pi-plus" size="small" data-testid="administration-add" (onClick)="createVisible = true" />
                        }
                    </div>
                </div>

                @if (canCreate && locked()) {
                    <p class="text-sm text-muted-color mt-0 mb-3" role="note" data-testid="administrations-locked">Muayene kesinleştirildi. Unutulan uygulama gerekçe yazılarak sonradan eklenebilir; yanlış kayıt iptal edilebilir.</p>
                }
                @if (notice()) {
                    <p class="text-sm mt-0 mb-3" [class.text-amber-700]="noticeIsWarning()" role="status" data-testid="administration-notice">{{ notice() }}</p>
                }

                @if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (loading() && !loaded()) {
                    <app-loading-state message="Uygulamalar yükleniyor…" />
                } @else if (rows().length === 0) {
                    <p class="text-muted-color text-sm m-0" data-testid="administrations-empty">Bu kayıtta uygulanan ürün yok.</p>
                } @else {
                    <div class="overflow-x-auto" [class.opacity-60]="loading()" [attr.aria-busy]="loading()">
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
                                    <td>{{ row.administeredAtUtc | trDateTime }}</td>
                                    <td class="break-words">
                                        {{ row.productName }}
                                        <app-administration-row-marks [row]="row" />
                                    </td>
                                    <td class="text-right whitespace-nowrap">{{ row.quantity }} {{ row.unit }}</td>
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

            <app-administration-create-dialog [(visible)]="createVisible" [petId]="petId()" [petName]="petName()" [examinationId]="examinationId()" [treatmentId]="treatmentId()" [lateEntry]="locked()" (saved)="onSaved($event)" />
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
    /** İlk yükleme bitince liste yenilemede yerinde kalır; kart küçülüp alttaki bölümleri zıplatmaz. */
    readonly loaded = signal(false);
    readonly error = signal<string | null>(null);
    readonly rows = signal<AdministrationVm[]>([]);
    /** İptal edilen uygulamalar varsayılan gizli (ADR-013); açıkça istenince listelenir. */
    readonly showVoided = signal(false);
    readonly notice = signal<string | null>(null);
    readonly noticeIsWarning = signal(false);

    readonly voidTarget = signal<AdministrationVm | null>(null);
    createVisible = false;
    voidVisible = false;

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
                includeVoided: this.showVoided()
            })
            .subscribe({
                next: (r) => {
                    this.rows.set(r.items);
                    this.loaded.set(true);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Uygulamalar yüklenemedi.');
                    this.loading.set(false);
                }
            });
    }

    setShowVoided(show: boolean): void {
        this.showVoided.set(show);
        this.reload();
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
        const notice = administrationSavedNotice(result, 'Uygulama');

        this.notice.set(notice.text);
        this.noticeIsWarning.set(notice.warn);
        this.reload();
    }
}
