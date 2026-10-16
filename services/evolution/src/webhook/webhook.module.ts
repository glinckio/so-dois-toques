import { Module } from "@nestjs/common";
import { WebhookController } from "./webhook.controller";
import { WebhookConfigController } from "./webhook-config.controller";
import { WebhookEventsService } from "./webhook-events.service";

@Module({
  controllers: [WebhookController, WebhookConfigController],
  providers: [WebhookEventsService],
  exports: [WebhookEventsService],
})
export class WebhookModule {}
