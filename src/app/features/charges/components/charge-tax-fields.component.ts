import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { CHARGE_LINE_KIND_OPTIONS, type ChargeLineKind, chargeVatRateOptionsIncluding } from '@/app/entities/charge/utils/charge-tax.utils';

/** Ücret formlarındaki satır türü ve KDV oranı seçimi (ADR-036); yeni ücret ve düzeltme aynı alanları kullanır. */
@Component({
    selector: 'app-charge-tax-fields',
    standalone: true,
    imports: [ReactiveFormsModule, SelectModule],
    host: { class: 'contents' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div [class]="cellClass()">
            <label [for]="idPrefix() + '-line-kind'" class="block text-sm font-medium text-muted-color mb-2">Satır türü</label>
            <p-select [inputId]="idPrefix() + '-line-kind'" [formControl]="lineKind()" [options]="lineKindOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div [class]="cellClass()">
            <label [for]="idPrefix() + '-vat-rate'" class="block text-sm font-medium text-muted-color mb-2">KDV oranı</label>
            <p-select [inputId]="idPrefix() + '-vat-rate'" [formControl]="vatRate()" [options]="vatOptions()" optionLabel="label" optionValue="value" class="w-full" />
            <small class="text-muted-color">Boşsa kliniğin mükellef bilgilerindeki varsayılan oran kullanılır.</small>
        </div>
    `
})
export class ChargeTaxFieldsComponent {
    readonly lineKind = input.required<FormControl<ChargeLineKind>>();
    readonly vatRate = input.required<FormControl<number | null>>();
    /** Kayıtlı oran listede yoksa seçenek olarak eklenir (düzeltme). */
    readonly currentVatRate = input<number | null>(null);
    readonly idPrefix = input('charge');
    readonly cellClass = input('col-span-12 md:col-span-6');

    protected readonly lineKindOptions = [...CHARGE_LINE_KIND_OPTIONS];
    protected readonly vatOptions = computed(() => chargeVatRateOptionsIncluding(this.currentVatRate()));
}
