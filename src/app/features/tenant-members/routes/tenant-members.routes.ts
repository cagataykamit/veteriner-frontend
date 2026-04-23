import { Routes } from '@angular/router';
import { TenantMemberDetailPageComponent } from '@/app/features/tenant-members/pages/tenant-member-detail-page/tenant-member-detail-page.component';
import { TenantMembersListPageComponent } from '@/app/features/tenant-members/pages/tenant-members-list-page/tenant-members-list-page.component';
import { TenantRolePermissionMatrixPageComponent } from '@/app/features/tenant-members/pages/tenant-role-permission-matrix-page/tenant-role-permission-matrix-page.component';

export default [
    { path: '', component: TenantMembersListPageComponent },
    { path: 'role-permission-matrix', component: TenantRolePermissionMatrixPageComponent },
    { path: ':memberId', component: TenantMemberDetailPageComponent }
] as Routes;
