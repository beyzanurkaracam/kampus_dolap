# --- AŞAMA 1: BUILD (Derleme) Aşaması ---
# 'alpine' yerine 'bullseye-slim' kullanıyoruz (C++ derleme sorunlarını çözer)
FROM node:20-bullseye-slim AS builder

WORKDIR /usr/src/app

# Sadece paket dosyalarını kopyala
COPY package*.json ./

# HIZLANDIRICI: npm install yerine npm ci (Clean Install) kullanıyoruz
RUN npm ci

# Tüm kodları kopyala ve derle
COPY . .
RUN npm run build

# --- AŞAMA 2: PRODUCTION (Canlı Ortam) Aşaması ---
FROM node:20-bullseye-slim

WORKDIR /usr/src/app

# Sadece canlı ortam paketlerini hızlıca kur
COPY package*.json ./
RUN npm ci --only=production

# Builder'dan gelen derlenmiş (dist) kodları kopyala
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]