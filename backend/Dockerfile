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

# Remover devDependencies após build (economizar espaço)
RUN npm prune --production

# Expor porta
EXPOSE 10000

# Start
CMD ["npm", "start"]

