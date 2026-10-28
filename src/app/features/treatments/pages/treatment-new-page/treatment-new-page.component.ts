import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TreatmentFormComponent } from '@/app/entities/procedure/components/treatment-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-treatment-new-page',
    standalone: true,
    imports: [AppPageHeaderComponent, TreatmentFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header categoryLink="/panel/treatments" categoryLinkLabel="Tedavi listesine dön" title="Yeni Tedavi" description="Tedavi kaydı oluşturun." />
        <app-treatment-form [contextParams]="contextParams" (saved)="onSaved($event)" (cancelled)="goList()" />
    `
})
export class TreatmentNewPageComponent {
    private readonly router = inject(Router);
    readonly contextParams = inject(ActivatedRoute).snapshot.queryParamMap;

    goList(): void {
        void this.router.navigate(['/panel/treatments']);
    }

    onSaved(id: string): void {
        void this.router.navigate(['/panel/treatments', id], { queryParams: { saved: '1' } });
    }
}
