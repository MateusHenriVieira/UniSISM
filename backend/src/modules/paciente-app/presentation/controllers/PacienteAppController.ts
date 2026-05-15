import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { NotFound } from '../../../../shared/errors';
import { paramString } from '../../../../shared/http';
import { prisma } from '../../../../infrastructure/database/prisma';
import type { LoginPacienteUseCase } from '../../application/use-cases/LoginPacienteUseCase';
import type { AtivarContaPacienteUseCase } from '../../application/use-cases/AtivarContaPacienteUseCase';
import type { ListarMeusEncaminhamentosUseCase } from '../../application/use-cases/ListarMeusEncaminhamentosUseCase';
import type { ListarNotificacoesUseCase } from '../../application/use-cases/ListarNotificacoesUseCase';
import type { TrocarSenhaPacienteUseCase } from '../../application/use-cases/TrocarSenhaPacienteUseCase';

const loginSchema = z.object({
  cpf: z.string().min(11),
  senha: z.string().min(1),
});

const ativarSchema = z.object({
  cpf: z.string().min(11),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  senha: z.string().min(8),
  nome: z.string().optional(),
});

const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(8),
});

export class PacienteAppController {
  constructor(
    private readonly loginUC: LoginPacienteUseCase,
    private readonly ativarUC: AtivarContaPacienteUseCase,
    private readonly listEncsUC: ListarMeusEncaminhamentosUseCase,
    private readonly notifsUC: ListarNotificacoesUseCase,
    private readonly trocarSenhaUC: TrocarSenhaPacienteUseCase,
  ) {}

  postLogin = async (req: Request, res: Response): Promise<void> => {
    const b = loginSchema.parse(req.body);
    const out = await this.loginUC.exec(
      b.cpf,
      b.senha,
      req.ip ?? '',
      req.header('user-agent') ?? '',
    );
    res.json(out);
  };

  postAtivar = async (req: Request, res: Response): Promise<void> => {
    const b = ativarSchema.parse(req.body);
    await this.ativarUC.exec(b.cpf, b.dataNascimento, b.senha, b.nome);
    res.status(204).send();
  };

  postLogout = async (req: Request, res: Response): Promise<void> => {
    const auth = req.header('authorization') ?? '';
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (m && m[1]) {
      const hash = crypto.createHash('sha256').update(m[1]).digest('hex');
      await prisma.sessaoPaciente.updateMany({
        where: { tokenHash: hash, revogadaEm: null },
        data: { revogadaEm: new Date() },
      });
    }
    res.status(204).send();
  };

  getMe = async (req: Request, res: Response): Promise<void> => {
    const a = req.pacienteAuth!;
    // Lê a flag atual direto do banco (pode ter mudado desde o login)
    const conta = await prisma.pacienteConta.findUnique({
      where: { id: a.contaId },
      select: { senhaProvisoria: true, email: true, telefone: true },
    });
    res.json({
      id: a.contaId,
      nome: a.nome,
      cpf: a.cpfDigits,
      cpfFormatado: a.cpfFormatado,
      senhaProvisoria: conta?.senhaProvisoria ?? false,
      email: conta?.email ?? null,
      telefone: conta?.telefone ?? null,
    });
  };

  postTrocarSenha = async (req: Request, res: Response): Promise<void> => {
    const a = req.pacienteAuth!;
    const b = trocarSenhaSchema.parse(req.body);
    await this.trocarSenhaUC.exec(a.contaId, b.senhaAtual, b.novaSenha);
    res.status(204).send();
  };

  getMeusEncaminhamentos = async (req: Request, res: Response): Promise<void> => {
    const a = req.pacienteAuth!;
    const lista = await this.listEncsUC.exec(a.cpfDigits, a.cpfFormatado);
    res.json(lista);
  };

  getNotificacoes = async (req: Request, res: Response): Promise<void> => {
    const a = req.pacienteAuth!;
    const apenasNaoLidas = req.query['apenasNaoLidas'] === 'true';
    const lista = await this.notifsUC.exec(a.contaId, apenasNaoLidas);
    res.json(lista);
  };

  getNotificacoesCount = async (req: Request, res: Response): Promise<void> => {
    const a = req.pacienteAuth!;
    const naoLidas = await this.notifsUC.countNaoLidas(a.contaId);
    res.json({ naoLidas });
  };

  postMarcarLida = async (req: Request, res: Response): Promise<void> => {
    const a = req.pacienteAuth!;
    await this.notifsUC.marcarLida(a.contaId, paramString(req, 'id'));
    res.status(204).send();
  };

  postMarcarTodasLidas = async (req: Request, res: Response): Promise<void> => {
    const a = req.pacienteAuth!;
    const r = await this.notifsUC.marcarTodasLidas(a.contaId);
    res.json(r);
  };

  /**
   * Download de anexo pelo paciente. Verifica que o anexo pertence a um
   * encaminhamento do próprio CPF E que o scanStatus está LIMPO.
   */
  getDownloadAnexo = async (req: Request, res: Response): Promise<void> => {
    const a = req.pacienteAuth!;
    const anexoId = paramString(req, 'id');
    const anexo = await prisma.anexoDocumento.findUnique({
      where: { id: anexoId },
      include: { encaminhamento: true },
    });
    if (!anexo) throw NotFound('ANEXO_NAO_ENCONTRADO', 'Anexo não encontrado');
    const cpfEnc = anexo.encaminhamento.pacienteCpf.replace(/\D+/g, '');
    if (cpfEnc !== a.cpfDigits) throw NotFound('ANEXO_NAO_ENCONTRADO', 'Anexo não encontrado');
    if (anexo.scanStatus !== 'LIMPO') {
      res.status(409).json({
        error: {
          code: 'ANEXO_NAO_LIBERADO',
          message: 'Arquivo ainda em processamento ou bloqueado por segurança',
          details: { scanStatus: anexo.scanStatus },
        },
      });
      return;
    }
    // Redireciona para a rota de download (reutilizamos Storage)
    // Em dev: re-stream do disco; em prod: URL pré-assinada S3.
    // Por simplicidade aqui usamos Content-Disposition direto.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const env = await import('../../../../shared/env');
    const abs = path.resolve(env.env.UPLOAD_DIR, anexo.caminho);
    if (!fs.existsSync(abs)) {
      throw NotFound('ARQUIVO_NAO_ENCONTRADO', 'Arquivo físico não encontrado');
    }
    res.set('Content-Type', anexo.mimeType);
    res.set('Content-Disposition', `attachment; filename="${anexo.nome}"`);
    fs.createReadStream(abs).pipe(res);
  };
}
