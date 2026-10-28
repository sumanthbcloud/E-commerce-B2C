<?php

declare(strict_types=1);

namespace Instana\RobotShop\Ratings\EventListener;

use Instana\RobotShop\Ratings\Service\MetricsService;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\TerminateEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Routing\RouterInterface;

class MetricsEventSubscriber implements EventSubscriberInterface
{
    private MetricsService $metricsService;
    private RouterInterface $router;

    public function __construct(MetricsService $metricsService, RouterInterface $router)
    {
        $this->metricsService = $metricsService;
        $this->router = $router;
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 1024],
            KernelEvents::TERMINATE => ['onKernelTerminate', -1024],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $event->getRequest()->attributes->set('_request_start_time', microtime(true));
    }

    public function onKernelTerminate(TerminateEvent $event): void
    {
        $request = $event->getRequest();
        $response = $event->getResponse();

        $startTime = $request->attributes->get('_request_start_time');
        $duration = $startTime !== null ? (microtime(true) - (float) $startTime) : 0.0;

        $route = $request->attributes->get('_route');
        $normalizedRoute = 'unmatched';

        if (is_string($route) && $route !== '') {
            $matchedRoute = $this->router->getRouteCollection()->get($route);
            if ($matchedRoute) {
                $normalizedRoute = $matchedRoute->getPath();
            } else {
                $normalizedRoute = $route;
            }
        }

        $method = $request->getMethod();
        $statusCode = $response->getStatusCode();

        $this->metricsService->recordRequest($method, $normalizedRoute, $statusCode, $duration);
    }
}
