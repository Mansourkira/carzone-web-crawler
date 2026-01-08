# Carzone Web Crawler

A Docker-based web crawler that fetches pages from carzone.ie and saves them as raw HTML files.

## Build

```bash
docker build -t carzone-crawler .
```

## Run

```bash
docker run -e HTTP_PROXY=http://proxy.example.com:8080 -v ./output:/app/output carzone-crawler
```

A proxy can be provided via `HTTP_PROXY`, `HTTPS_PROXY`, or `PROXY_URL` environment variables. HTML files are written to the mounted output directory.
