import { Routes } from '@angular/router';
import { HospitalizationDetailPageComponent } from '@/app/features/hospitalizations/pages/hospitalization-detail-page/hospitalization-detail-page.component';
import { HospitalizationEditPageComponent } from '@/app/features/hospitalizations/pages/hospitalization-edit-page/hospitalization-edit-page.component';
import { HospitalizationNewPageComponent } from '@/app/features/hospitalizations/pages/hospitalization-new-page/hospitalization-new-page.component';
import { HospitalizationsListPageComponent } from '@/app/features/hospitalizations/pages/hospitalizations-list-page/hospitalizations-list-page.component';

export default [
    { path: '', component: HospitalizationsListPageComponent },
    { path: 'new', component: HospitalizationNewPageComponent },
    { path: ':id/edit', component: HospitalizationEditPageComponent },
    { path: ':id', component: HospitalizationDetailPageComponent }
] as Routes;
