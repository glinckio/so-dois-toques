import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { InternalApiGuard } from "../common/guards/internal-api.guard";
import { EvolutionClientService } from "../evolution-client/evolution-client.service";
import { SendTextDto } from "./dto/send-text.dto";
import { SendMediaDto } from "./dto/send-media.dto";
import { SendAudioDto } from "./dto/send-audio.dto";
import { SendStickerDto } from "./dto/send-sticker.dto";
import { SendStatusDto } from "./dto/send-status.dto";
import { SendLocationDto } from "./dto/send-location.dto";
import { SendContactDto } from "./dto/send-contact.dto";
import { SendReactionDto } from "./dto/send-reaction.dto";
import { SendPollDto } from "./dto/send-poll.dto";
import { SendListDto } from "./dto/send-list.dto";
import { SendButtonsDto } from "./dto/send-buttons.dto";

function ensureConfig(evolution: EvolutionClientService): void {
  if (!evolution.hasConfig()) {
    throw new BadRequestException("EVOLUTION_API_URL must be set");
  }
}

function instancePath(instanceName: string, path: string): string {
  return `${path}/${encodeURIComponent(instanceName)}`;
}

@Controller("internal/evolution")
export class MessageController {
  constructor(private readonly evolution: EvolutionClientService) {}

  @Post("message/send-text")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendText(@Body() dto: SendTextDto) {
    ensureConfig(this.evolution);
    const payload = {
      number: dto.number,
      text: dto.text,
      ...(dto.delay != null && { delay: dto.delay }),
      ...(dto.linkPreview != null && { linkPreview: dto.linkPreview }),
      ...(dto.mentionsEveryOne != null && { mentionsEveryOne: dto.mentionsEveryOne }),
      ...(dto.mentioned?.length && { mentioned: dto.mentioned }),
      ...(dto.quoted && { quoted: dto.quoted }),
      ...(dto.isForwarded && { isForwarded: true }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendText"),
      payload,
    );
  }

  @Post("message/send-media")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendMedia(@Body() dto: SendMediaDto) {
    ensureConfig(this.evolution);
    const payload = {
      number: dto.number,
      mediatype: dto.mediatype,
      mimetype: dto.mimetype,
      caption: dto.caption ?? "",
      media: dto.media,
      fileName: dto.fileName,
      ...(dto.delay != null && { delay: dto.delay }),
      ...(dto.isForwarded && { isForwarded: true }),
      ...(dto.quoted && { quoted: dto.quoted }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendMedia"),
      payload,
    );
  }

  @Post("message/send-audio")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendAudio(@Body() dto: SendAudioDto) {
    ensureConfig(this.evolution);
    const payload = {
      number: dto.number,
      audio: dto.audio,
      ...(dto.delay != null && { delay: dto.delay }),
      ...(dto.quoted && { quoted: dto.quoted }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendWhatsAppAudio"),
      payload,
    );
  }

  @Post("message/send-sticker")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendSticker(@Body() dto: SendStickerDto) {
    ensureConfig(this.evolution);
    const payload = {
      number: dto.number,
      sticker: dto.sticker,
      ...(dto.delay != null && { delay: dto.delay }),
      ...(dto.quoted && { quoted: dto.quoted }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendSticker"),
      payload,
    );
  }

  @Post("message/send-status")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendStatus(@Body() dto: SendStatusDto) {
    ensureConfig(this.evolution);
    const payload = {
      type: dto.type,
      content: dto.content,
      caption: dto.caption ?? "",
      backgroundColor: dto.backgroundColor ?? "#000000",
      font: dto.font ?? 1,
      allContacts: dto.allContacts ?? true,
      statusJidList: dto.statusJidList ?? [],
      ...(dto.delay != null && { delay: dto.delay }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendStatus"),
      payload,
    );
  }

  @Post("message/send-location")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendLocation(@Body() dto: SendLocationDto) {
    ensureConfig(this.evolution);
    const payload = {
      number: dto.number,
      latitude: dto.latitude,
      longitude: dto.longitude,
      ...(dto.name && { name: dto.name }),
      ...(dto.address && { address: dto.address }),
      ...(dto.delay != null && { delay: dto.delay }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendLocation"),
      payload,
    );
  }

  @Post("message/send-contact")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendContact(@Body() dto: SendContactDto) {
    ensureConfig(this.evolution);
    // Evolution API schema: key is `contact` (singular); `wuid` must be digits
    // only (no @s.whatsapp.net suffix) with min length 10.
    const contact = dto.contacts.map((c) => ({
      fullName: c.fullName,
      wuid: (c.wuid ?? "").replace(/\D/g, ""),
      phoneNumber: c.phoneNumber,
      ...(c.organization && { organization: c.organization }),
    }));
    const payload = { number: dto.number, contact, ...(dto.delay != null && { delay: dto.delay }) };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendContact"),
      payload,
    );
  }

  @Post("message/send-reaction")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendReaction(@Body() dto: SendReactionDto) {
    ensureConfig(this.evolution);
    // Evolution exige a key COMPLETA da mensagem reagida: remoteJid (exato,
    // pode ser @lid), fromMe e id. Sem remoteJid/fromMe corretos a reação
    // falha silenciosamente ou não chega ao contato.
    const payload = {
      key: {
        remoteJid: dto.remoteJid,
        fromMe: dto.fromMe,
        id: dto.messageId,
      },
      reaction: dto.reaction,
      ...(dto.delay != null && { delay: dto.delay }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendReaction"),
      payload,
    );
  }

  @Post("message/send-poll")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendPoll(@Body() dto: SendPollDto) {
    ensureConfig(this.evolution);
    const payload = {
      number: dto.number,
      name: dto.name,
      selectableCount: dto.selectableCount,
      values: dto.values,
      ...(dto.delay != null && { delay: dto.delay }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendPoll"),
      payload,
    );
  }

  @Post("message/send-list")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendList(@Body() dto: SendListDto) {
    ensureConfig(this.evolution);
    const payload = {
      number: dto.number,
      title: dto.title,
      description: dto.description,
      buttonText: dto.buttonText,
      footerText: dto.footerText,
      values: dto.values,
      ...(dto.delay != null && { delay: dto.delay }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendList"),
      payload,
    );
  }

  @Post("message/send-buttons")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendButtons(@Body() dto: SendButtonsDto) {
    ensureConfig(this.evolution);
    const payload = {
      number: dto.number,
      title: dto.title,
      description: dto.description,
      footer: dto.footer,
      buttons: dto.buttons,
      ...(dto.delay != null && { delay: dto.delay }),
    };
    return this.evolution.post<unknown>(
      instancePath(dto.instanceName, "/message/sendButtons"),
      payload,
    );
  }
}
