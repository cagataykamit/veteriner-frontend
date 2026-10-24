import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '@/app/core/auth/auth.service';
import { CARE_INSTRUCTIONS_CREATE_CLAIM, CARE_INSTRUCTIONS_READ_CLAIM, CARE_INSTRUCTIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { CARE_INSTRUCTION_TEXT_MAX, type CareInstructionVm } from '@/app/features/care-instructions/models/care-instruction-vm.model';
import { CareInstructionsService } from '@/app/features/care-instructions/services/care-instructions.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

const CONCURRENCY_CONFLICT_CODE = 'CareInstructions.ConcurrencyConflict';

/**
 * Yatışa bağlı hasta sahibi bakım talimatları: liste, ekleme ve metin düzenleme.
 * Okuma izni yoksa hiçbir şey çizilmez; ekle/düzenle düğmeleri izne ve salt okunur kiracı durumuna göre gizlenir.
 */
@Component({
    selector: 'app-care-instructions-section',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, DialogModule, AppLoadingStateComponent, AppEmptyStateComponent, AppErrorStateComponent, AppRowActionButtonComponent, TrDateTimePipe],
    template: `
        @if (canRead) {
            <div class="card" data-testid="care-instructions-section">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h5 class="mt-0 mb-0">Bakım talimatları</h5>
                    @if (canAdd()) {
                        <p-button label="Talimat ekle" icon="pi pi-plus" size="small" data-testid="care-instruction-add" (onClick)="openCreate()" />
                    }
                </div>
                <p class="text-sm text-muted-color mt-0 mb-3">Hasta sahibine verilecek taburcu / evde bakım talimatları; yatış notundan ayrıdır.</p>

                @if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (loading() && rows().length === 0) {
                    <app-loading-state message="Bakım talimatları yükleniyor…" />
                } @else if (rows().length === 0) {
                    <app-empty-state message="Bu yatış için bakım talimatı yok." />
                } @else {
                    <ul class="list-none m-0 p-0" [class.opacity-60]="loading()" [attr.aria-busy]="loading()">
                        @for (row of rows(); track row.id) {
                            <li class="mb-4 last:mb-0 pb-4 last:pb-0 border-b last:border-b-0 border-surface-200 dark:border-surface-700" data-testid="care-instruction-row">
                                <p class="mt-0 mb-2 whitespace-pre-wrap break-words">{{ row.text }}</p>
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <span class="text-sm text-muted-color">
                                        {{ row.createdAtUtc | trDateTime }}
                                        @if (row.updatedAtUtc) {
                                            · güncellendi {{ row.updatedAtUtc | trDateTime }}
                                        }
                                    </span>
                                    @if (canEdit()) {
                                        <app-row-action-button action="edit" testId="care-instruction-edit" (pressed)="openEdit(row)" />
                                    }
                                </div>
                            </li>
                        }
                    </ul>
                }
            </div>

            <p-dialog [header]="editing() ? 'Bakım talimatını düzenle' : 'Bakım talimatı ekle'" [modal]="true" [(visible)]="dialogVisible" [style]="{ width: 'min(36rem, 95vw)' }" [draggable]="false" [closable]="!submitting()">
                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                    <label for="careInstructionText" class="block text-sm font-medium text-muted-color mb-2">Talimat metni *</label>
                    <textarea id="careInstructionText" rows="8" [attr.maxlength]="textMax" class="w-full p-inputtext p-component" formControlName="text"></textarea>
                    <div class="flex justify-between gap-2">
                        @if (form.controls.text.invalid && form.controls.text.touched) {
                            <small class="text-red-500">Talimat metni zorunludur (en çok {{ textMax }} karakter).</small>
                        } @else {
                            <span></span>
                        }
                        <small class="text-muted-color">{{ form.controls.text.value.length }} / {{ textMax }}</small>
                    </div>

                    @if (conflict()) {
                        <div class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 mt-4" role="alert" data-testid="care-instruction-conflict">
                            <p class="text-amber-800 dark:text-amber-200 m-0 font-medium">{{ submitError() }}</p>
                            <div class="mt-3">
                                <p-button type="button" label="Yazdıklarımı atıp güncel kaydı yükle" icon="pi pi-refresh" severity="secondary" size="small" (onClick)="discardAndReload()" />
                            </div>
                        </div>
                    } @else if (submitError()) {
                        <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                    }

                    <div class="flex flex-wrap justify-end gap-2 mt-4">
                        <p-button type="button" label="Vazgeç" severity="secondary" (onClick)="dialogVisible = false" [disabled]="submitting()" />
                        <p-button type="submit" label="Kaydet" icon="pi pi-check" [loading]="submitting()" [disabled]="form.invalid || ro.mutationBlocked()" />
                    </div>
                </form>
            </p-dialog>
        }
    `
})
export class CareInstructionsSectionComponent {
    readonly hospitalizationId = input.required<string>();
    readonly petId = input.required<string>();

