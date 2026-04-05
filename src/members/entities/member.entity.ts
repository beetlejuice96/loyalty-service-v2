import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type MemberState = 'ACTIVE' | 'INACTIVE';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ name: 'points_balance', default: 0 })
  pointsBalance: number;

  @Column({ name: 'qr_code', unique: true })
  qrCode: string;

  // Google Wallet
  @Column({ name: 'gw_object_id', nullable: true })
  gwObjectId: string;

  // Apple Wallet
  @Column({ name: 'aw_serial_number', nullable: true })
  awSerialNumber: string;

  @Column({ name: 'aw_auth_token', nullable: true })
  awAuthToken: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  state: MemberState;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
