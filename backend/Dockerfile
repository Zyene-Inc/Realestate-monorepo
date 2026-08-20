# Base image
FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the server
CMD [ "npm", "run", "start:prod" ]
