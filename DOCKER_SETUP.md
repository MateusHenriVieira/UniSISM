# 🐳 Guia de Setup com Docker e Prisma - UniSISM

Este guia ensina como rodar o **frontend** (SvelteKit) e **backend** (Node.js) completos com Docker, PostgreSQL, Redis, MinIO e Prisma.

---

## 📋 Pré-requisitos

- **Docker** (≥ 20.10) e **Docker Compose** (≥ 2.0)
- **Node.js** (≥ 18) instalado localmente *apenas para desenvolvimento sem Docker*
- **Git** para clonar o projeto

Verificar instalações:
```bash
docker --version
docker-compose --version
node --version
```

---

## 🏗️ Arquitetura dos Serviços

O projeto utiliza os seguintes serviços Docker:

| Serviço | Container | Porta | Função |
|---------|-----------|-------|--------|
| **PostgreSQL** | `unisism-postgres` | 5432 | Banco de dados principal |
| **Redis** | `unisism-redis` | 6379 | Cache e sessões |
| **MinIO** | `unisism-minio` | 9000, 9001 | Storage S3 (arquivos) |
| **ClamAV** | `unisism-clamav` | 3310 | Antivírus para uploads |
| **Backend** | `unisism-backend` | 3333 | API Node.js |
| **Frontend** | *local* | 5173 | SvelteKit (desenvolvimento) |

---

## 🚀 Quick Start (5 minutos)

### 1️⃣ Clonar e entrar no diretório

```bash
cd /path/to/UniSISM
```

### 2️⃣ Criar arquivo `.env` (backend)

Na raiz de `backend/`, crie um arquivo `.env`:

```bash
# Banco de dados
POSTGRES_USER=unisism
POSTGRES_PASSWORD=unisism123
POSTGRES_DB=unisism_ubs
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# MinIO / S3
S3_ACCESS_KEY=unisism
S3_SECRET_KEY=unisism12345
S3_BUCKET=unisism-anexos

# JWT (ALTERAR EM PRODUÇÃO!)
JWT_SECRET=seu-secret-super-seguro-aqui
JWT_REFRESH_SECRET=seu-refresh-secret-aqui
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Storage
STORAGE_PROVIDER=s3

# ClamAV
CLAMAV_PORT=3310

# Backend
BACKEND_PORT=3333
NODE_ENV=development
```

### 3️⃣ Iniciar todos os serviços

```bash
cd backend/

# Subir todos os containers
docker-compose up -d

# Aguarde ~30-60 segundos para tudo estar pronto
# (ClamAV demora mais tempo no primeiro start)
```

### 4️⃣ Executar Prisma (banco de dados)

Em **outro terminal**, no diretório `backend/`:

```bash
cd backend/

# Gerar cliente Prisma
npx prisma generate

# Executar migrações
npx prisma migrate deploy

# (Opcional) Popular banco com dados de teste
npm run db:seed
```

### 5️⃣ Verificar status dos containers

```bash
docker-compose ps
```

Deve mostrar todos os serviços com `Up`:

```
NAME                    STATUS
unisism-postgres        Up (healthy)
unisism-redis           Up (healthy)
unisism-minio           Up (healthy)
unisism-clamav          Up (healthy)
unisism-backend         Up
```

### 6️⃣ Rodar o frontend

Em **outro terminal**, no diretório `frontend/`:

```bash
cd frontend/

# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev
```

✅ **Pronto!** Acesse:
- 🌐 **Frontend**: http://localhost:5173
- 🔧 **API Backend**: http://localhost:3333
- 📊 **MinIO Console**: http://localhost:9001 (user: `unisism`, password: `unisism12345`)

---

## 📝 Detalhes de Cada Etapa

### 🗄️ PostgreSQL + Prisma

#### O que é Prisma?
Prisma é um ORM (Object-Relational Mapping) que gerencia seu banco de dados de forma type-safe.

#### Arquivo de schema
```
backend/prisma/schema.prisma
```

