# Copy to .env next to compose.yml

# Letters and digits only: it goes into the database URL as is
POSTGRES_PASSWORD=change-me

# The address people use to reach the app (calendar links point to it)
PUBLIC_URL=https://cinecal.example.com

# Host port of the app (default 3000)
# PORT=3000

# ImageKit private API key: the scraper stores the posters there (the IMAGEKIT_API_KEY GitHub secret until now)
IMAGEKIT_API_KEY=

# Image tag to run: latest, or a commit from main (default latest)
# CINECAL_VERSION=latest
