/** Single source of truth for Souqly role routing and UI capabilities. */
export const APP_ROLES = [
  "super_admin",
  "admin",
  "moderator",
  "finance_admin",
  "support_admin",
  "company_owner",
  "company_manager",
  "employee",
  "company",
  "agent",
  "customer",
  "buyer",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ADMIN_ROLES: readonly AppRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "finance_admin",
  "support_admin",
];

export const COMPANY_ROLES: readonly AppRole[] = [
  "company_owner",
  "company_manager",
  "employee",
  "company",
];

export function isAdminRole(roles: readonly string[]): boolean {
  return roles.some((role) => ADMIN_ROLES.includes(role as AppRole));
}

export function isCompanyRole(roles: readonly string[]): boolean {
  return roles.some((role) => COMPANY_ROLES.includes(role as AppRole));
}

export type CompanyCapability =
  | "company.settings"
  | "company.team"
  | "company.products"
  | "company.orders"
  | "company.customers"
  | "company.messages"
  | "company.analytics";

const OWNER_CAPABILITIES: CompanyCapability[] = [
  "company.settings",
  "company.team",
  "company.products",
  "company.orders",
  "company.customers",
  "company.messages",
  "company.analytics",
];

const MANAGER_CAPABILITIES: CompanyCapability[] = [
  "company.products",
  "company.orders",
  "company.customers",
  "company.messages",
  "company.analytics",
];

const EMPLOYEE_CAPABILITIES: CompanyCapability[] = [
  "company.orders",
  "company.customers",
  "company.messages",
];

export function companyCapabilities(roles: readonly string[]): CompanyCapability[] {
  if (isAdminRole(roles)) return OWNER_CAPABILITIES;
  if (roles.includes("company_owner") || roles.includes("company")) return OWNER_CAPABILITIES;
  if (roles.includes("company_manager")) return MANAGER_CAPABILITIES;
  if (roles.includes("employee")) return EMPLOYEE_CAPABILITIES;
  return [];
}

export function canCompany(roles: readonly string[], capability: CompanyCapability): boolean {
  return companyCapabilities(roles).includes(capability);
}

export function resolveHomePathForRoles(roles: readonly string[]): string {
  if (isAdminRole(roles)) return "/admin";
  if (isCompanyRole(roles)) return "/company-workspace";
  return "/dashboard";
}
