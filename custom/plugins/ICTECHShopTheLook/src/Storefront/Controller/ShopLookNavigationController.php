<?php

declare(strict_types=1);

namespace ICTECHShopTheLook\Storefront\Controller;

use Shopware\Core\Content\Cms\SalesChannel\AbstractCmsRoute;
use Shopware\Core\PlatformRequest;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Shopware\Storefront\Controller\StorefrontController;
use Shopware\Storefront\Framework\Routing\StorefrontRouteScope;
use Shopware\Storefront\Page\Navigation\NavigationPageLoaderInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: [PlatformRequest::ATTRIBUTE_ROUTE_SCOPE => [StorefrontRouteScope::ID]])]
class ShopLookNavigationController extends StorefrontController
{
    public function __construct(
        private readonly NavigationPageLoaderInterface $navigationPageLoader,
        private readonly AbstractCmsRoute $cmsRoute,
    ) {
    }

    #[Route(
        path: '/navigation/{navigationId}/{cmsPageId}',
        name: 'frontend.ict.shop.look.page',
        defaults: [PlatformRequest::ATTRIBUTE_HTTP_CACHE => true],
        methods: [Request::METHOD_GET]
    )]
    public function index(
        string $navigationId,
        string $cmsPageId,
        Request $request,
        SalesChannelContext $context
    ): Response {
        $request->attributes->set('navigationId', $navigationId);

        $page = $this->navigationPageLoader->load($request, $context);
        $cmsPage = $this->cmsRoute->load($cmsPageId, $request, $context)->getCmsPage();

        $page->setCmsPage($cmsPage);

        return $this->renderStorefront('@Storefront/storefront/page/content/index.html.twig', [
            'page' => $page,
        ]);
    }

    #[Route(
        path: '/ict-shop-look/page/{cmsPageId}',
        name: 'frontend.ict.shop.look.page.fallback',
        defaults: [PlatformRequest::ATTRIBUTE_HTTP_CACHE => true],
        methods: [Request::METHOD_GET]
    )]
    public function fallback(
        string $cmsPageId,
        Request $request,
        SalesChannelContext $context
    ): Response {
        $navigationId = $context->getSalesChannel()->getNavigationCategoryId();
        $request->attributes->set('navigationId', $navigationId);

        $page = $this->navigationPageLoader->load($request, $context);
        $cmsPage = $this->cmsRoute->load($cmsPageId, $request, $context)->getCmsPage();

        $page->setCmsPage($cmsPage);

        return $this->renderStorefront('@Storefront/storefront/page/content/index.html.twig', [
            'page' => $page,
        ]);
    }
}
