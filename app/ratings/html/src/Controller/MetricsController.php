<?php

declare(strict_types=1);

namespace Instana\RobotShop\Ratings\Controller;

use Instana\RobotShop\Ratings\Service\MetricsService;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class MetricsController
{
    private MetricsService $metricsService;

    public function __construct(MetricsService $metricsService)
    {
        $this->metricsService = $metricsService;
    }

    #[Route('/metrics', methods: ['GET'])]
    public function metrics(): Response
    {
        $content = $this->metricsService->renderMetrics();

        return new Response($content, Response::HTTP_OK, [
            'Content-Type' => 'text/plain; version=0.0.4; charset=utf-8',
        ]);
    }
}
