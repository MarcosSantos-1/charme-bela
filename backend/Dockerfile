# Dockerfile para Render
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS as dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Remover devDependencies após build (economizar espaço).
# prisma CLI fica em dependencies — o Fly release_command precisa dele.
RUN npm prune --production
RUN test -x node_modules/.bin/prisma
RUN chmod +x scripts/fly-migrate.sh

# Fly injeta PORT=8080; fallback local continua 3333
EXPOSE 8080

CMD ["npm", "start"]

