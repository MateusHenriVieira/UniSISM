import fs from 'node:fs';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { NotFound } from '../../../shared/errors';
import { paramString } from '../../../shared/http';
import { scopeFromRequest } from '../../../shared/requestScope';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';
import type { CriarRelatorioUseCase } from '../application/CriarRelatorioUseCase';
import type { ListarRelatoriosUseCase } from '../application/ListarRelatoriosUseCase';
import type { BaixarRelatorioUseCase } from '../application/BaixarRelatorioUseCase';

const tipoSchema = z.enum([
  'PRODUCAO_INDIVIDUAL',
  'ENCAMINHAMENTOS_POR_ESPECIALIDADE',
  'FILA_REGULACAO',
  'PENDENCIAS_RESOLVIDAS',
  'TFD_CUSTOS',
  'VACINACAO_UBS',
  'BUSCA_ATIVA',
]);
const formatoSchema = z.enum(['PDF', 'CSV', 'XLSX']);
const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const criarSchema = z.object({
  tipo: tipoSchema,
  dataInicial: ymdSchema,
  dataFinal: ymdSchema,
  formato: formatoSchema,
  filtros: z.record(z.string(), z.unknown()).optional(),
});

export class RelatoriosController {
  constructor(
    private readonly criar: CriarRelatorioUseCase,
    private readonly listar: ListarRelatoriosUseCase,
    private readonly baixar: BaixarRelatorioUseCase,
    private readonly atendentes: IAtendenteRepository,
  ) {}

  postCriar = async (req: Request, res: Response): Promise<void> => {
    const body = criarSchema.parse(req.body ?? {});
    const auth = req.auth!;
    const scope = scopeFromRequest(req);
    const atendente = await this.atendentes.buscarPorId(auth.sub);
    if (!atendente) throw NotFound('ATENDENTE_NAO_ENCONTRADO', 'Atendente não encontrado');

    const out = await this.criar.exec(
      {
        atendenteId: auth.sub,
        role: auth.role,
        scope,
        nome: atendente.nome,
        matricula: atendente.matricula,
        ip: req.ip ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      {
        tipo: body.tipo,
        dataInicial: body.dataInicial,
        dataFinal: body.dataFinal,
        formato: body.formato,
        ...(body.filtros ? { filtros: body.filtros } : {}),
      },
    );
    res.status(202).json(out);
  };

  getListar = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    const scope = scopeFromRequest(req);
    const lista = await this.listar.exec(auth.sub, auth.role, scope);
    res.json(lista);
  };

  getDownload = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    const scope = scopeFromRequest(req);
    const out = await this.baixar.exec({
      relatorioId: paramString(req, 'id'),
      atendenteId: auth.sub,
      role: auth.role,
      scope,
      ip: req.ip ?? null,
      userAgent: req.header('user-agent') ?? null,
    });
    if (!fs.existsSync(out.caminhoAbsoluto)) {
      throw NotFound('ARQUIVO_NAO_ENCONTRADO', 'Arquivo físico não encontrado');
    }
    res.set('Content-Type', out.contentType);
    res.set('Content-Disposition', `attachment; filename="${out.filename}"`);
    if (out.sha256) res.set('X-Content-SHA256', out.sha256);
    fs.createReadStream(out.caminhoAbsoluto).pipe(res);
  };
}
