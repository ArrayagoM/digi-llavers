FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# El directorio de uploads se monta como volumen en Railway
RUN mkdir -p /data/uploads

EXPOSE 3000

CMD ["node", "src/server.js"]
