import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { REASON_MAX, REASON_MIN, reasonLength } from '@/app/shared/forms/reason-length.validator';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Gerekçe girilen onay diyaloğu (iptal gibi geri alınamaz işlemler). `execute` çağrıyı yapar; başarıda `confirmed`, hatada Türkçe mesaj diyalogda kalır.
 * Yetki denetimi çağıran bileşende yapılır.
 */
@Component({
    selector: 'app-reason-confirm-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [header]="header()" [modal]="true" [dismissableMask]="!submitting()" [closable]="!submitting()" [style]="{ width: 'min(520px, 95vw)' }" [(visible)]="visible">
            @if (summary()) {
                <p class="mt-0 mb-2 font-medium">{{ summary() }}</p>
            }
            @if (description()) {
                <p class="mt-0 mb-4 text-sm text-muted-color">{{ description() }}</p>
            }
            <ng-content />
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <label for="rc-reason" class="block text-sm font-medium text-muted-color mb-2">{{ reasonOptional() ? 'Gerekçe (opsiyonel)' : 'Gerekçe *' }}</label>
                <textarea id="rc-reason" rows="3" class="w-full p-inputtext p-component" formControlName="reason"></textarea>
                @if (form.controls.reason.invalid && (form.controls.reason.dirty || form.controls.reason.touched)) {
                    <small class="text-red-500">
                        {{ reasonOptional() ? 'Gerekçe en çok ' + reasonMax + ' karakter olabilir.' : 'Gerekçe ' + reasonMin + '–' + reasonMax + ' karakter olmalıdır.' }}
                    </small>
                }
                @if (submitError()) {
                    <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
                }
            </form>
            <ng-template #footer>
                <button pButton type="button" severity="secondary" (click)="close()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                <button pButton type="button" severity="danger" [disabled]="form.invalid || submitting()" (click)="onSubmit()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ confirmLabel() }}</button>
            </ng-template>
        </p-dialog>
    `
})
export class ReasonConfirmDialogComponent {
    readonly visible = model(false);
    readonly header = input.required<string>();
    /** Hangi kaydın etkileneceği (kalın satır). */
    readonly summary = input<string | null>(null);
    /** Sonuç açıklaması (ör. geri alınamaz uyarısı). */
    readonly description = input<string | null>(null);
    readonly confirmLabel = input('Onayla');
    readonly failureFallback = input('İşlem kaydedilemedi.');
    /** Sözleşmede gerekçe opsiyonelse (ör. randevu iptali) yalnız üst sınır uygulanır; aksi halde 5–500 zorunlu. */
    readonly reasonOptional = input(false);
    /** Gerekçeyle çağrıyı yapar; her seferinde güncel kayıt için çağıran bileşen bağlar. */
    readonly execute = input.required<(reason: string) => Observable<unknown>>();
    readonly confirmed = output<void>();

    private readonly fb = inject(FormBuilder);

    protected readonly reasonMin = REASON_MIN;
    protected readonly reasonMax = REASON_MAX;

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({ reason: ['', reasonLength] });

    constructor() {
        this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.submitError.set(null));
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    this.submitError.set(null);
                    this.form.controls.reason.setValidators(this.reasonOptional() ? Validators.maxLength(REASON_MAX) : reasonLength);
                    this.form.reset({ reason: '' });
                });
            }
        });
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        if (this.submitting()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        this.submitError.set(null);
        this.submitting.set(true);
        this.execute()(this.form.controls.reason.value).subscribe({
            next: () => {
                this.submitting.set(false);
                this.visible.set(false);
                this.confirmed.emit();
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, this.failureFallback()));
            }
        });
    }
}
