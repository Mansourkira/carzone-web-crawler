# Carzone Web Crawler

A Docker-based web crawler that fetches pages from carzone.ie and saves them as raw HTML files.

## Build

```bash
docker build -t carzone-crawler .
```

## Run

### Without proxy (direct connection):

```bash
docker run -v ./output:/app/output carzone-crawler
```

### With proxy:

```bash
# Using HTTP_PROXY
docker run -e HTTP_PROXY=http://proxy.example.com:8080 -v ./output:/app/output carzone-crawler

# Using HTTPS_PROXY
docker run -e HTTPS_PROXY=http://proxy.example.com:8080 -v ./output:/app/output carzone-crawler
```

### Using docker-compose (loads from .env file):

1. Copy `.env.example` to `.env` and configure if needed:
   ```bash
   cp .env.example .env
   ```

2. Run:
   ```bash
   docker-compose up --build
   ```

A proxy can be provided via `HTTP_PROXY`, `HTTPS_PROXY`, or `PROXY_URL` environment variables. Note: `HTTP_PROXY` works for both HTTP and HTTPS targets via proxy tunneling. HTML files are written to the mounted output directory.
