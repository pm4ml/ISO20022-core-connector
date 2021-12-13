FROM node:12.22.6-alpine as builder
RUN apk add --no-cache git python3 build-base
WORKDIR /opt/app

COPY tsconfig.json package.json package-lock.json* /opt/app/
COPY src /opt/app/src
RUN npm install
RUN npm run build


FROM node:12.22.6-alpine
RUN apk add --no-cache git python3 g++ make
WORKDIR /opt/app

COPY package.json package-lock.json* /opt/app/
RUN npm ci --production
COPY --from=builder /opt/app/build .

EXPOSE 3003

CMD ["node", "index.js"]
