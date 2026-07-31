import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

type BaseTables = Database["public"]["Tables"];
type BaseLeads = BaseTables["leads"];

type CompanyMemberRole = "owner" | "admin" | "manager" | "sales" | "inventory" | "viewer";
type CompanyMemberStatus = "active" | "suspended";
type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

type CompanyMembersTable = {
  Row: {
    id: string;
    company_id: string;
    user_id: string;
    role: CompanyMemberRole;
    permissions: string[];
    status: CompanyMemberStatus;
    invited_by: string | null;
    joined_at: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    company_id: string;
    user_id: string;
    role?: CompanyMemberRole;
    permissions?: string[];
    status?: CompanyMemberStatus;
    invited_by?: string | null;
    joined_at?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<CompanyMembersTable["Insert"]>;
  Relationships: [
    {
      foreignKeyName: "company_members_company_id_fkey";
      columns: ["company_id"];
      isOneToOne: false;
      referencedRelation: "companies";
      referencedColumns: ["id"];
    },
  ];
};

type CompanyInvitationsTable = {
  Row: {
    id: string;
    company_id: string;
    email: string;
    role: Exclude<CompanyMemberRole, "owner">;
    permissions: string[];
    token_hash: string;
    status: InvitationStatus;
    invited_by: string;
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    company_id: string;
    email: string;
    role?: Exclude<CompanyMemberRole, "owner">;
    permissions?: string[];
    token_hash: string;
    status?: InvitationStatus;
    invited_by: string;
    expires_at?: string;
    accepted_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<CompanyInvitationsTable["Insert"]>;
  Relationships: [
    {
      foreignKeyName: "company_invitations_company_id_fkey";
      columns: ["company_id"];
      isOneToOne: false;
      referencedRelation: "companies";
      referencedColumns: ["id"];
    },
  ];
};

type CrmActivitiesTable = {
  Row: {
    id: string;
    company_id: string;
    lead_id: string;
    actor_id: string;
    activity_type: "note" | "call" | "email" | "meeting" | "status_change";
    body: string | null;
    metadata: Json;
    occurred_at: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    company_id: string;
    lead_id: string;
    actor_id: string;
    activity_type: CrmActivitiesTable["Row"]["activity_type"];
    body?: string | null;
    metadata?: Json;
    occurred_at?: string;
    created_at?: string;
  };
  Update: Partial<CrmActivitiesTable["Insert"]>;
  Relationships: [];
};

type InventoryLocationsTable = {
  Row: {
    id: string;
    company_id: string;
    name: string;
    code: string | null;
    address: string | null;
    is_default: boolean;
    active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    company_id: string;
    name: string;
    code?: string | null;
    address?: string | null;
    is_default?: boolean;
    active?: boolean;
    created_by: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<InventoryLocationsTable["Insert"]>;
  Relationships: [];
};

type InventoryMovementsTable = {
  Row: {
    id: string;
    company_id: string;
    listing_id: string;
    location_id: string | null;
    movement_type:
      | "opening"
      | "adjustment"
      | "purchase"
      | "sale"
      | "return"
      | "transfer_in"
      | "transfer_out";
    quantity_delta: number;
    balance_after: number;
    reference_type: string | null;
    reference_id: string | null;
    note: string | null;
    created_by: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    company_id: string;
    listing_id: string;
    location_id?: string | null;
    movement_type: InventoryMovementsTable["Row"]["movement_type"];
    quantity_delta: number;
    balance_after: number;
    reference_type?: string | null;
    reference_id?: string | null;
    note?: string | null;
    created_by: string;
    created_at?: string;
  };
  Update: Partial<InventoryMovementsTable["Insert"]>;
  Relationships: [];
};

type ExtendedLeadsTable = {
  Row: BaseLeads["Row"] & {
    assigned_to: string | null;
    source: string | null;
    estimated_value: number | null;
    next_follow_up_at: string | null;
    tags: string[];
  };
  Insert: BaseLeads["Insert"] & {
    assigned_to?: string | null;
    source?: string | null;
    estimated_value?: number | null;
    next_follow_up_at?: string | null;
    tags?: string[];
  };
  Update: BaseLeads["Update"] & {
    assigned_to?: string | null;
    source?: string | null;
    estimated_value?: number | null;
    next_follow_up_at?: string | null;
    tags?: string[];
  };
  Relationships: BaseLeads["Relationships"];
};

export type ErpDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Omit<BaseTables, "leads"> & {
      leads: ExtendedLeadsTable;
      company_members: CompanyMembersTable;
      company_invitations: CompanyInvitationsTable;
      crm_activities: CrmActivitiesTable;
      inventory_locations: InventoryLocationsTable;
      inventory_movements: InventoryMovementsTable;
    };
    Functions: Database["public"]["Functions"] & {
      accept_company_invitation: { Args: { _token: string }; Returns: string };
      adjust_company_inventory: {
        Args: {
          _listing_id: string;
          _quantity_delta: number;
          _note?: string | null;
          _location_id?: string | null;
        };
        Returns: number;
      };
    };
  };
};

export function asErpClient(client: SupabaseClient<Database>): SupabaseClient<ErpDatabase> {
  return client as unknown as SupabaseClient<ErpDatabase>;
}
