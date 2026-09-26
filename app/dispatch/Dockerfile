#
# Build stage
#
FROM golang:1.17-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY *.go ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /bin/dispatch

#
# Runtime stage
#
FROM alpine:3.18

WORKDIR /app

COPY --from=build /bin/dispatch /app/dispatch

CMD ["/app/dispatch"]

