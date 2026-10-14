import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PrescriptionFormComponent } from '@/app/features/prescriptions/components/prescription-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-prescription-new-page',
    standalone: true,
    imports: [RouterLink, AppPageHeaderComponent, PrescriptionFormComponent],
    template: `
        <a routerLink="/panel/prescriptions" class="text-primary font-medium no-underline inline-block mb-4">← Reçete listesine dön</a>

        <app-page-header title="Yeni Reçete" description="Reçete kaydı oluşturun." />
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
