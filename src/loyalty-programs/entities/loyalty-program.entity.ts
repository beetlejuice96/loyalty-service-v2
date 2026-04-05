import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('loyalty_programs')
export class LoyaltyProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'program_name' })
  programName: string;

  @Column({ name: 'points_per_scan', default: 10 })
  pointsPerScan: number;

  // Google Wallet — valores cifrados con AES-256
  @Column({ name: 'gw_issuer_id', nullable: true })
  gwIssuerId: string;

  @Column({ name: 'gw_class_id', nullable: true })
  gwClassId: string;

  @Column({ name: 'gw_service_account_json', nullable: true, type: 'text' })
  gwServiceAccountJson: string;

  // Apple Wallet — valores cifrados con AES-256
  @Column({ name: 'aw_pass_type_identifier', nullable: true })
  awPassTypeIdentifier: string;

  @Column({ name: 'aw_team_identifier', nullable: true })
  awTeamIdentifier: string;

  @Column({ name: 'aw_certificate', nullable: true, type: 'text' })
  awCertificate: string;

  @Column({ name: 'aw_private_key', nullable: true, type: 'text' })
  awPrivateKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
