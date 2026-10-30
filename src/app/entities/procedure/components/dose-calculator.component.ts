import { Component, computed, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { calculateDose, DOSE_LIMITS, DOSE_UNIT_OPTIONS, type DoseUnit } from '@/app/entities/procedure/utils/dose-calculation.utils';
import { copyTextToClipboard } from '@/app/shared/utils/clipboard.utils';

/**
 * Doz hesaplayıcı (EXAM-008): kilo, doz/kg ve (isteğe bağlı) konsantrasyondan toplam doz ve hacim. Yalnız hesap yardımcısıdır;
 * kayda yazmaz, doz önermez. Sonucu hekim isterse kopyalayıp plana veya reçeteye kendisi yazar.
 * Kilo açılışta verilen değerle (ör. muayenedeki ölçüm) dolar, değiştirilebilir.
 */
@Component({
    selector: 'app-dose-calculator',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, DialogModule, SelectModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button pButton type="button" class="p-button-secondary p-button-sm" data-testid="dose-calculator-open" (click)="open()"><i class="pi pi-calculator"></i>Doz hesapla</button>
        <p-dialog header="Doz hesaplayıcı" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(520px, 95vw)' }" [(visible)]="visible">
            <p class="mt-0 mb-4 text-sm text-muted-color">Yalnız hesap yardımcısıdır: doz önermez ve kayda yazılmaz. Doz kararı ve kontrolü hekimdedir.</p>
            <form [formGroup]="form" class="grid grid-cols-12 gap-4">
                <div class="col-span-12 sm:col-span-6">
                    <label for="dc-weight" class="block text-sm font-medium text-muted-color mb-2">Kilo (kg) *</label>
                    <input id="dc-weight" type="number" step="any" min="0" [attr.max]="limits.weightKg" class="w-full p-inputtext p-component" formControlName="weightKg" />
                </div>
                <div class="col-span-12 sm:col-span-6">
                    <label for="dc-dose" class="block text-sm font-medium text-muted-color mb-2">Doz *</label>
                    <div class="flex gap-2">
                        <input id="dc-dose" type="number" step="any" min="0" [attr.max]="limits.dosePerKg" class="w-full p-inputtext p-component" formControlName="dosePerKg" />
                        <p-select inputId="dc-unit" formControlName="doseUnit" [options]="unitOptions" optionLabel="label" optionValue="value" appendTo="body" ariaLabel="Doz birimi" />
                    </div>
                </div>
                <div class="col-span-12">
                    <label for="dc-concentration" class="block text-sm font-medium text-muted-color mb-2">Konsantrasyon (mg/mL)</label>
                    <input id="dc-concentration" type="number" step="any" min="0" [attr.max]="limits.concentrationMgPerMl" class="w-full p-inputtext p-component" formControlName="concentrationMgPerMl" />
                    <small class="text-muted-color">Boş bırakılırsa yalnız toplam doz hesaplanır.</small>
                </div>
            </form>
            <div class="mt-4" aria-live="polite">
                @if (result(); as r) {
                    <div class="text-xl font-semibold" data-testid="dose-total">{{ totalText() }}</div>
                    <p class="mt-2 mb-0 text-sm" data-testid="dose-formula">{{ r.text }}</p>
                } @else if (hasInput()) {
                    <p class="m-0 text-sm text-red-500" role="alert">Değerler 0'dan büyük ve makul aralıkta olmalıdır (kilo ≤ {{ limits.weightKg }}, doz ≤ {{ limits.dosePerKg }}/kg).</p>
                } @else {
                    <p class="m-0 text-sm text-muted-color">Kilo ve dozu girin.</p>
                }
            </div>
            <ng-template #footer>
                @if (copied()) {
                    <span class="text-sm text-muted-color self-center mr-2" role="status">Kopyalandı.</span>
                }
                <button pButton type="button" severity="secondary" [disabled]="!result()" (click)="copy()"><i class="p-button-icon pi pi-copy"></i>Hesabı kopyala</button>
                <button pButton type="button" (click)="visible.set(false)"><i class="p-button-icon pi pi-check"></i>Kapat</button>
            </ng-template>
        </p-dialog>
    `
})
export class DoseCalculatorComponent {
    /** Açılışta kilo alanına yazılır (ör. muayene formundaki ölçüm); boşsa kullanıcı girer. */
    readonly weightKg = input<number | null>(null);

    private readonly fb = inject(FormBuilder);

    protected readonly unitOptions = DOSE_UNIT_OPTIONS;
    protected readonly limits = DOSE_LIMITS;

    readonly visible = signal(false);
    readonly copied = signal(false);

    readonly form = this.fb.group({
        weightKg: this.fb.control<number | null>(null),
        dosePerKg: this.fb.control<number | null>(null),
        doseUnit: this.fb.nonNullable.control<DoseUnit>('mg'),
        concentrationMgPerMl: this.fb.control<number | null>(null)
    });

    private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), { initialValue: this.form.value });

    readonly result = computed(() => {
        const v = this.value();

        return calculateDose({
            weightKg: v.weightKg ?? null,
            dosePerKg: v.dosePerKg ?? null,
            doseUnit: v.doseUnit ?? 'mg',
            concentrationMgPerMl: v.concentrationMgPerMl ?? null
        });
    });

    readonly hasInput = computed(() => this.value().weightKg != null || this.value().dosePerKg != null);

    readonly totalText = computed(() => {
        const r = this.result();

        if (!r) {
            return '';
        }

        const format = (n: number, digits: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: digits }).format(n);
        const unit = this.value().doseUnit === 'mcg' ? 'µg' : 'mg';
        const total = `Toplam: ${format(r.totalDose, 2)} ${unit}`;

        return r.volumeMl != null ? `${total} · Hacim: ${format(r.volumeMl, 3)} mL` : total;
    });

    open(): void {
        this.copied.set(false);
        this.form.reset({ weightKg: this.weightKg(), dosePerKg: null, doseUnit: 'mg', concentrationMgPerMl: null });
        this.visible.set(true);
    }

    async copy(): Promise<void> {
        const r = this.result();

        this.copied.set(!!r && (await copyTextToClipboard(r.text)));
    }
}
