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
COPY --from=build /app/database.db ./database.db

ENV NODE_ENV=production \
    PORT=10000 \
    DB_PATH=/tmp/database.db \
    UPLOAD_PATH=/tmp/uploads

RUN mkdir -p /tmp/uploads && chmod -R 777 /tmp

EXPOSE 10000

CMD ["npm", "start"]
