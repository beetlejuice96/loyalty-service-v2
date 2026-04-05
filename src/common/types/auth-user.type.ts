export type UserRole = 'super_admin' | 'admin' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null; // null para super_admin
}
