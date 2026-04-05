import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('apple_device_registrations')
export class AppleDeviceRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_library_id' })
  deviceLibraryId: string;

  @Column({ name: 'push_token' })
  pushToken: string;

  @Column({ name: 'pass_type_id' })
  passTypeId: string;

  @Column({ name: 'serial_number' })
  serialNumber: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
