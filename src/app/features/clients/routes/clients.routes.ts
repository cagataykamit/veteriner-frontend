import { Routes } from '@angular/router';
import { ClientDetailPageComponent } from '@/app/features/clients/pages/client-detail-page/client-detail-page.component';
import { ClientEditPageComponent } from '@/app/features/clients/pages/client-edit-page/client-edit-page.component';
import { ClientNewPageComponent } from '@/app/features/clients/pages/client-new-page/client-new-page.component';
import { ClientsListPageComponent } from '@/app/features/clients/pages/clients-list-page/clients-list-page.component';

export default [
    { path: '', component: ClientsListPageComponent },
    { path: 'new', component: ClientNewPageComponent },
    { path: ':id/edit', component: ClientEditPageComponent },
    { path: ':id', component: ClientDetailPageComponent }
] as Routes;
