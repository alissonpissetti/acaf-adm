# acaf-adm — Vite SPA + nginx (Coolify)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
# Coolify define NODE_ENV=production no build; sem isso npm ci não instala vite.
RUN npm ci --include=dev

COPY . .

# Vazio em produção: o app chama /api na mesma origem; nginx faz proxy à API.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine AS runner

RUN apk add --no-cache wget tzdata \
  && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
  && echo "America/Sao_Paulo" > /etc/timezone \
  && rm -f /etc/nginx/conf.d/default.conf

ENV TZ=America/Sao_Paulo
ENV PORT=80
# URL interna da acaf-api na rede do Coolify (ex.: http://acaf-api:8787).
ENV API_BACKEND_URL=http://127.0.0.1:8787

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/10-default-env.sh /docker-entrypoint.d/10-default-env.sh

RUN chmod +x /docker-entrypoint.d/10-default-env.sh

EXPOSE 80

# Coolify injeta PORT em runtime; healthcheck usa a porta efetiva do container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD sh -c 'wget -q -O /dev/null "http://127.0.0.1:${PORT:-80}/" || exit 1'

CMD ["nginx", "-g", "daemon off;"]
