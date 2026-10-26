import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImagingRecordFormComponent } from '@/app/features/imaging/components/imaging-record-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/** Yeni görüntüleme kaydı: form adres çubuğu bağlamıyla (hasta / muayene) çalışır; kayıt ve dosyalar tamamlanınca detaya gider. */
@Component({
    selector: 'app-imaging-new-page',
    standalone: true,
    imports: [AppPageHeaderComponent, ImagingRecordFormComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-page-header categoryLink="/panel/imaging" categoryLinkLabel="Listeye dön" title="Yeni görüntüleme" description="Röntgen, ultrason, klinik fotoğraf veya PDF raporu hastaya bağlayın." />
        <app-imaging-record-form [contextParams]="contextParams" (saved)="onSaved($event)" (cancelled)="goList()" />
    `
})
export class ImagingNewPageComponent {
    private readonly router = inject(Router);
    readonly contextParams = inject(ActivatedRoute).snapshot.queryParamMap;

    goList(): void {
        void this.router.navigate(['/panel/imaging']);
    }

    onSaved(id: string): void {
        void this.router.navigate(['/panel/imaging', id], { queryParams: { saved: 'created' } });
    }
}
