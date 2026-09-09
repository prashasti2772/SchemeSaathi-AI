FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY apps/frontend/package*.json ./
RUN npm ci
COPY apps/frontend/ ./
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/backend/src ./src
COPY --from=frontend /build/dist ./static
RUN useradd --create-home appuser && mkdir /data && chown appuser:appuser /data
USER appuser
ENV STATIC_DIR=/app/static
ENV DATABASE_URL=sqlite+aiosqlite:////data/schemesathi.db
ENV ENV=production
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

