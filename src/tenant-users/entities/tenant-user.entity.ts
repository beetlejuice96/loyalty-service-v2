import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type TenantUserRole = 'admin' | 'staff';

@Entity('tenant_users')
export class TenantUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  // user_id referencia a auth.users de Supabase (UUID externo)
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar' })
  role: TenantUserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