#### Comandos úteis do Prisma

```bash
cd backend/

# Gerar cliente Prisma (necessário ao iniciar)
npx prisma generate

# Criar e executar nova migração
npx prisma migrate dev --name nome_da_migracao

# Executar migrações já criadas (para produção)
npx prisma migrate deploy

# Abrir interface visual do banco (Prisma Studio)
npx prisma studio

# Ver histórico de migrações
npx prisma migrate history
```

**Exemplo - Adicionar nova tabela:**

1. Edit `backend/prisma/schema.prisma`
2. Defina a nova tabela/model
3. Execute: `npx prisma migrate dev --name add_nova_tabela`
4. Prisma automaticamente cria a migração `.sql` em `backend/prisma/migrations/`

### ♻️ Redis

Redis é usado para:
- Cache de dados frequentes
- Gerenciamento de sessões
- Fila de processamento

Acesso local (dentro do container):
```bash
# Conectar ao Redis
docker-compose exec redis redis-cli

# Exemplos de comandos
ping           # Verificar conexão
DBSIZE         # Ver quantidade de chaves
KEYS *         # Listar todas as chaves
FLUSHDB        # Limpar tudo (cuidado!)
```

### 💾 MinIO (S3 Storage)

MinIO simula um servidor S3 para armazenar arquivos (anexos, uploads, etc).

#### Acessar console web:
- URL: http://localhost:9001
- Username: `unisism`
- Password: `unisism12345`

#### Criar bucket (se não existir):
```bash
docker-compose exec minio mc admin info local

# Ou via console web:
# 1. Faça login
# 2. Clique em "Create bucket" (+)
# 3. Nome: unisism-anexos
```

#### Inicializar MinIO com buckets:
```bash
cd backend/
npm run minio:init
```

### 🦠 ClamAV (Antivírus)

ClamAV verifica arquivos enviados procurando por vírus/malware.

⚠️ **Primeira execução demora ~2-5 minutos** (baixa assinaturas de vírus).

```bash
# Ver logs do ClamAV
docker-compose logs -f clamav

# Executar scan manual
docker-compose exec clamav clamdcheck.sh
```

---

## 🔄 Fluxo de Desenvolvimento

### Desenvolvimento Local (sem Docker para código)

Se quiser rodar apenas o banco de dados em Docker e o código Node.js localmente:

```bash
# Terminal 1: Subir apenas banco de dados (postgresql, redis, minio)
cd backend/
docker-compose up postgres redis minio -d

# Terminal 2: Instalar dependências backend
npm install

# Terminal 3: Rodar backend em desenvolvimento
npm run dev

# Terminal 4: Rodar frontend em desenvolvimento
cd ../frontend/
npm install
npm run dev
```

### Parar e limpar containers

```bash
# Parar todos os containers
docker-compose down

# Parar e remover volumes (CUIDADO: deleta dados!)
docker-compose down -v

# Ver logs de um serviço específico
docker-compose logs -f backend

# Ver logs de todos
docker-compose logs -f
```

---

## 🧪 Testes com Docker

### Backend

```bash
cd backend/

# Rodar testes unitários
npm test

# Rodar com cobertura
npm run test:coverage

# Rodar em modo watch
npm run test:watch
```

### Frontend

```bash
cd frontend/

# Rodar testes Vitest
npm test

# Rodar testes em modo watch
npm run test:watch
```

---

## 🌍 Variáveis de Ambiente

### Backend (.env)

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `NODE_ENV` | `development` | Ambiente (development/production) |
| `PORT` | `3333` | Porta do backend |
| `DATABASE_URL` | PostgreSQL string | Conexão com banco |
| `REDIS_URL` | `redis://redis:6379` | Conexão com Redis |
| `JWT_SECRET` | string aleatória | Secret para assinar JWTs |
| `CORS_ORIGIN` | `http://localhost:5173` | URL do frontend (CORS) |
| `S3_*` | MinIO configs | Credenciais para storage |
| `CLAMAV_HOST` | `clamav` | Host do antivírus |
| `STORAGE_PROVIDER` | `s3` | Tipo de storage (s3/local) |

