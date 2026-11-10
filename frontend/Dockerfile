FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# ci instala exatamente o que está no package-lock.json
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Imagem do nginx que roda sem root (por isso escuta na 8080, não na 80)
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
