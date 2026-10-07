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
import { CaixaController } from "./caixa/caixa.controller.js";
import { CaixaService } from "./caixa/caixa.service.js";
import { CustosController } from "./custos/custos.controller.js";
import { CustosService } from "./custos/custos.service.js";
import { EstoqueController } from "./estoque/estoque.controller.js";
import { EstoqueService } from "./estoque/estoque.service.js";
import { HorariosController } from "./horarios/horarios.controller.js";
import { HorariosService } from "./horarios/horarios.service.js";
import { HealthController } from "./health/health.controller.js";
import { GeracaoAutomaticaService } from "./mensalidades/geracao-automatica.service.js";
import { MensalidadesController } from "./mensalidades/mensalidades.controller.js";
import { MensalidadesService } from "./mensalidades/mensalidades.service.js";
import { PlanosController } from "./mensalidades/planos.controller.js";
import { PlanosService } from "./mensalidades/planos.service.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { UsuariosController } from "./usuarios/usuarios.controller.js";
import { UsuariosService } from "./usuarios/usuarios.service.js";

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [
    HealthController,
    CustosController,
    CaixaController,
    EstoqueController,
    HorariosController,
    AuthController,
    UsuariosController,
    AuditoriaController,
    AlunosController,
    TurmasController,
    PlanosController,
    MensalidadesController,
  ],
  providers: [
    AuditoriaService,
    CustosService,
    CaixaService,
    EstoqueService,
    HorariosService,
    AuthService,
    UsuariosService,
    AlunosService,
    TurmasService,
    PlanosService,
    MensalidadesService,
    GeracaoAutomaticaService,
    // A ordem importa: chave interna, depois sessão, depois perfil.
    { provide: APP_GUARD, useClass: ChaveInternaGuard },
    { provide: APP_GUARD, useClass: SessaoGuard },
    { provide: APP_GUARD, useClass: PerfisGuard },
  ],
})
export class AppModule {}
