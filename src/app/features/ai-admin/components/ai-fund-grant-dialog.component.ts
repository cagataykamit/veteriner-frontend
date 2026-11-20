import { ChangeDetectionStrategy, Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { AiAdminClinicDto, AiFundGrantDto } from '@/app/features/ai-admin/models/ai-admin.model';
import { formatAiNumber } from '@/app/features/ai-admin/models/ai-admin.model';
import { AiAdminService } from '@/app/features/ai-admin/services/ai-admin.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { FormErrorSummaryComponent } from '@/app/shared/forms/form-field/form-error-summary.component';
import { FormSubmitDirective } from '@/app/shared/forms/form-field/form-submit.directive';
import { DialogUnsavedChangesDirective } from '@/app/shared/ui/unsaved-changes/dialog-unsaved-changes.directive';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

/** Ücretli satın alma açılana kadar fonun tek yolu (ADR-044 madde 6); tek seferde en çok bu kadar. */
export const AI_FUND_MAX_CREDITS = 100_000;

/**
 * Kliniğe elle fon ekleme (AI-007): fon aylık krediden sonra harcanır ve devreder; geri alınmaz. Diyalog son hareketleri de
 * gösterir (kim, ne zaman, not), yanlışlıkla iki kez eklenmesin.
 */
@Component({
    selector: 'app-ai-fund-grant-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, DialogModule, DialogUnsavedChangesDirective, InputNumberModule, InputTextModule, MessageModule, FormSubmitDirective, FormErrorSummaryComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [appUnsavedChanges]="form.dirty" header="Fon ekle" [modal]="true" [(visible)]="visible" [style]="{ width: 'min(32rem, 95vw)' }" [draggable]="false" [closable]="!submitting()">
            @if (clinic(); as c) {
                <p class="mt-0 mb-4 text-sm text-muted-color" data-testid="ai-fund-clinic">
                    <strong class="text-color">{{ c.clinicName }}</strong> · {{ c.tenantName }} · şu an fon {{ number(c.fundCredits) }} kredi
                </p>
            }
            <form appFormSubmit [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                <app-form-error-summary />
                @if (error()) {
                    <p-message severity="error" class="w-full" role="alert">{{ error() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="aiFundCredits" class="text-sm font-medium text-muted-color">Kredi *</label>
                    <p-inputnumber inputId="aiFundCredits" formControlName="credits" [min]="1" [max]="maxCredits" [maxFractionDigits]="0" locale="tr-TR" [fluid]="true" />
                    <small class="text-muted-color">Aylık krediden sonra harcanır, ay sonunda devreder. Eklenen fon geri alınmaz.</small>
                    @if (form.controls.credits.invalid && form.controls.credits.touched) {
                        <small class="text-danger">1 ile {{ number(maxCredits) }} arasında bir sayı girin.</small>
                    }
                </div>
                <div class="flex flex-col gap-1">
                    <label for="aiFundNote" class="text-sm font-medium text-muted-color">Not</label>
                    <input id="aiFundNote" pInputText formControlName="note" maxlength="200" autocomplete="off" placeholder="Örn. pilot denemesi" />
                </div>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <button pButton type="button" severity="secondary" (click)="visible.set(false)" [disabled]="submitting()">{{ copy.buttonCancel }}</button>
                    <button pButton type="submit" [disabled]="submitting()" data-testid="ai-fund-submit"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-plus'"></i>Fon ekle</button>
                </div>
            </form>

            <h4 class="mt-5 mb-2 text-sm font-semibold">Son hareketler</h4>
            @if (grantsError()) {
                <p class="m-0 text-sm text-muted-color">{{ grantsError() }}</p>
            } @else if (grants().length === 0) {
                <p class="m-0 text-sm text-muted-color" data-testid="ai-fund-empty">Henüz fon eklenmedi.</p>
            } @else {
                <ul class="m-0 p-0 list-none flex flex-col gap-1.5 text-sm" data-testid="ai-fund-grants">
                    @for (g of grants(); track g.id) {
                        <li class="flex justify-between gap-3">
                            <span>+{{ number(g.credits) }} kredi @if (g.note) {<span class="text-muted-color"> · {{ g.note }}</span>}</span>
                            <span class="text-muted-color whitespace-nowrap">{{ dateTime(g.createdAtUtc) }}</span>
                        </li>
                    }
                </ul>
            }
        </p-dialog>
    `
})
export class AiFundGrantDialogComponent {
    readonly visible = model(false);
    readonly clinic = input<AiAdminClinicDto | null>(null);
    readonly granted = output<AiAdminClinicDto>();

    readonly copy = PANEL_COPY;
    readonly maxCredits = AI_FUND_MAX_CREDITS;
    readonly submitting = signal(false);
    readonly error = signal<string | null>(null);
    readonly grants = signal<AiFundGrantDto[]>([]);
    readonly grantsError = signal<string | null>(null);

    private readonly fb = inject(FormBuilder);
    private readonly service = inject(AiAdminService);

    readonly form = this.fb.group({
        credits: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(AI_FUND_MAX_CREDITS)]),
        note: this.fb.nonNullable.control('', [Validators.maxLength(200)])
    });

    constructor() {
        effect(() => {
            const c = this.clinic();

            if (this.visible() && c) {
                untracked(() => {
                    this.error.set(null);
                    this.form.reset({ credits: null, note: '' });
                    this.loadGrants(c.clinicId);
                });
            }
        });
    }

    number(value: number): string {
        return formatAiNumber(value);
    }

    dateTime(value: string): string {
        return formatDateTimeDisplay(value);
    }

    submit(): void {
        const c = this.clinic();

        if (!c || this.form.invalid || this.submitting()) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();

        this.submitting.set(true);
        this.error.set(null);
        this.service.grantFund(c.clinicId, v.credits ?? 0, v.note.trim() || null).subscribe({
            next: (row) => {
                this.submitting.set(false);
                this.form.markAsPristine();
                this.visible.set(false);
                this.granted.emit(row);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.error.set(e instanceof Error ? e.message : 'Fon eklenemedi.');
            }
        });
    }

    private loadGrants(clinicId: string): void {
        this.grants.set([]);
        this.grantsError.set(null);
        this.service.fundGrants(clinicId).subscribe({
            next: (rows) => this.grants.set(rows.slice(0, 5)),
            error: (e: unknown) => this.grantsError.set(e instanceof Error ? e.message : 'Fon hareketleri yüklenemedi.')
        });
    }
}
