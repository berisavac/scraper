# Deploy

## Na VPS-u (SSH)
```bash
docker stop scraper
docker rm scraper
git pull
docker build -t scraper .
docker run -d -p 3000:3000 --name scraper scraper
```

## Test
```bash
curl http://localhost:3000/matches
curl http://localhost:3000/match/{id}
```
