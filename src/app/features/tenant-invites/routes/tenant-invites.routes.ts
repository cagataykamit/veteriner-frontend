import { Routes } from '@angular/router';
import { TenantInviteListPageComponent } from '@/app/features/tenant-invites/pages/tenant-invite-list-page/tenant-invite-list-page.component';
import { TenantInvitePanelPageComponent } from '@/app/features/tenant-invites/pages/tenant-invite-panel-page/tenant-invite-panel-page.component';

export default [
    { path: '', component: TenantInvitePanelPageComponent },
    { path: 'list', component: TenantInviteListPageComponent }
] as Routes;
