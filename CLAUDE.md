# Backend — NestJS

## Stack

- **Framework**: NestJS con TypeScript estricto
- **Base de datos**: Supabase (PostgreSQL) + **TypeORM** — todo acceso a datos pasa por entidades y repositorios de TypeORM, sin excepción
- **Auth**: Supabase Auth — los tokens JWT los emite Supabase, el backend los valida
- **Variables de entorno**: `@nestjs/config` con `ConfigModule.forRoot({ isGlobal: true })`

## Estructura de módulos

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts       # Valida JWT de Supabase en cada request
│   │   └── roles.guard.ts          # Verifica rol del usuario en tenant_users
│   ├── decorators/
│   │   ├── roles.decorator.ts      # @Roles('admin', 'staff')
│   │   └── current-user.decorator.ts
│   ├── services/
│   │   └── encryption.service.ts   # AES-256 para credenciales de wallet
│   └── supabase/
│       └── supabase.provider.ts    # Provider del cliente Supabase
├── auth/
├── tenants/
├── loyalty-programs/
├── members/
├── transactions/
├── scanner/
├── passes/
│   ├── google-wallet/
│   └── apple-wallet/
└── webhooks/
```

Cada módulo sigue la estructura estándar de NestJS:
```
{module}/
├── {module}.module.ts
├── {module}.controller.ts
├── {module}.service.ts
├── entities/
│   └── {module}.entity.ts      # Entidad TypeORM — refleja la tabla exactamente
└── dto/
    ├── create-{module}.dto.ts
    └── update-{module}.dto.ts
```

## TypeORM — reglas de uso

- **Todo acceso a datos pasa por entidades y repositorios de TypeORM** — nunca queries SQL crudas ni Supabase JS client para leer/escribir datos
- **Todo cambio de schema se hace via migraciones generadas desde las entidades** — nunca modificar la DB a mano ni desde el dashboard de Supabase

### Flujo de trabajo para cambios de schema

```bash
# 1. Modificar la entidad en src/{module}/entities/{entity}.entity.ts
# 2. Generar la migración automáticamente desde la entidad
npx typeorm migration:generate src/database/migrations/NombreDeLaMigracion -d src/database/data-source.ts

# 3. Revisar el archivo generado antes de aplicar
# 4. Aplicar la migración
npx typeorm migration:run -d src/database/data-source.ts
```

### Configuración TypeORM

```typescript
// src/database/data-source.ts — DataSource para CLI de TypeORM
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,          // connection string de Supabase
  ssl: { rejectUnauthorized: false },     // requerido por Supabase
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,                     // NUNCA true — siempre usar migraciones
});
```

```typescript
// En AppModule — TypeOrmModule
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    url: config.get('DATABASE_URL'),
    ssl: { rejectUnauthorized: false },
    autoLoadEntities: true,
    synchronize: false,                   // NUNCA true en ningún entorno
    migrationsRun: true,                  // corre migraciones pendientes al arrancar
  }),
  inject: [ConfigService],
})
```

### Estructura de una entidad

```typescript
// members/entities/member.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

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

  @Column({ name: 'gw_object_id', nullable: true })
  gwObjectId: string;

  @Column({ name: 'aw_serial_number', nullable: true })
  awSerialNumber: string;

  @Column({ name: 'aw_auth_token', nullable: true })
  awAuthToken: string;

  @Column({ default: 'ACTIVE' })
  state: 'ACTIVE' | 'INACTIVE';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### Uso de repositorios en services

```typescript
// members/members.service.ts
@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
  ) {}

  findAll(tenantId: string, search?: string) {
    return this.membersRepository.find({
      where: {
        tenantId,
        ...(search ? [
          { tenantId, fullName: ILike(`%${search}%`) },
          { tenantId, email: ILike(`%${search}%`) },
        ] : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }
}
```

## Variables de entorno requeridas

