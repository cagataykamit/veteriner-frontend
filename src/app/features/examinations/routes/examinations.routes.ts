import { Routes } from '@angular/router';
import { ExaminationDetailPageComponent } from '@/app/features/examinations/pages/examination-detail-page/examination-detail-page.component';
import { ExaminationEditPageComponent } from '@/app/features/examinations/pages/examination-edit-page/examination-edit-page.component';
import { ExaminationNewPageComponent } from '@/app/features/examinations/pages/examination-new-page/examination-new-page.component';
import { ExaminationsListPageComponent } from '@/app/features/examinations/pages/examinations-list-page/examinations-list-page.component';

export default [
    { path: '', component: ExaminationsListPageComponent },
    { path: 'new', component: ExaminationNewPageComponent },
    { path: ':id/edit', component: ExaminationEditPageComponent },
    { path: ':id', component: ExaminationDetailPageComponent }
] as Routes;
