import { Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import type { ImportBatchDto, ImportDuplicateClientMode, ImportTableInfoDto } from '@/app/features/imports/models/import-api.model';
import {
    IMPORT_FIELDS,
    IMPORT_TABLE_LABELS,
    isRequiredField,
    mappingConfidence,
    missingRequired,
    type ImportColumnMaps
} from '@/app/features/imports/utils/import-schema.utils';
import { AppStatusTagComponent, type StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

interface SourceOption {
    label: string;
    value: string;
    disabled: boolean;
}

/** Adım 2: dosyadaki sütunları sistem alanlarına eşler; öneriler güven göstergesiyle gelir, kullanıcı düzeltir. */
@Component({
    selector: 'app-import-mapping-step',
    standalone: true,
    imports: [FormsModule, ButtonModule, MessageModule, SelectModule, AppStatusTagComponent],
    template: `
        <p class="text-muted-color mt-0">
            Dosyanızdaki sütunları sistem alanlarıyla eşleyin. Önerileri kontrol edin; * işaretli alanlar zorunludur. Yeni tür veya aşı tanımı oluşturulmaz.
        </p>

        @for (info of tables(); track info.table) {
            <section class="rounded-border border border-surface-200 dark:border-surface-700 p-4 mb-4">
                <div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                    <h6 class="m-0">{{ tableLabels[info.table] }}</h6>
                    <span class="text-sm text-muted-color">{{ info.rowCount }} satır · {{ info.columns.length }} sütun</span>
                </div>

                <div class="flex flex-col gap-3">
                    @for (f of fields[info.table]; track f.key) {
                        <div class="grid grid-cols-12 gap-2 items-center">
                            <label class="col-span-12 md:col-span-4 text-sm font-medium" [for]="'map-' + info.table + '-' + f.key">
                                {{ f.label }}@if (required(info.table, f.key)) {<span class="text-red-500"> *</span>}
                                @if (f.hint) {
                                    <span class="block font-normal text-xs text-muted-color">{{ f.hint }}</span>
                                }
                            </label>
                            <div class="col-span-9 md:col-span-6">
                                <p-select
                                    [inputId]="'map-' + info.table + '-' + f.key"
                                    [options]="optionsFor()[info.table + '|' + f.key]"
                                    optionLabel="label"
                                    optionValue="value"
                                    optionDisabled="disabled"
                                    placeholder="Eşleme yok"
                                    [showClear]="!readOnly()"
                                    [disabled]="readOnly()"
                                    [ngModel]="maps()[info.table]?.[f.key] ?? null"
                                    (ngModelChange)="setField(info.table, f.key, $event)"
                                    styleClass="w-full"
                                />
                            </div>
                            <div class="col-span-3 md:col-span-2">
                                @if (confidence(info, f.key); as c) {
                                    <app-status-tag [label]="c.label" [severity]="c.severity" />
                                }
                            </div>
                        </div>
                    }
                </div>

                @if (unusedColumns(info).length) {
                    <p class="text-sm text-muted-color mb-0 mt-4">
                        Eşlenmeyen sütunlar (aktarılmaz): {{ unusedColumns(info).join(', ') }}
                    </p>
                }
                @if (missing()[info.table]?.length) {
                    <p-message severity="warn" styleClass="w-full mt-3">Eksik zorunlu alan: {{ missing()[info.table]!.join('; ') }}</p-message>
                }
            </section>
        }

        <section class="rounded-border border border-surface-200 dark:border-surface-700 p-4 mb-4">
            <h6 class="mt-0 mb-2">Aynı müşteri sistemde zaten varsa</h6>
            <p-select
                inputId="importDupMode"
                [options]="duplicateOptions"
                optionLabel="label"
                optionValue="value"
                [disabled]="readOnly()"
                [ngModel]="duplicateMode()"
                (ngModelChange)="duplicateMode.set($event)"
                styleClass="w-full md:w-96"
                ariaLabel="Aynı müşteri davranışı"
            />
            <small class="block text-muted-color mt-2">Mevcut müşteri bilgileri hiçbir durumda güncellenmez; yalnızca hastalar bağlanır.</small>
        </section>

        @if (!readOnly()) {
            <div class="flex flex-wrap gap-2">
                <p-button icon="pi pi-check" label="Kaydet ve doğrula" [disabled]="!complete()" [loading]="busy()" (onClick)="submit.emit()" />
            </div>
            @if (!complete()) {
                <small class="block text-muted-color mt-2">Devam etmek için zorunlu alanları eşleyin.</small>
            }
        }
    `
})
export class ImportMappingStepComponent {
    readonly batch = input.required<ImportBatchDto>();
    readonly readOnly = input(false);
    readonly busy = input(false);
    readonly maps = model.required<ImportColumnMaps>();
    readonly duplicateMode = model<ImportDuplicateClientMode>('Match');
    readonly submit = output<void>();

    protected readonly tableLabels = IMPORT_TABLE_LABELS;
    protected readonly fields = IMPORT_FIELDS;
    protected readonly duplicateOptions: { label: string; value: ImportDuplicateClientMode }[] = [
        { label: 'Mevcut müşteriyle eşleştir (önerilen)', value: 'Match' },
        { label: 'O müşterinin satırını ve hastalarını atla', value: 'Skip' },
        { label: 'Hata olarak işaretle', value: 'Error' }
    ];

    protected readonly tables = computed(() => this.batch().tables ?? []);

    protected readonly missing = computed(() => {
        const result: Partial<Record<string, string[]>> = {};
        for (const info of this.tables()) {
            result[info.table] = missingRequired(info.table, this.maps()[info.table] ?? {});
        }
        return result;
    });

    protected readonly complete = computed(() => this.tables().length > 0 && this.tables().every((t) => !this.missing()[t.table]?.length));

    /** Her alan için seçenekler; aynı tabloda başka alana eşlenmiş sütun seçilemez. */
    protected readonly optionsFor = computed(() => {
        const result: Record<string, SourceOption[]> = {};
        for (const info of this.tables()) {
            const map = this.maps()[info.table] ?? {};
            for (const f of IMPORT_FIELDS[info.table]) {
                const usedElsewhere = new Set(Object.entries(map).filter(([k, v]) => k !== f.key && v).map(([, v]) => v as string));
                result[`${info.table}|${f.key}`] = info.columns.map((c) => ({ label: c.source, value: c.source, disabled: usedElsewhere.has(c.source) }));
            }
        }
        return result;
    });

    protected required = isRequiredField;

    protected setField(table: ImportTableInfoDto['table'], key: string, source: string | null): void {
        this.maps.update((cur) => ({ ...cur, [table]: { ...(cur[table] ?? {}), [key]: source } }));
    }

    protected confidence(info: ImportTableInfoDto, key: string): { label: string; severity: StatusTagSeverity } | null {
        const c = mappingConfidence(info.columns, this.maps()[info.table]?.[key] ?? null, key);
        if (!c) {
            return null;
        }
        return c === 'Exact' ? { label: 'Kesin', severity: 'success' } : c === 'Alias' ? { label: 'Benzer', severity: 'info' } : { label: 'Elle', severity: 'secondary' };
    }

    protected unusedColumns(info: ImportTableInfoDto): string[] {
        const used = new Set(Object.values(this.maps()[info.table] ?? {}).filter(Boolean));
        return info.columns.filter((c) => !used.has(c.source)).map((c) => c.source);
    }
}
