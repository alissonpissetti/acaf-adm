# acaf-adm — Vite SPA + nginx (Coolify)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vazio em produção: o app chama /api na mesma origem; nginx faz proxy à API.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine AS runner

RUN apk add --no-cache wget tzdata \
  && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
  && echo "America/Sao_Paulo" > /etc/timezone

ENV TZ=America/Sao_Paulo
ENV PORT=80
# URL interna da acaf-api no Coolify (ajuste no deploy se necessário).
ENV API_BACKEND_URL=http://127.0.0.1:8787

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/" || exit 1

CMD ["nginx", "-g", "daemon off;"]
