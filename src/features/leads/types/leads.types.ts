export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'spam';
export type LeadMethod = 'email' | 'phone_call' | 'whatsapp' | 'telegram' | 'phone';
export interface Lead {
  id: string; name: string; country: string; city: string | null; procedure: string;
  email: string | null; phone_e164: string | null; preferred_contact: LeadMethod;
  primary_contact: string | null; message: string; lang: string; consent_accepted: boolean;
  consent_version: string; consented_at: string; status: LeadStatus; revision: number;
  created_at: string; updated_at: string; status_actor_id: string | null;
  status_changed_at: string | null; legacy_incomplete: boolean;
}
export interface LeadFilters { page: number; page_size: number; status: string; preferred_contact: string; procedure: string }
export interface LeadListResponse { data: Lead[]; meta: { page: number; page_size: number; total: number } }
export interface LeadListProps { onExpired: () => void; onOpen: (id: string) => void }
export interface LeadDetailProps { id: string; onExpired: () => void; onBack: () => void }
