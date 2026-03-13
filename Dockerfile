FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar fuentes
COPY . .

# NEXT_PUBLIC_API_URL se embebe en el build de Next.js
# Pasar al buildear: docker build --build-arg NEXT_PUBLIC_API_URL=http://<tailscale-ip>:3000
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NODE_ENV=production \
    PORT=3001 \
    TZ=America/Argentina/Buenos_Aires

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]
