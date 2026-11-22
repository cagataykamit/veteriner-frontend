import { CommonModule } from '@angular/common';
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import {
    createLabResultLineGroup,
    LAB_RESULT_LINE_NUMBER_ERROR_KEY,
    LAB_RESULT_LINE_PARAMETER_MAX,
    LAB_RESULT_LINE_RANGE_ERROR_KEY,
    LAB_RESULT_LINE_UNIT_MAX,
    LAB_RESULT_LINES_MAX,
    type LabResultLinesFormArray
} from '@/app/entities/lab-result/utils/lab-result-lines-form.utils';

/**
 * Lab değer satırları editörü (REF-001 Dilim 3): parametre, değer, birim ve sonuç raporundaki referans aralığı.
 * Düşük/yüksek işareti sunucuda hesaplanır, burada seçilmez. Form durumu çağıran formdaki `FormArray`dedir.
 */
@Component({
    selector: 'app-lab-result-lines-editor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div data-testid="lab-result-lines-editor">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span class="block text-sm font-medium text-muted-color">Değerler</span>
                <button pButton type="button" size="small" severity="secondary" data-testid="lab-line-add" [disabled]="lines().length >= max" (click)="addRow()"><i class="p-button-icon pi pi-plus"></i>Değer ekle</button>
            </div>
            <p class="text-sm text-muted-color mt-0 mb-3">İsteğe bağlı. Referans aralığını sonuç raporundan yazın; düşük ve yüksek değerler kayıtta işaretlenir.</p>
            @if (lines().length === 0) {
                <p class="text-sm text-muted-color m-0" data-testid="lab-lines-empty">Değer satırı yok; sonuç metin olarak kaydedilir.</p>
            }
            @for (g of lines().controls; track g; let i = $index) {
                <div class="grid grid-cols-12 gap-2 items-start py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0" data-testid="lab-line-row">
                    <div class="col-span-12 sm:col-span-4">
                        <label [attr.for]="'lab-param-' + i" class="block text-xs font-medium text-muted-color mb-1">Parametre *</label>
                        <input [id]="'lab-param-' + i" type="text" class="w-full p-inputtext p-component" [formControl]="g.controls.parameterName" [attr.maxlength]="parameterMax" placeholder="Örn. ALT" />
                        @if (g.controls.parameterName.invalid && g.controls.parameterName.touched) {
                            <small class="text-danger">Parametre adı zorunludur.</small>
                        }
                    </div>
                    <div class="col-span-6 sm:col-span-2">
                        <label [attr.for]="'lab-value-' + i" class="block text-xs font-medium text-muted-color mb-1">Değer *</label>
                        <input [id]="'lab-value-' + i" type="text" inputmode="decimal" class="w-full p-inputtext p-component tabular-nums" [formControl]="g.controls.value" />
                        @if (g.controls.value.invalid && g.controls.value.touched) {
                            <small class="text-danger">{{ g.controls.value.hasError(numberError) ? numberMessage : 'Değer zorunludur.' }}</small>
                        }
                    </div>
                    <div class="col-span-6 sm:col-span-2">
                        <label [attr.for]="'lab-unit-' + i" class="block text-xs font-medium text-muted-color mb-1">Birim</label>
                        <input [id]="'lab-unit-' + i" type="text" class="w-full p-inputtext p-component" [formControl]="g.controls.unit" [attr.maxlength]="unitMax" placeholder="Örn. U/L" />
                    </div>
                    <div class="col-span-5 sm:col-span-2">
                        <label [attr.for]="'lab-low-' + i" class="block text-xs font-medium text-muted-color mb-1">Referans alt</label>
                        <input [id]="'lab-low-' + i" type="text" inputmode="decimal" class="w-full p-inputtext p-component tabular-nums" [formControl]="g.controls.referenceLow" />
                    </div>
                    <div class="col-span-5 sm:col-span-1">
                        <label [attr.for]="'lab-high-' + i" class="block text-xs font-medium text-muted-color mb-1">Üst</label>
                        <input [id]="'lab-high-' + i" type="text" inputmode="decimal" class="w-full p-inputtext p-component tabular-nums" [formControl]="g.controls.referenceHigh" />
                    </div>
                    <div class="col-span-2 sm:col-span-1 flex justify-end sm:pt-5">
                        <button pButton type="button" severity="danger" [text]="true" [rounded]="true" data-testid="lab-line-remove" [attr.aria-label]="'Değer satırını sil: ' + (g.controls.parameterName.value || i + 1)" (click)="removeRow(i)">
                            <i class="p-button-icon pi pi-trash"></i>
                        </button>
                    </div>
                    @if ((g.controls.referenceLow.touched || g.controls.referenceHigh.touched) && (g.controls.referenceLow.hasError(numberError) || g.controls.referenceHigh.hasError(numberError))) {
                        <small class="col-span-12 text-danger">{{ numberMessage }}</small>
                    } @else if (g.hasError(rangeError) && (g.controls.referenceLow.touched || g.controls.referenceHigh.touched)) {
                        <small class="col-span-12 text-danger">Referans alt sınırı üst sınırdan büyük olamaz.</small>
                    }
                </div>
            }
            @if (lines().length >= max) {
                <small class="text-muted-color">En fazla {{ max }} değer satırı eklenebilir.</small>
            }
        </div>
    `
})
export class LabResultLinesEditorComponent {
    readonly lines = input.required<LabResultLinesFormArray>();

    protected readonly max = LAB_RESULT_LINES_MAX;
    protected readonly parameterMax = LAB_RESULT_LINE_PARAMETER_MAX;
    protected readonly unitMax = LAB_RESULT_LINE_UNIT_MAX;
    protected readonly numberError = LAB_RESULT_LINE_NUMBER_ERROR_KEY;
    protected readonly rangeError = LAB_RESULT_LINE_RANGE_ERROR_KEY;
    protected readonly numberMessage = 'Sayı girin (virgül ya da nokta); en çok 4 ondalık.';

    // Satır ekleme/silme dizi değerini değiştirir ama Angular kirli işaretlemez; kaydedilmemiş değişiklik sorusu bunu görmeli.
    addRow(): void {
        if (this.lines().length < this.max) {
            this.lines().push(createLabResultLineGroup());
            this.lines().markAsDirty();
        }
    }

    removeRow(index: number): void {
        this.lines().removeAt(index);
        this.lines().markAsDirty();
    }
}
