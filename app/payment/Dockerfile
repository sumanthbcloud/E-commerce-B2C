#
# Stage 1: Build dependencies & wheels
#
FROM python:3.9-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

#
# Stage 2: Runtime
#
FROM python:3.9-slim AS runtime

EXPOSE 8080

WORKDIR /app

RUN useradd -u 10001 -m -s /bin/sh appuser

COPY --from=builder /install /usr/local
COPY --chown=appuser:appuser *.py payment.ini ./

USER appuser

CMD ["uwsgi", "--ini", "payment.ini"]


