FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend install

COPY . .
RUN npm --prefix frontend run build

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/public ./public
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/auth.js ./auth.js
COPY --from=build /app/database.js ./database.js
COPY --from=build /app/storage ./storage
COPY --from=build /app/backups ./backups
# database.db sengaja TIDAK di-copy (gitignored/ephemeral).
# Database dipulihkan otomatis dari backups/ saat startup (lihat database.js).

ENV NODE_ENV=production \
    PORT=10000 \
    DB_PATH=/data/database.db \
    UPLOAD_PATH=/data/uploads \
    BACKUP_PATH=/data/backups

RUN mkdir -p /data/uploads /data/backups && chmod -R 777 /data

EXPOSE 10000

CMD ["npm", "start"]
