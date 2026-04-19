import { Routes } from '@angular/router';
import { ClinicDetailPageComponent } from '@/app/features/clinics/pages/clinic-detail-page/clinic-detail-page.component';
import { ClinicsListPageComponent } from '@/app/features/clinics/pages/clinics-list-page/clinics-list-page.component';

export default [
    { path: '', component: ClinicsListPageComponent },
    { path: ':clinicId', component: ClinicDetailPageComponent }
] as Routes;
