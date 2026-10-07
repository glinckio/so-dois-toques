import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { motivoSchema } from "../mensalidades/esquemas.js";
import {
  ajusteSchema,
  compraSchema,
  consultaVendasSchema,
  produtoSchema,
  vendaSchema,
} from "./esquemas.js";
import { EstoqueService } from "./estoque.service.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

/** Estoque da lanchonete: Administrador e Atendente (ESTQ-CA-08). */
@ExigeArea("estoque")
@Controller()
export class EstoqueController {
  constructor(private readonly estoque: EstoqueService) {}

  @Get("produtos")
  listar() {
    return this.estoque.listar();
  }

  @SomenteAdministrador()
  @Post("produtos")
  criar(
    @Body(new ZodPipe(produtoSchema)) dados: z.infer<typeof produtoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.estoque.criar(ator(usuario, ip), dados);
  }

  @SomenteAdministrador()
  @Patch("produtos/:id")
  alterar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(produtoSchema)) dados: z.infer<typeof produtoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.estoque.alterar(ator(usuario, ip), id, dados);
  }

  @Get("produtos/:id/movimentos")
  movimentos(@Param("id", ParseUUIDPipe) id: string) {
    return this.estoque.movimentos(id);
  }

  @Get("produtos/:id/compras")
  compras(@Param("id", ParseUUIDPipe) id: string) {
    return this.estoque.comprasDoProduto(id);
  }

  @Post("estoque/compras")
  comprar(
    @Body(new ZodPipe(compraSchema)) dados: z.infer<typeof compraSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.estoque.comprar(ator(usuario, ip), dados);
  }

  @Post("estoque/vendas")
  vender(
    @Body(new ZodPipe(vendaSchema)) dados: z.infer<typeof vendaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.estoque.vender(ator(usuario, ip), dados);
  }

  @Get("estoque/vendas")
  vendas(@Query(new ZodPipe(consultaVendasSchema)) filtro: z.infer<typeof consultaVendasSchema>) {
    return this.estoque.vendasDoDia(filtro.data);
  }

  @SomenteAdministrador()
  @Post("estoque/ajustes")
  ajustar(
    @Body(new ZodPipe(ajusteSchema)) dados: z.infer<typeof ajusteSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.estoque.ajustar(ator(usuario, ip), dados);
  }

  @SomenteAdministrador()
  @HttpCode(200)
  @Post("estoque/vendas/:id/estornar")
  estornarVenda(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(motivoSchema)) dados: z.infer<typeof motivoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.estoque.estornarVenda(ator(usuario, ip), id, dados.motivo);
  }

  @SomenteAdministrador()
  @HttpCode(200)
  @Post("estoque/compras/:id/estornar")
  estornarCompra(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(motivoSchema)) dados: z.infer<typeof motivoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.estoque.estornarCompra(ator(usuario, ip), id, dados.motivo);
  }
}
