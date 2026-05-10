import type {
    CreateProductCategoryRequest,
    ProductCategoryDto,
    ProductCategoryDtoPagedResult,
    UpdateProductCategoryRequest
} from '@/app/features/inventory/models/product-api.model';
import type { ProductCategoryFormValue } from '@/app/features/inventory/models/product-category-form.model';
import type { ProductCategoryListItemVm } from '@/app/features/inventory/models/product-vm.model';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v.trim() : EM;
}

function categoryActiveSeverity(isActive: boolean): StatusTagSeverity {
    return isActive ? 'success' : 'secondary';
}

function categoryActiveLabel(isActive: boolean): string {
    return isActive ? 'Aktif' : 'Pasif';
}

export function mapProductCategoryDtoToListVm(dto: ProductCategoryDto): ProductCategoryListItemVm {
    const isActive = dto.isActive === true;
    return {
        id: dto.id,
        name: str(dto.name),
        descriptionText: str(dto.description),
        isActive,
        statusLabel: categoryActiveLabel(isActive),
        statusSeverity: categoryActiveSeverity(isActive)
    };
}

export interface ProductCategoriesPagedVm {
    items: ProductCategoryListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export function mapPagedProductCategoriesToVm(res: ProductCategoryDtoPagedResult): ProductCategoriesPagedVm {
    const items = (res.items ?? []).map(mapProductCategoryDtoToListVm);
    return {
        items,
        page: res.page,
        pageSize: res.pageSize,
        totalItems: res.totalItems,
        totalPages: res.totalPages
    };
}

function optionalDescriptionOrNull(v: string): string | null {
    const t = v.trim();
    return t ? t : null;
}

export function mapProductCategoryFormToCreateRequest(value: ProductCategoryFormValue): CreateProductCategoryRequest {
    return {
        name: value.name.trim(),
        description: optionalDescriptionOrNull(value.description)
    };
}

export function mapProductCategoryFormToUpdateRequest(value: ProductCategoryFormValue): UpdateProductCategoryRequest {
    return mapProductCategoryFormToCreateRequest(value);
}

export function mapProductCategoryDtoToFormValue(dto: ProductCategoryDto): ProductCategoryFormValue {
    return {
        name: dto.name?.trim() ?? '',
        description: dto.description?.trim() ?? ''
    };
}

/** Ürün formu kategori dropdown — liste sayfası VM satırı. */
export function mapProductCategoryListItemVmToSelectOption(row: ProductCategoryListItemVm): SelectOption {
    return { label: row.name, value: row.id };
}