    private readonly careInstructionsService = inject(CareInstructionsService);
    private readonly auth = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canRead = this.auth.hasOperationClaim(CARE_INSTRUCTIONS_READ_CLAIM);
    private readonly canCreate = this.auth.hasOperationClaim(CARE_INSTRUCTIONS_CREATE_CLAIM);
    private readonly canUpdate = this.auth.hasOperationClaim(CARE_INSTRUCTIONS_UPDATE_CLAIM);
    readonly canAdd = computed(() => this.canCreate && !this.ro.mutationBlocked());
    readonly canEdit = computed(() => this.canUpdate && !this.ro.mutationBlocked());

    protected readonly textMax = CARE_INSTRUCTION_TEXT_MAX;

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<CareInstructionVm[]>([]);

    dialogVisible = false;
    readonly editing = signal<CareInstructionVm | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly conflict = signal(false);

    readonly form = this.fb.nonNullable.group({
        text: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(CARE_INSTRUCTION_TEXT_MAX)]]
    });

    constructor() {
        effect(() => {
            this.hospitalizationId();

            if (this.canRead) {
                untracked(() => this.reload());
            }
        });
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.careInstructionsService.getCareInstructions({ hospitalizationId: this.hospitalizationId() }).subscribe({
            next: (rows) => {
                this.rows.set(rows);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Bakım talimatları yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    openCreate(): void {
        this.openDialog(null);
    }

    openEdit(row: CareInstructionVm): void {
        this.openDialog(row);
    }

    onSubmit(): void {
        if (this.submitting() || this.ro.mutationBlocked()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const text = this.form.controls.text.value;
        const target = this.editing();

        this.submitError.set(null);
        this.conflict.set(false);
        this.submitting.set(true);
        const request$ = target ? this.careInstructionsService.updateCareInstruction(target.id, text, target.rowVersion) : this.careInstructionsService.createCareInstruction({ petId: this.petId(), hospitalizationId: this.hospitalizationId(), text });

        request$.subscribe({
            next: () => {
                this.submitting.set(false);
                this.dialogVisible = false;
                this.reload();
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    this.conflict.set(e.status === 409 && problemCodeFromHttpError(e) === CONCURRENCY_CONFLICT_CODE);
                    this.submitError.set(messageFromHttpError(e, 'Bakım talimatı kaydedilemedi.'));

                    return;
                }

                this.submitError.set(e instanceof Error ? e.message : 'Bakım talimatı kaydedilemedi.');
            }
        });
    }

    /** Çakışmada yazılan metin atılır, güncel kayıtlar yüklenir. */
    discardAndReload(): void {
        this.dialogVisible = false;
        this.reload();
    }

    private openDialog(row: CareInstructionVm | null): void {
        this.editing.set(row);
        this.form.reset({ text: row?.text ?? '' });
        this.submitError.set(null);
        this.conflict.set(false);
        this.dialogVisible = true;
    }
}