```env
# Base de datos (Supabase PostgreSQL via TypeORM)
DATABASE_URL=                # postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Supabase (solo para Auth — validar tokens JWT)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # solo para verificar tokens de Supabase Auth

# Cifrado
ENCRYPTION_KEY=              # 32 bytes hex — para AES-256 de credenciales de wallet

# Apple APNS (push notifications)
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_PRIVATE_KEY=            # contenido del .p8

# App
PORT=3000
FRONTEND_URL=                # para CORS
```

## Patrones clave

### Multi-tenancy
**Regla más importante**: todo query a la DB que involucre datos de un tenant DEBE filtrar por `tenant_id`.
El `tenant_id` se obtiene del JWT del usuario (via `tenant_users`) — nunca confiar en un `tenantId` del body/params sin verificar que el usuario pertenece a ese tenant.

```typescript
// Patrón en services: siempre recibir tenantId verificado del guard
async findMembers(tenantId: string, query: ListMembersDto) {
  return this.membersRepository.find({
    where: { tenantId },   // SIEMPRE filtrar por tenant
    order: { createdAt: 'DESC' },
  });
}
```

### Auth y roles
El guard `JwtAuthGuard` extrae el usuario del JWT de Supabase.
El guard `RolesGuard` verifica que el usuario tenga el rol requerido en `tenant_users`.

```typescript
@Get(':tenantId/members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
findAll(@Param('tenantId') tenantId: string, @CurrentUser() user: AuthUser) {
  // El RolesGuard ya verificó que user pertenece a este tenant con rol 'admin'
}
```

Roles disponibles: `super_admin` (plataforma), `admin` (Client Admin), `staff` (empleado).

### Supabase Auth client
El cliente de Supabase **solo se usa para validar tokens JWT** — no para queries a la DB.
Todo acceso a datos va por TypeORM.

```typescript
// common/supabase/supabase-auth.provider.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAuthProvider = {
  provide: 'SUPABASE_AUTH_CLIENT',
  useFactory: (config: ConfigService) =>
    createClient(
      config.get('SUPABASE_URL'),
      config.get('SUPABASE_SERVICE_ROLE_KEY'),
    ),
  inject: [ConfigService],
};
```

### Cifrado de credenciales de wallet
Las credenciales (Google service account JSON, Apple certificate, private key) se cifran antes de guardar en DB y se descifran solo cuando el servicio las necesita para operar.

```typescript
// Siempre usar EncryptionService en LoyaltyProgramsService
const encrypted = this.encryptionService.encrypt(serviceAccountJson);
await this.loyaltyProgramRepository.update(programId, { gwServiceAccountJson: encrypted });
```

### Endpoints públicos (sin auth)
Los endpoints `/register/:tenantSlug` y `/webhooks/apple/*` no llevan `JwtAuthGuard`.
Deben tener rate limiting con `@Throttle()` del módulo `@nestjs/throttler`.

## Google Wallet — integración

- Librería: `google-auth-library` para JWT RS256 + `googleapis` para REST API
- **LoyaltyClass**: se crea una sola vez por tenant al configurar las credenciales GW
- **LoyaltyObject**: se crea uno por miembro al registrarse
- Para actualizar puntos: `PATCH /wallet/v1/loyaltyobject/{objectId}` con el nuevo balance
- El JWT para "Add to Google Wallet" debe firmarse con la service account del tenant (no una global)

## Apple Wallet — integración

- Librería: `node-forge` o `@apple-wallet/passkit` para PKCS#7 signing y ZIP building
- El `.pkpass` es un ZIP con: `pass.json`, `manifest.json`, `signature`, `logo.png`, `icon.png`
- `manifest.json` contiene hashes SHA1 de todos los archivos del ZIP
- `signature` es la firma PKCS#7 detached del `manifest.json`
- Push updates: el backend envía un push via APNS → Apple llama al webhook `GET /webhooks/apple/passes/...` → backend devuelve el `.pkpass` actualizado
- Content-Type para servir el `.pkpass`: `application/vnd.apple.pkpass`

## TDD — Test Driven Development

El backend se desarrolla con TDD. Eso significa: **escribir el test antes que la implementación**.

Stack de testing: **Jest** + `@nestjs/testing`.

### Qué SÍ se testea

