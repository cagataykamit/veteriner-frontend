import { Component, computed, inject, input, model, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMINATION_TEMPLATES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ExaminationTemplateDto } from '@/app/entities/examination-template/models/examination-template.model';
import { ExaminationTemplatesService } from '@/app/entities/examination-template/services/examination-templates.service';
import { templateEstimatedChargeText } from '@/app/entities/examination-template/utils/examination-template.utils';
import { VISIT_ARRIVAL_REASON_MAX } from '@/app/entities/visit/models/visit-vm.model';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

/** Seçicide aktif şablonlar tek istekte gelir (sözleşmedeki en büyük sayfa); arama istemcide süzülür. */
const TEMPLATE_PICKER_PAGE_SIZE = 200;

/**
 * Geliş hazırlığı alanları (CHECKIN-001/002/004): geliş nedeni ve isteğe bağlı şablon / paket. Geliş diyaloğu ve "Hazırlığı düzenle"
 * aynı alanları kullanır. Şablon seçici yalnız `ExaminationTemplates.Read` ile görünür; seçilen şablon gelişte uygulanmaz, paket
 * fiyatı (yoksa kalem toplamı) yalnız tahmini ücret olarak gösterilir.
 */
@Component({
    selector: 'app-visit-preparation-fields',
    standalone: true,
    imports: [FormsModule, InputTextModule, SelectModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12">
                <label for="vp-reason" class="block text-sm font-medium text-muted-color mb-2">Geliş nedeni (isteğe bağlı)</label>
                <input
                    pInputText
                    id="vp-reason"
                    class="w-full"
                    [maxlength]="reasonMax"
                    [ngModel]="reason()"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="reason.set($event)"
                    placeholder="Örn. kulak kaşıntısı, 3 gündür"
                    autocomplete="off"
                    data-testid="prep-reason"
                />
            </div>
            @if (canReadTemplates) {
                <div class="col-span-12 min-w-0" data-testid="prep-template-field">
                    <label for="vp-template" class="block text-sm font-medium text-muted-color mb-2">Şablon / paket (isteğe bağlı)</label>
                    <p-select
                        inputId="vp-template"
                        [options]="options()"
                        optionLabel="label"
                        optionValue="value"
                        [ngModel]="templateId()"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="templateId.set($event || null)"
                        [filter]="true"
                        filterBy="label"
                        filterPlaceholder="Ara…"
                        [showClear]="true"
                        placeholder="Seçilmedi"
                        emptyMessage="Tanımlı şablon yok."
                        emptyFilterMessage="Eşleşen şablon yok."
                        [loading]="loading()"
                        appendTo="body"
                        class="w-full"
                    />
                    @if (loadError()) {
                        <small class="block mt-1 text-red-500" role="alert">{{ loadError() }}</small>
                    }
                    @if (templateId()) {
                        @if (estimate(); as text) {
                            <small class="block mt-1 font-medium" data-testid="prep-estimate">{{ text }}</small>
                        }
                        <small class="block mt-1 text-muted-color" data-testid="prep-template-hint">Şablon gelişte uygulanmaz; hekim muayenede onaylar.</small>
                    }
                </div>
            }
        </div>
    `
})
export class VisitPreparationFieldsComponent implements OnInit {
    readonly reason = model('');
    readonly templateId = model<string | null>(null);
    /** Hazırlıkta duran şablon (sonradan pasifleşmiş olabilir): aktif listede yoksa seçenek olarak eklenir. */
    readonly currentTemplate = input<{ id: string; name: string } | null>(null);

    private readonly templatesService = inject(ExaminationTemplatesService);

    readonly canReadTemplates = inject(AuthService).hasOperationClaim(EXAMINATION_TEMPLATES_READ_CLAIM);
    readonly reasonMax = VISIT_ARRIVAL_REASON_MAX;
    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    private readonly templates = signal<ExaminationTemplateDto[]>([]);

    readonly options = computed<SelectOption[]>(() => {
        const list: SelectOption[] = this.templates().map((t) => ({ label: t.name, value: t.id }));
        const current = this.currentTemplate();

        return current && !list.some((o) => o.value === current.id) ? [{ label: current.name, value: current.id }, ...list] : list;
    });
    readonly estimate = computed(() => {
        const t = this.templates().find((x) => x.id === this.templateId());

        return t ? templateEstimatedChargeText(t) : null;
    });

    ngOnInit(): void {
        if (!this.canReadTemplates) {
            return;
        }

        this.loading.set(true);
        this.templatesService.list({ page: 1, pageSize: TEMPLATE_PICKER_PAGE_SIZE }).subscribe({
            next: (r) => {
                this.templates.set(r.items.filter((t) => t.isActive));
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(e instanceof Error ? e.message : 'Şablonlar yüklenemedi; şablonsuz devam edebilirsiniz.');
                this.loading.set(false);
            }
        });
    }
}
