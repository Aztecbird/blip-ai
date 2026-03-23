# Use ultra-lightweight Node 20 as our base Linux image
FROM node:20-slim

# Create a clean directory for Blip on the container
WORKDIR /app

# Copy the package definitions first
COPY package*.json ./

# Install only production dependencies (skipping dev tools like Vite for the backend)
RUN npm ci --omit=dev

# Copy the rest of the Blip source code
COPY . .

# We purposefully do not define a 'CMD' here because docker-compose
# will automatically inject the specific npm script (e.g. dev:gmail-backend)
# for each of the 6 microservices that it spins up from this single image!