Solo se escriben tests para código con lógica real. La pregunta es: *¿puede esto fallar de una forma que un test detectaría antes que yo?*

| Qué | Por qué |
|-----|---------|
| **Services con lógica de negocio** | Acumulación de puntos, validación de duplicados, cambios de estado |
| **Guards** (`JwtAuthGuard`, `RolesGuard`) | Son la barrera de seguridad — un bug acá rompe todo |
| **`EncryptionService`** | Encrypt → decrypt debe ser reversible y determinista |
| **`GoogleWalletService`** | Construcción del JWT, formato del LoyaltyObject |
| **`AppleWalletService`** | Construcción del pass.json, generación del manifest, estructura del ZIP |
| **`ScannerService`** | Flujo completo: resolver QR → sumar puntos → actualizar wallets |
| **Lógica multi-tenant** | Verificar que un tenant nunca accede a datos de otro |

### Qué NO se testea

| Qué | Por qué |
|-----|---------|
| **Controllers** | Solo delegan al service — si el service está testeado, el controller no agrega lógica |
| **Entidades TypeORM** | Son decoradores de schema, no tienen lógica |
| **DTOs** | `class-validator` ya está testeado por su propia librería |
| **Migraciones** | Se verifican corriendo la migración, no con tests unitarios |
| **Módulos y providers** | Boilerplate de NestJS, no tienen lógica propia |
| **Getters/setters triviales** | Si no hay condición ni transformación, no hay nada que testear |

### Estructura de archivos de test

Los tests viven al lado del archivo que testean:

```
members/
├── members.service.ts
├── members.service.spec.ts     ← test del service
├── members.controller.ts       ← sin test
└── entities/
    └── member.entity.ts        ← sin test
```

### Patrón de unit test para services

Mockear el repositorio de TypeORM — nunca conectarse a la DB en unit tests.

```typescript
// members/members.service.spec.ts
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MembersService } from './members.service'
import { Member } from './entities/member.entity'

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
}

describe('MembersService', () => {
  let service: MembersService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getRepositoryToken(Member), useValue: mockRepository },
      ],
    }).compile()

    service = module.get(MembersService)
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('debería lanzar ConflictException si el email ya existe en el tenant', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'existing' })

      await expect(
        service.register('tenant-1', { email: 'a@b.com', fullName: 'X', phone: '123' })
      ).rejects.toThrow(ConflictException)
    })

    it('no debería lanzar error si el mismo email existe en otro tenant', async () => {
      mockRepository.findOne.mockResolvedValue(null)
      mockRepository.create.mockReturnValue({})
      mockRepository.save.mockResolvedValue({ id: 'new-id' })

      await expect(
        service.register('tenant-2', { email: 'a@b.com', fullName: 'X', phone: '123' })
      ).resolves.not.toThrow()
    })
  })
})
```

### Patrón de test para Guards

```typescript
// common/guards/roles.guard.spec.ts
describe('RolesGuard', () => {
  it('debería denegar acceso si el rol del usuario no está en los roles requeridos', () => {
    // ...
  })

  it('debería permitir acceso si el rol coincide', () => {
    // ...
  })

  it('debería denegar acceso si el usuario no pertenece al tenant del parámetro', () => {
    // ...
  })
})
```

### Flujo TDD por tarea

```
1. Escribir el test que describe el comportamiento esperado  →  falla (rojo)
2. Escribir el mínimo código para que pase                  →  pasa (verde)
3. Refactorizar sin romper el test                          →  limpio
```

No avanzar al paso 2 sin que el test esté escrito y fallando.

### Correr tests

```bash
pnpm test              # unit tests
pnpm test:watch        # watch mode durante desarrollo
pnpm test:cov          # coverage report
```

## Convenciones

- DTOs con `class-validator` para toda entrada de usuario
- Respuestas de error con el formato de NestJS (`HttpException`)
- Sin `console.log` en producción — usar `Logger` de NestJS
- Transacciones de DB: si una operación actualiza múltiples tablas, usar `QueryRunner` de TypeORM para garantizar atomicidad
