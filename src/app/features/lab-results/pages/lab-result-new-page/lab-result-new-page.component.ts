import { Component, inject, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LabResultFormComponent } from '@/app/entities/procedure/components/lab-result-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { HAS_UNSAVED_CHANGES, type HasUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { injectReturnTarget } from '@/app/shared/utils/return-target.utils';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-lab-result-new-page',
    standalone: true,
    imports: [AppPageHeaderComponent, LabResultFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header categoryLink="/panel/lab-results" categoryLinkLabel="Listeye dön" title="Yeni lab istemi" description="Lab istemi oluşturun; sonuç henüz yoksa sonuç alanlarını boş bırakın, sonra girebilirsiniz." />
        <app-lab-result-form [contextParams]="contextParams" (saved)="onSaved($event)" (cancelled)="goBack()" />
    `
})
export class LabResultNewPageComponent implements HasUnsavedChanges {
    private readonly router = inject(Router);
    readonly contextParams = inject(ActivatedRoute).snapshot.queryParamMap;
    private readonly embeddedForm = viewChild(HAS_UNSAVED_CHANGES);
    /** İptal: geldiği yer (`returnUrl`, önceki sayfa, bağlamdaki kart), yoksa liste. */
    private readonly returnTarget = injectReturnTarget('/panel/lab-results');

    hasUnsavedChanges(): boolean {
        return this.embeddedForm()?.hasUnsavedChanges() ?? false;
    }

    goBack(): void {
        void this.router.navigateByUrl(this.returnTarget.url);
    }

    onSaved(id: string): void {
        void this.router.navigate(['/panel/lab-results', id], { queryParams: { saved: 'created' } });
    }
}
