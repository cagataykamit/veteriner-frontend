import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PrescriptionFormComponent } from '@/app/features/prescriptions/components/prescription-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-prescription-new-page',
    standalone: true,
    imports: [AppPageHeaderComponent, PrescriptionFormComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-page-header categoryLink="/panel/prescriptions" categoryLinkLabel="Reçete listesine dön" title="Yeni Reçete" description="Reçete kaydı oluşturun." />
        <app-prescription-form [contextParams]="contextParams" (saved)="onSaved($event)" (cancelled)="goList()" />
    `
})
export class PrescriptionNewPageComponent {
    private readonly router = inject(Router);
    readonly contextParams = inject(ActivatedRoute).snapshot.queryParamMap;

    goList(): void {
        void this.router.navigate(['/panel/prescriptions']);
    }

    onSaved(id: string): void {
        void this.router.navigate(['/panel/prescriptions', id], { queryParams: { saved: '1' } });
    }
}
