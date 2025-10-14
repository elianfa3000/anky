# Build Stage
FROM node:22.12-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
# o npm install
COPY . .
EXPOSE 5173
# Vite usa 5173 por defecto
CMD ["npm","run", "dev"]

# docker run -p 5173:5173 <ggg>
