FROM node:14.18.2-alpine as builder
# FROM node:14.18.2-alpine
RUN apk add --no-cache git python3 build-base
# RUN npm install -g node-gyp
WORKDIR /opt/app

COPY tsconfig.json package.json package-lock.json* /opt/app/
COPY src /opt/app/src
RUN npm install
RUN npm run build


FROM node:14.18.2-alpine
RUN apk add --no-cache git python3 g++ make
# RUN npm install -g node-gyp
WORKDIR /opt/app

COPY package.json package-lock.json* /opt/app/
RUN npm ci --production
COPY --from=builder /opt/app/build .

EXPOSE 3003

CMD ["node", "index.js"]
