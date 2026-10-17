import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EvolutionClientModule } from "./evolution-client/evolution-client.module";
import { InstanceModule } from "./instance/instance.module";
import { MessageModule } from "./message/message.module";
import { ChatModule } from "./chat/chat.module";
import { WebhookModule } from "./webhook/webhook.module";
import { SettingsModule } from "./settings/settings.module";
import { validarEnv } from "./env";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEnv }),
    EvolutionClientModule,
    InstanceModule,
    MessageModule,
    ChatModule,
    WebhookModule,
    SettingsModule,
  ],
})
export class AppModule {}
