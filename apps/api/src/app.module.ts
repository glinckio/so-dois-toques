import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./acesso/auth.controller.js";
import { AuthService } from "./acesso/auth.service.js";
import { ChaveInternaGuard, PerfisGuard, SessaoGuard } from "./acesso/guardas.js";
import { AlunosController } from "./aulas/alunos.controller.js";
import { AlunosService } from "./aulas/alunos.service.js";
import { TurmasController } from "./aulas/turmas.controller.js";
import { TurmasService } from "./aulas/turmas.service.js";
import { AuditoriaController } from "./auditoria/auditoria.controller.js";
import { AuditoriaService } from "./auditoria/auditoria.service.js";
import { ConfigModule } from "./config.module.js";
import { HealthController } from "./health/health.controller.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { UsuariosController } from "./usuarios/usuarios.controller.js";
import { UsuariosService } from "./usuarios/usuarios.service.js";

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [
    HealthController,
    AuthController,
    UsuariosController,
    AuditoriaController,
    AlunosController,
    TurmasController,
  ],
  providers: [
    AuditoriaService,
    AuthService,
    UsuariosService,
    AlunosService,
    TurmasService,
    // A ordem importa: chave interna, depois sessão, depois perfil.
    { provide: APP_GUARD, useClass: ChaveInternaGuard },
    { provide: APP_GUARD, useClass: SessaoGuard },
    { provide: APP_GUARD, useClass: PerfisGuard },
  ],
})
export class AppModule {}
