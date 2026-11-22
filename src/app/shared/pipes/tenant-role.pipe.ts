import { Pipe, PipeTransform } from '@angular/core';
import { tenantRoleLabel } from '@/app/core/auth/tenant-role-labels';

/** Rol adı → Türkçe görünen ad (`Admin` → "İşletme yöneticisi"); kural `tenantRoleLabel`. */
@Pipe({ name: 'tenantRole', pure: true })
export class TenantRolePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        return tenantRoleLabel(value);
    }
}
