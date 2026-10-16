import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { InternalApiGuard } from "../common/guards/internal-api.guard";
import { EvolutionClientService } from "../evolution-client/evolution-client.service";
import { WhatsAppNumbersDto } from "./dto/whatsapp-numbers.dto";
import { MarkAsReadDto } from "./dto/mark-read.dto";
import { MarkUnreadDto } from "./dto/mark-unread.dto";
import { ArchiveChatDto } from "./dto/archive-chat.dto";
import { DeleteMessageForEveryoneDto } from "./dto/delete-message.dto";
import { SendPresenceDto } from "./dto/send-presence.dto";
import { UpdateBlockStatusDto } from "./dto/update-block-status.dto";

function ensureConfig(evolution: EvolutionClientService): void {
  if (!evolution.hasConfig()) throw new BadRequestException("EVOLUTION_API_URL must be set");
}

function enc(s: string): string {
  return encodeURIComponent(s);
}

@Controller("internal/evolution")
export class ChatController {
  constructor(private readonly evolution: EvolutionClientService) {}

  @Post("chat/whatsapp-numbers")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async whatsappNumbers(@Body() dto: WhatsAppNumbersDto) {
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/whatsappNumbers/${enc(dto.instanceName)}`, {
      numbers: dto.numbers,
    });
  }

  @Post("chat/mark-as-read")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async markAsRead(@Body() dto: MarkAsReadDto) {
    ensureConfig(this.evolution);
    const readMessages = dto.readMessages.map((m) => ({
      remoteJid: m.remoteJid,
      fromMe: m.fromMe,
      id: m.id,
    }));
    return this.evolution.post<unknown>(`/chat/markMessageAsRead/${enc(dto.instanceName)}`, {
      readMessages,
    });
  }

  @Post("chat/mark-unread")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async markUnread(@Body() dto: MarkUnreadDto) {
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/markChatUnread/${enc(dto.instanceName)}`, {
      lastMessage: dto.lastMessage,
      chat: dto.chat,
    });
  }

  @Post("chat/archive")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async archiveChat(@Body() dto: ArchiveChatDto) {
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/archiveChat/${enc(dto.instanceName)}`, {
      lastMessage: dto.lastMessage,
      archive: dto.archive,
      chat: dto.chat,
    });
  }

  @Delete("chat/delete-message")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.CREATED)
  async deleteMessageForEveryone(@Body() dto: DeleteMessageForEveryoneDto) {
    ensureConfig(this.evolution);
    const body = {
      id: dto.id,
      remoteJid: dto.remoteJid,
      fromMe: dto.fromMe,
      ...(dto.participant && { participant: dto.participant }),
    };
    return this.evolution.delete<unknown>(
      `/chat/deleteMessageForEveryone/${enc(dto.instanceName)}`,
      body,
    );
  }

  @Post("chat/send-presence")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async sendPresence(@Body() dto: SendPresenceDto) {
    ensureConfig(this.evolution);
    const payload = {
      number: dto.number,
      presence: dto.presence,
      ...(dto.delay != null && { delay: dto.delay }),
    };
    return this.evolution.post<unknown>(`/chat/sendPresence/${enc(dto.instanceName)}`, payload);
  }

  @Post("chat/update-block-status")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async updateBlockStatus(@Body() dto: UpdateBlockStatusDto) {
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/message/updateBlockStatus/${enc(dto.instanceName)}`, {
      number: dto.number,
      status: dto.status,
    });
  }

  @Get("chat/profile-picture/:instanceName")
  @UseGuards(InternalApiGuard)
  async fetchProfilePictureUrl(
    @Param("instanceName") instanceName: string,
    @Query("number") number: string,
  ) {
    if (!instanceName?.trim() || !number?.trim())
      throw new BadRequestException("instanceName and number are required");
    ensureConfig(this.evolution);
    // Evolution API v2 exposes this as POST with the number in the body, not GET with a query param.
    return this.evolution.post<unknown>(`/chat/fetchProfilePictureUrl/${enc(instanceName)}`, {
      number,
    });
  }

  @Get("chat/contacts/:instanceName")
  @UseGuards(InternalApiGuard)
  async findContacts(
    @Param("instanceName") instanceName: string,
    @Query() query: { where?: string },
  ) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.get<unknown>(
      `/chat/findContacts/${enc(instanceName)}`,
      query.where ? { where: query.where } : undefined,
    );
  }

  @Get("chat/base64-media/:instanceName")
  @UseGuards(InternalApiGuard)
  async getBase64FromMediaMessage(
    @Param("instanceName") instanceName: string,
    @Query("messageKey") messageKey: string,
  ) {
    if (!instanceName?.trim() || !messageKey?.trim())
      throw new BadRequestException("instanceName and messageKey are required");
    ensureConfig(this.evolution);
    return this.evolution.get<unknown>(`/chat/getBase64FromMediaMessage/${enc(instanceName)}`, {
      messageKey,
    });
  }

  /** Evolution API v2: POST com body { message: { key, ...conteúdo }, convertToMp4 }. Retorna { base64?, mimetype? }. */
  @Post("chat/base64-media/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async getBase64FromMediaMessagePost(
    @Param("instanceName") instanceName: string,
    @Body() body: { message: Record<string, unknown>; convertToMp4?: boolean },
  ) {
    if (!instanceName?.trim() || !body?.message)
      throw new BadRequestException("instanceName and message are required");
    const msg = body.message as { key?: unknown };
    if (!msg?.key) throw new BadRequestException("message.key is required");
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/getBase64FromMediaMessage/${enc(instanceName)}`, {
      message: body.message,
      convertToMp4: body.convertToMp4 ?? false,
    });
  }

  /** Evolution API v2: POST /chat/findMessages/{instance} com body { where: { key: { remoteJid } }, limit? }. */
  @Get("chat/messages/:instanceName")
  @UseGuards(InternalApiGuard)
  async findMessages(
    @Param("instanceName") instanceName: string,
    @Query() query: { where?: string; limit?: string; page?: string; offset?: string },
  ) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    let body: {
      where?: { key?: { remoteJid?: string } };
      limit?: number;
      page?: number;
      offset?: number;
    } = {};
    if (query.where) {
      try {
        const parsed = JSON.parse(query.where) as Record<string, unknown>;
        body.where = parsed?.remoteJid
          ? { key: { remoteJid: String(parsed.remoteJid) } }
          : parsed?.key && typeof parsed.key === "object" && parsed.key !== null
            ? { key: parsed.key as { remoteJid?: string } }
            : { key: parsed as { remoteJid?: string } };
      } catch {
        body.where = { key: {} };
      }
    }
    if (query.limit) {
      const n = parseInt(query.limit, 10);
      if (!Number.isNaN(n)) body.limit = n;
    }
    // Paginação do Evolution v2: offset = mensagens por página; page começa em 1 (mais recentes).
    for (const campo of ["page", "offset"] as const) {
      const n = parseInt(query[campo] ?? "", 10);
      if (!Number.isNaN(n) && n > 0) body[campo] = n;
    }
    return this.evolution.post<unknown>(`/chat/findMessages/${enc(instanceName)}`, body);
  }

  @Get("chat/status-messages/:instanceName")
  @UseGuards(InternalApiGuard)
  async findStatusMessage(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.get<unknown>(`/chat/findStatusMessage/${enc(instanceName)}`);
  }

  @Post("chat/update-message/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async updateMessage(
    @Param("instanceName") instanceName: string,
    @Body()
    body: { number: string; text: string; key: { id: string; remoteJid: string; fromMe: boolean } },
  ) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/updateMessage/${enc(instanceName)}`, body);
  }

  @Get("chat/chats/:instanceName")
  @UseGuards(InternalApiGuard)
  async findChats(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/findChats/${enc(instanceName)}`, {});
  }

  @Get("chat/business-profile/:instanceName")
  @UseGuards(InternalApiGuard)
  async fetchBusinessProfile(
    @Param("instanceName") instanceName: string,
    @Query("number") number: string,
  ) {
    if (!instanceName?.trim() || !number?.trim())
      throw new BadRequestException("instanceName and number are required");
    ensureConfig(this.evolution);
    return this.evolution.get<unknown>(`/chat/fetchBusinessProfile/${enc(instanceName)}`, {
      number,
    });
  }

  @Get("chat/profile/:instanceName")
  @UseGuards(InternalApiGuard)
  async fetchProfile(@Param("instanceName") instanceName: string, @Query("number") number: string) {
    if (!instanceName?.trim() || !number?.trim())
      throw new BadRequestException("instanceName and number are required");
    ensureConfig(this.evolution);
    // Evolution API expõe fetchProfile como POST com { number } no corpo.
    return this.evolution.post<unknown>(`/chat/fetchProfile/${enc(instanceName)}`, { number });
  }

  @Post("chat/update-profile-name/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfileName(
    @Param("instanceName") instanceName: string,
    @Body() body: { name: string },
  ) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/updateProfileName/${enc(instanceName)}`, body);
  }

  @Post("chat/update-profile-status/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfileStatus(
    @Param("instanceName") instanceName: string,
    @Body() body: { status: string },
  ) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/updateProfileStatus/${enc(instanceName)}`, body);
  }

  @Post("chat/update-profile-picture/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfilePicture(
    @Param("instanceName") instanceName: string,
    @Body() body: { image: string },
  ) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/updateProfilePicture/${enc(instanceName)}`, body);
  }

  @Post("chat/remove-profile-picture/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async removeProfilePicture(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/removeProfilePicture/${enc(instanceName)}`);
  }

  @Get("chat/privacy-settings/:instanceName")
  @UseGuards(InternalApiGuard)
  async fetchPrivacySettings(@Param("instanceName") instanceName: string) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.get<unknown>(`/chat/fetchPrivacySettings/${enc(instanceName)}`);
  }

  @Post("chat/update-privacy-settings/:instanceName")
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  async updatePrivacySettings(
    @Param("instanceName") instanceName: string,
    @Body()
    body: {
      profile?: string;
      last?: string;
      readreceipts?: string;
      groups?: string;
      status?: string;
    },
  ) {
    if (!instanceName?.trim()) throw new BadRequestException("instanceName is required");
    ensureConfig(this.evolution);
    return this.evolution.post<unknown>(`/chat/updatePrivacySettings/${enc(instanceName)}`, body);
  }
}
