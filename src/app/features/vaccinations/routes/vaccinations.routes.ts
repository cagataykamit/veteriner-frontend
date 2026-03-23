import { Routes } from '@angular/router';
import { VaccinationDetailPageComponent } from '@/app/features/vaccinations/pages/vaccination-detail-page/vaccination-detail-page.component';
import { VaccinationNewPageComponent } from '@/app/features/vaccinations/pages/vaccination-new-page/vaccination-new-page.component';
import { VaccinationsListPageComponent } from '@/app/features/vaccinations/pages/vaccinations-list-page/vaccinations-list-page.component';

export default [
    { path: '', component: VaccinationsListPageComponent },
    { path: 'new', component: VaccinationNewPageComponent },
    { path: ':id', component: VaccinationDetailPageComponent }
] as Routes;
