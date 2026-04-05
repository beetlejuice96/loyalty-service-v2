import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type TransactionType = 'scan' | 'manual_add' | 'manual_deduct';

@Entity('point_transactions')
export class PointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ name: 'member_id' })
  memberId: string;

  // Positivo = suma, negativo = resta
  @Column({ type: 'int' })
  delta: number;

  @Column({ type: 'varchar' })
  type: TransactionType;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  // user_id del staff o admin que realizó la operación (referencia a Supabase Auth)
  @Column({ name: 'performed_by', nullable: true })
  performedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
