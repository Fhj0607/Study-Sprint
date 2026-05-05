# Signup Confirmation Page

This serves a very small static confirmation page with `nginx`.

## Run

```bash
docker compose up -d
```

It will be available on port `8080` on the VPS.

## Files

- `docker-compose.yml`: starts `nginx:alpine`
- `site/index.html`: the page shown after email confirmation

## Notes

- If you already have a reverse proxy on the VPS, point your domain or subdomain to `http://localhost:8080`.
- If you want this container to bind directly to port `80`, change `8080:80` to `80:80` in `docker-compose.yml`.
