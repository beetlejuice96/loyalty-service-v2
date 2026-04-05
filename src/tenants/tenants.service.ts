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
import { LoggerService } from '../common/logger';

const CTX = 'TenantsService';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(LoyaltyProgram)
    private readonly loyaltyProgramRepository: Repository<LoyaltyProgram>,
    private readonly logger: LoggerService,
  ) {}

  findAll(): Promise<Tenant[]> {
    this.logger.log('Fetching all tenants', CTX, { function: 'findAll' });
    return this.tenantRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      this.logger.warn('Tenant not found', CTX, { function: 'findOne', metadata: { id } });
      throw new NotFoundException('Tenant no encontrado');
    }
    return tenant;
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    this.logger.log('Creating tenant', CTX, { function: 'create', metadata: { slug: dto.slug } });

    const existing = await this.tenantRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      this.logger.warn('Slug already in use', CTX, { function: 'create', metadata: { slug: dto.slug } });
      throw new ConflictException('El slug ya está en uso');
    }

    const tenant = await this.tenantRepository.save({
      name: dto.name,
      slug: dto.slug,
    });

    await this.loyaltyProgramRepository.save({
      tenantId: tenant.id,
      programName: tenant.name,
    });

    this.logger.log('Tenant created', CTX, { function: 'create', metadata: { id: tenant.id, slug: tenant.slug } });
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    this.logger.log('Updating tenant', CTX, { function: 'update', metadata: { id } });

    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      this.logger.warn('Tenant not found', CTX, { function: 'update', metadata: { id } });
      throw new NotFoundException('Tenant no encontrado');
    }

    return this.tenantRepository.save({ ...tenant, ...dto });
  }

  async deactivate(id: string): Promise<Tenant> {
    this.logger.log('Deactivating tenant', CTX, { function: 'deactivate', metadata: { id } });

    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      this.logger.warn('Tenant not found', CTX, { function: 'deactivate', metadata: { id } });
      throw new NotFoundException('Tenant no encontrado');
    }

    return this.tenantRepository.save({ ...tenant, isActive: false });
  }
}
