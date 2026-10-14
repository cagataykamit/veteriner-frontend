import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import type { AdministrationBatchPicker } from '@/app/features/administrations/utils/administration-batch-picker';

/**
 * Parti seçimi alanı (seri no / SKT): "Otomatik" FEFO + manuel parti, süresi geçmiş parti devre dışı,
 * kullanılabilir/süresi geçmiş miktar özeti ve rehber metni. Durum `createAdministrationBatchPicker` ile üretilir.
 */
@Component({
    selector: 'app-administration-batch-field',
    standalone: true,
    imports: [ReactiveFormsModule, SelectModule],
    template: `
        <div data-testid="administration-batch">
            <label [for]="inputId()" class="block text-sm font-medium text-muted-color mb-2">Parti (seri no / SKT)</label>
            @if (picker().loading()) {
                <small class="text-muted-color" role="status">Parti bilgisi yükleniyor…</small>
            } @else if (picker().error()) {
                <small class="text-muted-color block" role="status">
                    {{ picker().error() }} Düşüm, SKT'si en yakın uygun partiden otomatik yapılır.
                </small>
            } @else if (picker().info(); as info) {
                @if (info.batches.length > 0) {
                    <p-select
                        [inputId]="inputId()"
                        [formControl]="batchControl()"
                        [options]="picker().options()"
                        optionLabel="label"
                        optionValue="value"
                        optionDisabled="disabled"
                        appendTo="body"
                        styleClass="w-full"
                    />
                } @else {
                    <small class="text-muted-color block">Bu üründe partili stok yok.</small>
                }
                <small class="block mt-1 text-muted-color" data-testid="batch-availability">
                    Kullanılabilir: {{ info.availableText }} {{ info.unit }}
                    @if (info.expiredQuantity > 0) {
                        <span class="text-red-500"> · süresi geçmiş: {{ info.expiredText }} {{ info.unit }} (kullanılamaz)</span>
                    }
                </small>
                @if (picker().guide(); as guide) {
                    <small class="block mt-1" [class.text-muted-color]="!guide.warn" [class.text-red-500]="guide.warn" role="status" data-testid="administration-batch-guide">{{ guide.text }}</small>
                }
            }
        </div>
    `
})
export class AdministrationBatchFieldComponent {
    readonly picker = input.required<AdministrationBatchPicker>();
    readonly batchControl = input.required<FormControl<string>>();
    readonly inputId = input('ad-batch');
}