### Frontend (.env - opcional)

```bash
# Criar arquivo frontend/.env se necessário
VITE_API_URL=http://localhost:3333
```

---

## 🐛 Troubleshooting

### ❌ "Connection refused" ao conectar no banco

```bash
# Verificar se postgres está rodando
docker-compose ps postgres

# Ver logs do postgres
docker-compose logs postgres

# Aguardar healthcheck passar (max 50 segundos)
docker-compose exec postgres pg_isready -U unisism -d unisism_ubs
```

### ❌ "Error: EADDRINUSE: address already in use :::5432"

A porta 5432 já está em uso (outro postgres rodando).

```bash
# Opção 1: Matar processo na porta
lsof -ti:5432 | xargs kill -9

# Opção 2: Usar porta diferente no .env
POSTGRES_PORT=5433
```

### ❌ Backend não consegue conectar ao banco

Verificar `DATABASE_URL` no `.env`:

```bash
# Correto (dentro do docker-compose)
DATABASE_URL=postgresql://unisism:unisism123@postgres:5432/unisism_ubs

# Incorreto (localhost não funciona dentro do container)
DATABASE_URL=postgresql://unisism:unisism123@localhost:5432/unisism_ubs
```

### ❌ MinIO bucket não encontrado

```bash
# Criar bucket manualmente
docker-compose exec minio mc mb local/unisism-anexos

# Ou via:
npm run minio:init
```

### ❌ ClamAV demorado no primeiro start

Normal! Primeiro start baixa ~800MB de assinaturas.

```bash
# Aguardar com:
docker-compose logs -f clamav

# Quando ver "FRESH SOUND" = pronto
```

### ❌ Mudanças no Prisma schema não funcionam

```bash
# Regenerar cliente Prisma
npx prisma generate

# Se ainda não funcionar, limpar cache:
rm -rf node_modules/.prisma
rm -rf generated/
npx prisma generate
```

### ❌ Frontend não conecta na API

```bash
# Verificar CORS_ORIGIN no backend
echo $CORS_ORIGIN

# Deve ser http://localhost:5173

# Verificar se API está respondendo
curl http://localhost:3333/health
```

---

## 📦 Build para Produção

### Backend (Docker image)

```bash
cd backend/

# Build image
docker build -t unisism-backend:latest .

# Rodar imagem
docker run -p 3333:3333 --env-file .env unisism-backend:latest
```

### Frontend (Static export)

```bash
cd frontend/

# Build
npm run build

# Servir estático (ex: nginx)
npm run preview
```

---

## 🔐 Segurança em Produção

⚠️ **NUNCA use os valores padrão em produção!**

```bash
# .env produção deve ter:
JWT_SECRET=gerar_string_aleatória_forte
JWT_REFRESH_SECRET=gerar_outra_string_aleatória
S3_SECRET_KEY=senha_segura_aqui
POSTGRES_PASSWORD=senha_super_segura
```

Gerar secrets seguros:
```bash
# Opção 1: openssl
openssl rand -base64 32

# Opção 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📚 Próximos Passos

1. **Documentação do Backend**: Veja [backend/docs/API.md](backend/docs/API.md)
2. **Documentação do Frontend**: Veja [frontend/README.md](frontend/README.md)
3. **Setup de CI/CD**: Configure GitHub Actions ou similar
4. **Deploy**: Use Docker Compose, Kubernetes, ou plataforma cloud

---

## 🆘 Suporte

Para problemas ou dúvidas:

1. Verificar logs: `docker-compose logs -f [service]`
2. Consultar [backend/README.md](backend/README.md)
3. Verificar issues no repositório
4. Contactar o time de desenvolvimento

---

**Última atualização**: Abril de 2026  
**Versão do Node**: 22 Alpine  
**Versão do Prisma**: 6.4.1  
**Versão do PostgreSQL**: 16 Alpine
