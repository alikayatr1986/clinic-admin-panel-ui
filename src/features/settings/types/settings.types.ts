export type TimeframeStatus = 'draft' | 'active' | 'retired';

export interface TimeframeSetting {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  min_months: number;
  max_months: number | null;
  display_order: number;
  status: TimeframeStatus;
  referenced_cases_count: number;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_attestation?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeframeInput {
  code: string;
  name_en: string;
  name_ar: string;
  min_months: number;
  max_months: number | null;
  display_order: number;
}

export interface UpdateTimeframeInput {
  name_en: string;
  name_ar: string;
  min_months: number;
  max_months: number | null;
  display_order: number;
}

export interface ActivateTimeframeInput {
  approval_attestation: string;
}

export interface UpdateTimeframeParams {
  id: string;
  input: UpdateTimeframeInput;
}

export interface ActivateTimeframeParams {
  id: string;
  input: ActivateTimeframeInput;
}

export interface ReorderTimeframesInput {
  ordered_ids: string[];
}

export interface TimeframeListResponse {
  data: TimeframeSetting[];
}

export interface TimeframeSingleResponse {
  data: TimeframeSetting;
}

export interface TimeframeDeleteResponse {
  data: {
    deleted: boolean;
  };
}

export interface TimeframeReorderResponse {
  data: {
    ok: boolean;
  };
}

export type SettingsTabKey = 'timeframes' | 'procedures' | 'categories';

export interface SettingsTabsProps {
  activeTab: SettingsTabKey;
  onTabChange: (tab: SettingsTabKey) => void;
}

export interface TimeframeSettingsTableProps {
  timeframes: TimeframeSetting[];
  role: 'admin' | 'staff';
  isLoading: boolean;
  onEdit: (tf: TimeframeSetting) => void;
  onActivate: (tf: TimeframeSetting) => void;
  onRetire: (tf: TimeframeSetting) => void;
  onDelete: (tf: TimeframeSetting) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export interface TimeframeFormData {
  code?: string;
  name_en: string;
  name_ar: string;
  min_months: number;
  max_months: number | null;
  display_order: number;
}

export interface TimeframeFormDialogProps {
  isOpen: boolean;
  timeframe: TimeframeSetting | null;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (formData: TimeframeFormData) => void;
}

export interface ActivationAttestationDialogProps {
  isOpen: boolean;
  timeframe: TimeframeSetting | null;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (attestation: string) => void;
}

export interface SettingsPageProps {
  role?: 'admin' | 'staff';
  onExpired?: () => void;
}

export interface ProcedureSetting {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  display_order: number;
  status: TimeframeStatus;
  referenced_cases_count: number;
  referenced_leads_count: number;
}

export interface ProcedureFormData {
  code: string;
  name_en: string;
  name_ar: string;
  display_order: number;
}

export interface ProcedureFormDialogProps {
  procedure: ProcedureSetting | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (data: ProcedureFormData) => void;
}

export interface ProcedureSettingsTableProps {
  procedures: ProcedureSetting[];
  role: 'admin' | 'staff';
  onEdit: (procedure: ProcedureSetting) => void;
  onActivate: (procedure: ProcedureSetting) => void;
  onRetire: (procedure: ProcedureSetting) => void;
  onDelete: (procedure: ProcedureSetting) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}

export interface BlogCategorySetting { id: string; key: string; name_en: string; name_ar: string; status: 'active' | 'retired'; reference_count: number }
export interface BlogCategoryInput { key: string; name_en: string; name_ar: string }
export interface BlogCategoryPanelProps { role: string; onExpired?: () => void }
