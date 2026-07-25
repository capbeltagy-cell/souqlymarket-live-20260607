import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type BaseTables = Database["public"]["Tables"];

export type CompanyProspectStatus =
  | "new"
  | "not_contacted"
  | "whatsapp_sent"
  | "email_sent"
  | "called"
  | "interested"
  | "follow_up"
  | "joined"
  | "rejected"
  | "invalid";

type CompanyProspectsTable = {
  Row: {
    id: string;
    name_ar: string;
    name_en: string | null;
    industry: string | null;
    governorate: string | null;
    city: string | null;
    industrial_zone: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    facebook_url: string | null;
    linkedin_url: string | null;
    description: string | null;
    source_name: string | null;
    source_url: string | null;
    contact_person: string | null;
    contact_status: CompanyProspectStatus;
    assigned_to: string | null;
    last_contacted_at: string | null;
    next_follow_up_at: string | null;
    notes: string | null;
    claimed_company_id: string | null;
    claimed_at: string | null;
    is_published: boolean;
    data_quality_score: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    name_ar: string;
    name_en?: string | null;
    industry?: string | null;
    governorate?: string | null;
    city?: string | null;
    industrial_zone?: string | null;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    facebook_url?: string | null;
    linkedin_url?: string | null;
    description?: string | null;
    source_name?: string | null;
    source_url?: string | null;
    contact_person?: string | null;
    contact_status?: CompanyProspectStatus;
    assigned_to?: string | null;
    last_contacted_at?: string | null;
    next_follow_up_at?: string | null;
    notes?: string | null;
    claimed_company_id?: string | null;
    claimed_at?: string | null;
    is_published?: boolean;
    data_quality_score?: number;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<CompanyProspectsTable["Insert"]>;
  Relationships: [
    {
      foreignKeyName: "company_prospects_claimed_company_id_fkey";
      columns: ["claimed_company_id"];
      isOneToOne: false;
      referencedRelation: "companies";
      referencedColumns: ["id"];
    },
  ];
};

type CompanyProspectActivitiesTable = {
  Row: {
    id: string;
    prospect_id: string;
    activity_type: "note" | "whatsapp" | "email" | "call" | "status_change" | "follow_up" | "claim";
    details: string | null;
    old_status: string | null;
    new_status: string | null;
    created_by: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    prospect_id: string;
    activity_type: CompanyProspectActivitiesTable["Row"]["activity_type"];
    details?: string | null;
    old_status?: string | null;
    new_status?: string | null;
    created_by?: string | null;
    created_at?: string;
  };
  Update: Partial<CompanyProspectActivitiesTable["Insert"]>;
  Relationships: [
    {
      foreignKeyName: "company_prospect_activities_prospect_id_fkey";
      columns: ["prospect_id"];
      isOneToOne: false;
      referencedRelation: "company_prospects";
      referencedColumns: ["id"];
    },
  ];
};

type CompanyClaimRequestsTable = {
  Row: {
    id: string;
    prospect_id: string;
    requester_id: string;
    requester_name: string;
    requester_phone: string | null;
    requester_email: string | null;
    job_title: string | null;
    evidence_url: string | null;
    note: string | null;
    status: "pending" | "approved" | "rejected";
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_note: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    prospect_id: string;
    requester_id: string;
    requester_name: string;
    requester_phone?: string | null;
    requester_email?: string | null;
    job_title?: string | null;
    evidence_url?: string | null;
    note?: string | null;
    status?: "pending" | "approved" | "rejected";
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    review_note?: string | null;
    created_at?: string;
  };
  Update: Partial<CompanyClaimRequestsTable["Insert"]>;
  Relationships: [
    {
      foreignKeyName: "company_claim_requests_prospect_id_fkey";
      columns: ["prospect_id"];
      isOneToOne: false;
      referencedRelation: "company_prospects";
      referencedColumns: ["id"];
    },
  ];
};

type CompanyProspectDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: BaseTables & {
      company_prospects: CompanyProspectsTable;
      company_prospect_activities: CompanyProspectActivitiesTable;
      company_claim_requests: CompanyClaimRequestsTable;
    };
  };
};

export function asCompanyProspectClient(
  client: SupabaseClient<Database>,
): SupabaseClient<CompanyProspectDatabase> {
  return client as unknown as SupabaseClient<CompanyProspectDatabase>;
}
