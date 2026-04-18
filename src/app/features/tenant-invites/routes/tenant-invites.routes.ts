import { Routes } from '@angular/router';
import { TenantInviteDetailPageComponent } from '@/app/features/tenant-invites/pages/tenant-invite-detail-page/tenant-invite-detail-page.component';
import { TenantInviteListPageComponent } from '@/app/features/tenant-invites/pages/tenant-invite-list-page/tenant-invite-list-page.component';
import { TenantInvitePanelPageComponent } from '@/app/features/tenant-invites/pages/tenant-invite-panel-page/tenant-invite-panel-page.component';

export default [
    { path: '', component: TenantInvitePanelPageComponent },
    { path: 'list', component: TenantInviteListPageComponent },
    { path: ':inviteId', component: TenantInviteDetailPageComponent }
] as Routes;
