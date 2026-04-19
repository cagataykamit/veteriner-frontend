import { Routes } from '@angular/router';
import { ClinicCreatePageComponent } from '@/app/features/clinics/pages/clinic-create-page/clinic-create-page.component';
import { ClinicDetailPageComponent } from '@/app/features/clinics/pages/clinic-detail-page/clinic-detail-page.component';
import { ClinicsListPageComponent } from '@/app/features/clinics/pages/clinics-list-page/clinics-list-page.component';

export default [
    { path: '', component: ClinicsListPageComponent },
    { path: 'new', component: ClinicCreatePageComponent },
    { path: ':clinicId', component: ClinicDetailPageComponent }
] as Routes;
