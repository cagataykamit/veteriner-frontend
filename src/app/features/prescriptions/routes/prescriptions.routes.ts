import { Routes } from '@angular/router';
import { PrescriptionDetailPageComponent } from '@/app/features/prescriptions/pages/prescription-detail-page/prescription-detail-page.component';
import { PrescriptionEditPageComponent } from '@/app/features/prescriptions/pages/prescription-edit-page/prescription-edit-page.component';
import { PrescriptionNewPageComponent } from '@/app/features/prescriptions/pages/prescription-new-page/prescription-new-page.component';
import { PrescriptionsListPageComponent } from '@/app/features/prescriptions/pages/prescriptions-list-page/prescriptions-list-page.component';

export default [
    { path: '', component: PrescriptionsListPageComponent },
    { path: 'new', component: PrescriptionNewPageComponent },
    { path: ':id/edit', component: PrescriptionEditPageComponent },
    { path: ':id', component: PrescriptionDetailPageComponent }
] as Routes;
