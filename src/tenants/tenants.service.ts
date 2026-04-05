import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(LoyaltyProgram)
    private readonly loyaltyProgramRepository: Repository<LoyaltyProgram>,
  ) {}

  findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return tenant;
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('El slug ya está en uso');

    const tenant = await this.tenantRepository.save({
      name: dto.name,
      slug: dto.slug,
    });

    await this.loyaltyProgramRepository.save({
      tenantId: tenant.id,
      programName: tenant.name,
    });

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    return this.tenantRepository.save({ ...tenant, ...dto });
  }

  async deactivate(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    return this.tenantRepository.save({ ...tenant, isActive: false });
  }
}
