import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TreatmentFormComponent } from '@/app/features/treatments/components/treatment-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-treatment-new-page',
    standalone: true,
    imports: [RouterLink, AppPageHeaderComponent, TreatmentFormComponent],
    template: `
        <a routerLink="/panel/treatments" class="text-primary font-medium no-underline inline-block mb-4">← Tedavi listesine dön</a>

        <app-page-header title="Yeni Tedavi" description="Tedavi kaydı oluşturun." />
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
