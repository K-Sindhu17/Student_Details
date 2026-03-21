# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Copy both nginx configs (entrypoint picks the right one)
COPY nginx.conf /etc/nginx/conf.d/nginx-ssl.conf
COPY nginx-init.conf /etc/nginx/conf.d/nginx-init.conf

# Smart entrypoint that checks if SSL certs exist
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
