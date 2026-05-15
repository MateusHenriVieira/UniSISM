# ⚡ Quick Start - Docker + Prisma

## 30 segundos de setup:

```bash
# 1. Entrar no diretório backend
cd backend/

# 2. Criar .env a partir do exemplo (se não existir)
cp .env.example .env

# 3. (OPCIONAL) Editar .env se quiser mudar portas/senhas
# nano .env

# 4. Subir todos os containers
docker-compose up -d

# 5. AGUARDAR ~60 SEGUNDOS (ClamAV demora no primeiro start)
# Verifique com:
docker-compose ps

# 6. Em outro terminal, executar Prisma
npx prisma generate
npx prisma migrate deploy
npm run db:seed          # opcional: popular banco

# 7. Em outro terminal, rodar frontend
cd frontend/
npm install
npm run dev

# ✅ Pronto! Acesse http://localhost:5173
```

## Verificar se está funcionando:

```bash
# API respondendo?
curl http://localhost:3333/health

# MinIO acessível?
# http://localhost:9001 (user: unisism, password: unisism12345)

# Banco conectado?
docker-compose exec postgres pg_isready -U unisism
```

## Parar tudo:

```bash
docker-compose down
```

## Remover tudo (incluindo dados):

```bash
docker-compose down -v
```

---

**Ver guia completo em: [DOCKER_SETUP.md](DOCKER_SETUP.md)**
