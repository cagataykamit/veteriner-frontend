import { Component, inject, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImagingRecordFormComponent } from '@/app/entities/procedure/components/imaging-record-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { HAS_UNSAVED_CHANGES, type HasUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { injectReturnTarget } from '@/app/shared/utils/return-target.utils';

/** Yeni görüntüleme kaydı: form adres çubuğu bağlamıyla (hasta / muayene) çalışır; kayıt ve dosyalar tamamlanınca detaya gider. */
@Component({
    selector: 'app-imaging-new-page',
    standalone: true,
    imports: [AppPageHeaderComponent, ImagingRecordFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header categoryLink="/panel/imaging" categoryLinkLabel="Listeye dön" title="Yeni görüntüleme" description="Röntgen, ultrason, klinik fotoğraf veya PDF raporu hastaya bağlayın." />
        <app-imaging-record-form [contextParams]="contextParams" (saved)="onSaved($event)" (cancelled)="goBack()" />
    `
})
export class ImagingNewPageComponent implements HasUnsavedChanges {
    private readonly router = inject(Router);
    readonly contextParams = inject(ActivatedRoute).snapshot.queryParamMap;
    private readonly embeddedForm = viewChild(HAS_UNSAVED_CHANGES);
    /** İptal: geldiği yer (`returnUrl`, önceki sayfa, bağlamdaki kart), yoksa liste. */
    private readonly returnTarget = injectReturnTarget('/panel/imaging');

    hasUnsavedChanges(): boolean {
        return this.embeddedForm()?.hasUnsavedChanges() ?? false;
    }

    goBack(): void {
        void this.router.navigateByUrl(this.returnTarget.url);
    }

    onSaved(id: string): void {
        void this.router.navigate(['/panel/imaging', id], { queryParams: { saved: 'created' } });
    }
}
