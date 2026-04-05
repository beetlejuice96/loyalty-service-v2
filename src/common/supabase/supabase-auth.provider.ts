import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_AUTH_CLIENT = 'SUPABASE_AUTH_CLIENT';

export const supabaseAuthProvider = {
  provide: SUPABASE_AUTH_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): SupabaseClient =>
    createClient(
      config.get<string>('SUPABASE_URL') ?? '',
      config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    ),
};
