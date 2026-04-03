import { Routes } from '@angular/router';
import { LabResultDetailPageComponent } from '@/app/features/lab-results/pages/lab-result-detail-page/lab-result-detail-page.component';
import { LabResultEditPageComponent } from '@/app/features/lab-results/pages/lab-result-edit-page/lab-result-edit-page.component';
import { LabResultNewPageComponent } from '@/app/features/lab-results/pages/lab-result-new-page/lab-result-new-page.component';
import { LabResultsListPageComponent } from '@/app/features/lab-results/pages/lab-results-list-page/lab-results-list-page.component';

export default [
    { path: '', component: LabResultsListPageComponent },
    { path: 'new', component: LabResultNewPageComponent },
    { path: ':id/edit', component: LabResultEditPageComponent },
    { path: ':id', component: LabResultDetailPageComponent }
] as Routes;
