import { Component, inject, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TreatmentFormComponent } from '@/app/entities/procedure/components/treatment-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { HAS_UNSAVED_CHANGES, type HasUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { injectReturnTarget } from '@/app/shared/utils/return-target.utils';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-treatment-new-page',
    standalone: true,
    imports: [AppPageHeaderComponent, TreatmentFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header categoryLink="/panel/treatments" categoryLinkLabel="Tedavi listesine dön" title="Yeni Tedavi" description="Tedavi kaydı oluşturun." />
        <app-treatment-form [contextParams]="contextParams" (saved)="onSaved($event)" (cancelled)="goBack()" />
    `
})
export class TreatmentNewPageComponent implements HasUnsavedChanges {
    private readonly router = inject(Router);
    readonly contextParams = inject(ActivatedRoute).snapshot.queryParamMap;
    private readonly embeddedForm = viewChild(HAS_UNSAVED_CHANGES);
    /** İptal: geldiği yer (`returnUrl`, önceki sayfa, bağlamdaki kart), yoksa liste. */
    private readonly returnTarget = injectReturnTarget('/panel/treatments');

    hasUnsavedChanges(): boolean {
        return this.embeddedForm()?.hasUnsavedChanges() ?? false;
    }

    goBack(): void {
        void this.router.navigateByUrl(this.returnTarget.url);
    }

    onSaved(id: string): void {
        void this.router.navigate(['/panel/treatments', id], { queryParams: { saved: '1' } });
    }
}
