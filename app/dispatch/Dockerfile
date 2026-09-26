#
# Stage 1: Build stage
#
FROM golang:1.17-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY *.go ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /bin/dispatch

#
# Stage 2: Runtime stage
#
FROM alpine:3.18 AS runtime

WORKDIR /app

RUN adduser -D -u 10001 appuser

COPY --from=builder --chown=appuser:appuser /bin/dispatch /app/dispatch

USER appuser

CMD ["/app/dispatch"]


