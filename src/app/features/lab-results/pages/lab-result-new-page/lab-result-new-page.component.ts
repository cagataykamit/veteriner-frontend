import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LabResultFormComponent } from '@/app/features/lab-results/components/lab-result-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-lab-result-new-page',
    standalone: true,
    imports: [RouterLink, AppPageHeaderComponent, LabResultFormComponent],
    template: `
        <a routerLink="/panel/lab-results" class="text-primary font-medium no-underline inline-block mb-4">← Listeye dön</a>

        <app-page-header title="Yeni lab istemi" description="Lab istemi oluşturun; sonuç henüz yoksa sonuç alanlarını boş bırakın, sonra girebilirsiniz." />
        <app-lab-result-form [contextParams]="contextParams" (saved)="onSaved($event)" (cancelled)="goList()" />
    `
})
export class LabResultNewPageComponent {
    private readonly router = inject(Router);
    readonly contextParams = inject(ActivatedRoute).snapshot.queryParamMap;

    goList(): void {
        void this.router.navigate(['/panel/lab-results']);
    }

    onSaved(id: string): void {
        void this.router.navigate(['/panel/lab-results', id], { queryParams: { saved: 'created' } });
    }
}
