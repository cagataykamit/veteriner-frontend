import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { VisitPreparationFieldsComponent } from '@/app/entities/visit/components/visit-preparation-fields.component';
import type { TodayItemVm, VisitVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Bugün "⋯ → Hazırlığı düzenle" (`Visits.Update`, sözleşme §4.5): geliş nedeni ve şablon / paket tam yazılır; boş bırakılan alan
 * temizlenir. Yetki ve açık geliş denetimi çağıran sayfadadır (sunucu da tamamlanmış gelişte `Visits.NotOpen` döner).
 */
@Component({
    selector: 'app-visit-preparation-dialog',
    standalone: true,
    imports: [DialogModule, ButtonModule, VisitPreparationFieldsComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog header="Hazırlığı düzenle" [modal]="true" [dismissableMask]="!submitting()" [closable]="!submitting()" [style]="{ width: 'min(560px, 95vw)' }" [(visible)]="visible">
            @if (item(); as it) {
                <p class="mt-0 mb-4">
                    <span class="font-medium">{{ it.petName }}</span> · {{ it.clientName }}
                </p>
            }
            @if (visible()) {
                <app-visit-preparation-fields [(reason)]="reason" [(templateId)]="templateId" [currentTemplate]="currentTemplate()" />
            }
            @if (submitError()) {
                <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
            }
            <ng-template #footer>
                <button pButton type="button" severity="secondary" (click)="visible.set(false)" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                <button pButton type="button" [disabled]="submitting()" data-testid="prep-save" (click)="onSubmit()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kaydet</button>
            </ng-template>
        </p-dialog>
    `
})
export class VisitPreparationDialogComponent {
    readonly visible = model(false);
    readonly item = input<TodayItemVm | null>(null);
    readonly saved = output<VisitVm>();

    private readonly visitsService = inject(VisitsService);

    readonly reason = signal('');
    readonly templateId = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly currentTemplate = computed(() => {
        const it = this.item();

        return it?.preparedExaminationTemplateId ? { id: it.preparedExaminationTemplateId, name: it.preparedExaminationTemplateName ?? 'Hazırlanan şablon' } : null;
    });

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    const it = this.item();

                    this.reason.set(it?.arrivalReason ?? '');
                    this.templateId.set(it?.preparedExaminationTemplateId ?? null);
                    this.submitError.set(null);
                });
            }
        });
    }

    onSubmit(): void {
        const visitId = this.item()?.visitId;

        if (!visitId || this.submitting()) {
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);
        this.visitsService.setPreparation(visitId, { arrivalReason: this.reason(), preparedExaminationTemplateId: this.templateId() }).subscribe({
            next: (visit) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.saved.emit(visit);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, 'Hazırlık kaydedilemedi.'));
            }
        });
    }
}
