import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('auth')
export class AuthController {
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { role: user.role, tenantId: user.tenantId };
  }
}
