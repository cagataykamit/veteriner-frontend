import { Routes } from '@angular/router';
import { TreatmentDetailPageComponent } from '@/app/features/treatments/pages/treatment-detail-page/treatment-detail-page.component';
import { TreatmentEditPageComponent } from '@/app/features/treatments/pages/treatment-edit-page/treatment-edit-page.component';
import { TreatmentNewPageComponent } from '@/app/features/treatments/pages/treatment-new-page/treatment-new-page.component';
import { TreatmentsListPageComponent } from '@/app/features/treatments/pages/treatments-list-page/treatments-list-page.component';

export default [
    { path: '', component: TreatmentsListPageComponent },
    { path: 'new', component: TreatmentNewPageComponent },
    { path: ':id/edit', component: TreatmentEditPageComponent },
    { path: ':id', component: TreatmentDetailPageComponent }
] as Routes;
