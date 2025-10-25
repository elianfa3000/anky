#--- STAGE 1: DEVELOPMENT ---
FROM node:22.12-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
# o npm install
COPY . .
EXPOSE 5173
# Vite usa 5173 por defecto
CMD ["npm","run", "dev"]

# docker run -p 5173:5173 <ggg>

# --- STAGE 2: BUILD (PRODUCCIÓN FINAL) ---
FROM node:22.12-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- STAGE 3: SERVIR (con nginx, más profesional) ---
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]