FROM node:20-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create logs directory
RUN mkdir -p /app/logs

EXPOSE 3000

# Add healthcheck endpoint support
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["npm", "start"]