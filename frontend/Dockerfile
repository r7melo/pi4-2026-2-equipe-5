# =============================================================================
# Estágio 1 — deps: instala dependências (cache reutilizável)
# =============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

# =============================================================================
# Estágio 2 — dev: servidor Vite com HMR (usado pelo docker-compose em dev)
# =============================================================================
FROM node:20-alpine AS dev

WORKDIR /app

# Reutiliza node_modules já instalados
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

# import.meta.env.DEV = true  →  ApiModeSwitcher visível, mock ativo via localStorage
CMD ["npm", "run", "dev"]

# =============================================================================
# Estágio 3 — builder: gera o bundle de produção
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NODE_ENV=production faz o Vite substituir import.meta.env.DEV por false.
# O tree-shaker elimina automaticamente o ApiModeSwitcher e qualquer código
# exclusivo de desenvolvimento do bundle final.
ARG VITE_API_URL
ARG VITE_USE_MOCK=false

ENV NODE_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_USE_MOCK=${VITE_USE_MOCK}

RUN npm run build

# =============================================================================
# Estágio 4 — prod: serve o bundle estático com nginx (imagem mínima)
# =============================================================================
FROM nginx:1.27-alpine AS prod

# Remove a configuração padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Configuração customizada para SPA React (React Router precisa de fallback)
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copia apenas o bundle gerado pelo estágio builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
