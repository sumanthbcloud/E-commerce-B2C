<?php

declare(strict_types=1);

namespace Instana\RobotShop\Ratings\Service;

class MetricsService
{
    private string $storagePath;

    /**
     * @var float[]
     */
    private array $buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0];

    public function __construct(string $storagePath = '')
    {
        $this->storagePath = $storagePath !== '' ? $storagePath : sys_get_temp_dir() . '/ratings_metrics.json';
    }

    public function recordRequest(string $method, string $route, int $statusCode, float $duration): void
    {
        $method = strtoupper($method);
        $statusStr = (string) $statusCode;

        $fp = @fopen($this->storagePath, 'c+');
        if (!$fp) {
            return;
        }

        if (flock($fp, LOCK_EX)) {
            $contents = stream_get_contents($fp);
            $data = $contents ? json_decode($contents, true) : [];
            if (!is_array($data)) {
                $data = [];
            }

            if (!isset($data['counters'])) {
                $data['counters'] = [];
            }
            if (!isset($data['histograms'])) {
                $data['histograms'] = [];
            }

            $key = sprintf('%s|%s|%s', $method, $route, $statusStr);

            // Increment request counter
            $data['counters'][$key] = ($data['counters'][$key] ?? 0) + 1;

            // Update duration histogram
            if (!isset($data['histograms'][$key])) {
                $data['histograms'][$key] = [
                    'count' => 0,
                    'sum' => 0.0,
                    'buckets' => array_fill_keys(array_map('strval', $this->buckets), 0),
                ];
            }

            $data['histograms'][$key]['count'] += 1;
            $data['histograms'][$key]['sum'] += $duration;

            foreach ($this->buckets as $bucket) {
                if ($duration <= $bucket) {
                    $bKey = (string) $bucket;
                    $data['histograms'][$key]['buckets'][$bKey] = ($data['histograms'][$key]['buckets'][$bKey] ?? 0) + 1;
                }
            }

            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, (string) json_encode($data));
            fflush($fp);
            flock($fp, LOCK_UN);
        }

        fclose($fp);
    }

    public function renderMetrics(): string
    {
        $data = [];
        if (file_exists($this->storagePath)) {
            $fp = @fopen($this->storagePath, 'r');
            if ($fp) {
                if (flock($fp, LOCK_SH)) {
                    $contents = stream_get_contents($fp);
                    $data = $contents ? json_decode($contents, true) : [];
                    flock($fp, LOCK_UN);
                }
                fclose($fp);
            }
        }

        if (!is_array($data)) {
            $data = [];
        }

        $lines = [];

        // PHP runtime / process metrics
        $lines[] = '# HELP php_info Information about the PHP runtime.';
        $lines[] = '# TYPE php_info gauge';
        $lines[] = sprintf('php_info{version="%s"} 1', PHP_VERSION);
        $lines[] = '';

        $lines[] = '# HELP php_memory_usage_bytes Current memory usage of PHP in bytes.';
        $lines[] = '# TYPE php_memory_usage_bytes gauge';
        $lines[] = sprintf('php_memory_usage_bytes %d', memory_get_usage(true));
        $lines[] = '';

        $lines[] = '# HELP php_memory_peak_usage_bytes Peak memory usage of PHP in bytes.';
        $lines[] = '# TYPE php_memory_peak_usage_bytes gauge';
        $lines[] = sprintf('php_memory_peak_usage_bytes %d', memory_get_peak_usage(true));
        $lines[] = '';

        if (function_exists('opcache_get_status')) {
            $opcache = @opcache_get_status(false);
            if (is_array($opcache) && isset($opcache['memory_usage'])) {
                $lines[] = '# HELP php_opcache_memory_used_bytes Opcache memory used in bytes.';
                $lines[] = '# TYPE php_opcache_memory_used_bytes gauge';
                $lines[] = sprintf('php_opcache_memory_used_bytes %d', $opcache['memory_usage']['used_memory'] ?? 0);
                $lines[] = '';

                $lines[] = '# HELP php_opcache_memory_free_bytes Opcache memory free in bytes.';
                $lines[] = '# TYPE php_opcache_memory_free_bytes gauge';
                $lines[] = sprintf('php_opcache_memory_free_bytes %d', $opcache['memory_usage']['free_memory'] ?? 0);
                $lines[] = '';
            }
        }

        // HTTP request count
        $lines[] = '# HELP http_requests_total Total number of HTTP requests';
        $lines[] = '# TYPE http_requests_total counter';
        if (!empty($data['counters'])) {
            foreach ($data['counters'] as $key => $count) {
                [$method, $route, $statusStr] = explode('|', $key, 3);
                $lines[] = sprintf(
                    'http_requests_total{method="%s",route="%s",status_code="%s"} %d',
                    addcslashes($method, '"\\'),
                    addcslashes($route, '"\\'),
                    addcslashes($statusStr, '"\\'),
                    $count
                );
            }
        }
        $lines[] = '';

        // HTTP request duration
        $lines[] = '# HELP http_request_duration_seconds HTTP request duration in seconds';
        $lines[] = '# TYPE http_request_duration_seconds histogram';
        if (!empty($data['histograms'])) {
            foreach ($data['histograms'] as $key => $hist) {
                [$method, $route, $statusStr] = explode('|', $key, 3);
                $m = addcslashes($method, '"\\');
                $r = addcslashes($route, '"\\');
                $s = addcslashes($statusStr, '"\\');

                foreach ($this->buckets as $bucket) {
                    $bKey = (string) $bucket;
                    $bucketVal = (int) ($hist['buckets'][$bKey] ?? 0);
                    $lines[] = sprintf(
                        'http_request_duration_seconds_bucket{le="%s",method="%s",route="%s",status_code="%s"} %d',
                        $bKey,
                        $m,
                        $r,
                        $s,
                        $bucketVal
                    );
                }
                $lines[] = sprintf(
                    'http_request_duration_seconds_bucket{le="+Inf",method="%s",route="%s",status_code="%s"} %d',
                    $m,
                    $r,
                    $s,
                    $hist['count']
                );
                $lines[] = sprintf(
                    'http_request_duration_seconds_sum{method="%s",route="%s",status_code="%s"} %F',
                    $m,
                    $r,
                    $s,
                    $hist['sum']
                );
                $lines[] = sprintf(
                    'http_request_duration_seconds_count{method="%s",route="%s",status_code="%s"} %d',
                    $m,
                    $r,
                    $s,
                    $hist['count']
                );
            }
        }
        $lines[] = '';

        return implode("\n", $lines);
    }
}
