<?php

declare(strict_types=1);

namespace ICTECHShopTheLook\Subscriber;

use ICTECHShopTheLook\Struct\ShopTheLookRelatedStruct;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotCollection;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Content\Product\ProductEntity;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Storefront\Page\Product\ProductPageLoadedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

final class ProductDetailPageSubscriber implements EventSubscriberInterface
{
    /**
     * @param EntityRepository<CmsSlotCollection> $cmsSlotRepository
     *
     * @param EntityRepository<ProductCollection> $productRepository
     */
    public function __construct(
        private readonly EntityRepository $cmsSlotRepository,
        private readonly EntityRepository $productRepository
    ) {
    }

    /**
     * @return array<string, string>
     */
    public static function getSubscribedEvents(): array
    {
        return [
            ProductPageLoadedEvent::class => 'onProductPageLoaded',
        ];
    }

    public function onProductPageLoaded(ProductPageLoadedEvent $event): void
    {
        $product = $event->getPage()->getProduct();
        $context = $event->getSalesChannelContext();

        $relatedProducts = $this->getShopTheLookDataForProduct(
            $product->getId(),
            $product->getParentId(),
            $context->getContext()
        );

        if ($relatedProducts !== []) {
            $event->getPage()->addExtension(
                'shopTheLookData',
                new ShopTheLookRelatedStruct($relatedProducts)
            );
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getShopTheLookDataForProduct(
        string $productId,
        ?string $parentId,
        Context $context
    ): array {
        $cmsSlots = $this->fetchShopTheLookSlots($context);
        $associatedProductIds = $this->resolveAssociatedIds(
            $cmsSlots,
            $productId,
            $parentId
        );

        if ($associatedProductIds === []) {
            return [];
        }

        $parentProductIds = $this->resolveParentProductIds(
            $associatedProductIds,
            $parentId ?? $productId,
            $context
        );

        if ($parentProductIds === []) {
            return [];
        }

        return $this->getProductsWithVariants($parentProductIds, $context);
    }

    /**
     * @param array<int, CmsSlotEntity> $cmsSlots
     *
     * @return array<int, string>
     */
    private function resolveAssociatedIds(
        array $cmsSlots,
        string $productId,
        ?string $parentId
    ): array {
        $ids = $parentId !== null
            ? $this->findProductIdsByParent($cmsSlots, $parentId)
            : [];

        if ($ids === []) {
            $ids = $this->findProductIdsDirect(
                $cmsSlots,
                $productId,
                $parentId
            );
        }

        return array_values(array_unique($ids));
    }

    /**
     * @return array<int, CmsSlotEntity>
     */
    private function fetchShopTheLookSlots(Context $context): array
    {
        $criteria = new Criteria();
        $criteria->addFilter(
            new EqualsFilter('type', 'ict-shop-the-look')
        );
        $criteria->addAssociation('translations');

        return array_values(
            $this->cmsSlotRepository
                ->search($criteria, $context)
                ->getElements()
        );
    }

    /**
     * @param array<int, CmsSlotEntity> $slots
     *
     * @return array<int, string>
     */
    private function findProductIdsByParent(
        array $slots,
        string $parentId
    ): array {
        foreach ($slots as $slot) {
            $hotspots = $this->extractHotspotsFromSlot($slot);
            if ($hotspots === null) {
                continue;
            }

            if ($this->hotspotsContainProduct($hotspots, $parentId)) {
                return $this->collectOtherProductIds($hotspots, $parentId);
            }
        }

        return [];
    }

    /**
     * @param array<int, CmsSlotEntity> $slots
     *
     * @return array<int, string>
     */
    private function findProductIdsDirect(
        array $slots,
        string $productId,
        ?string $parentId
    ): array {
        foreach ($slots as $slot) {
            $hotspots = $this->extractHotspotsFromSlot($slot);
            if ($hotspots === null) {
                continue;
            }

            if ($this->hotspotsContainProduct($hotspots, $productId)) {
                return $this->collectOtherProductIds(
                    $hotspots,
                    $productId,
                    $parentId
                );
            }
        }

        return [];
    }

    /**
     * @param array<int, array<string, mixed>> $hotspots
     */
    private function hotspotsContainProduct(
        array $hotspots,
        string $productId
    ): bool {
        foreach ($hotspots as $hotspot) {
            /** @var array<string, mixed> $hotspot */
            if ($this->getValidProductId($hotspot) === $productId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<int, array<string, mixed>> $hotspots
     *
     * @return array<int, string>
     */
    private function collectOtherProductIds(
        array $hotspots,
        string $excludeId,
        ?string $excludeId2 = null
    ): array {
        $ids = [];
        foreach ($hotspots as $hotspot) {
            /** @var array<string, mixed> $hotspot */
            $productId = $this->getValidProductId($hotspot);
            if ($productId === null) {
                continue;
            }
            if ($this->isExcluded($productId, $excludeId, $excludeId2)) {
                continue;
            }
            $ids[] = $productId;
        }

        return $ids;
    }

    /**
     * @param array<string, mixed> $hotspot
     */
    private function getValidProductId(array $hotspot): ?string
    {
        if (!isset($hotspot['productId'])
            || !is_string($hotspot['productId'])
            || $hotspot['productId'] === ''
        ) {
            return null;
        }

        return $hotspot['productId'];
    }

    private function isExcluded(
        string $productId,
        string $excludeId,
        ?string $excludeId2
    ): bool {
        return $productId === $excludeId || $productId === $excludeId2;
    }

    /**
     * @param array<int, string> $associatedProductIds
     *
     * @return array<int, string>
     */
    private function resolveParentProductIds(
        array $associatedProductIds,
        string $currentParentId,
        Context $context
    ): array {
        $checkProducts = $this->productRepository->search(
            new Criteria($associatedProductIds),
            $context
        );

        $parentProductIds = [];
        foreach ($checkProducts->getElements() as $checkProduct) {
            $targetParentId = $checkProduct->getParentId()
                ?? $checkProduct->getId();
            if ($targetParentId !== $currentParentId) {
                $parentProductIds[] = $targetParentId;
            }
        }

        return array_values(array_unique($parentProductIds));
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    private function extractHotspotsFromSlot(CmsSlotEntity $slot): ?array
    {
        $config = $this->extractSlotConfig($slot);
        if ($config === null) {
            return null;
        }

        $hotspotsConfig = $config['hotspots'] ?? null;
        if (!is_array($hotspotsConfig)) {
            return null;
        }

        $value = $hotspotsConfig['value'] ?? null;
        if (!is_array($value)) {
            return null;
        }

        /** @var array<int, array<string, mixed>> */
        return array_values($value);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function extractSlotConfig(CmsSlotEntity $slot): ?array
    {
        $translated = $slot->getTranslated();

        $config = $translated['config'] ?? null;
        if (!is_array($config)) {
            return null;
        }

        /** @var array<string, mixed> */
        return $config;
    }

    /**
     * @param array<string> $productIds
     *
     * @return array<int, array<string, mixed>>
     */
    private function getProductsWithVariants(
        array $productIds,
        Context $context
    ): array {
        $criteria = new Criteria($productIds);
        $criteria->addAssociation('cover.media');
        $criteria->addAssociation('children.cover.media');
        $criteria->addAssociation('children.options.group');
        $criteria->addAssociation('children.prices');
        $criteria->addAssociation('prices');

        $result = [];
        foreach (
            $this->productRepository
                ->search($criteria, $context)
                ->getElements() as $product
        ) {
            if ($product->getParentId() !== null) {
                continue;
            }
            $result[] = $this->buildProductData($product);
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildProductData(ProductEntity $product): array
    {
        return [
            'id' => $product->getId(),
            'name' => $product->getName(),
            'productNumber' => $product->getProductNumber(),
            'price' => $product->getPrice(),
            'cover' => $product->getCover(),
            'stock' => $product->getStock(),
            'variants' => $this->buildVariants($product),
            'hasVariants' => $product->getChildCount() > 0,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildVariants(ProductEntity $product): array
    {
        $children = $product->getChildren();
        if ($product->getChildCount() === 0 || $children === null) {
            return [];
        }

        $variants = [];
        foreach ($children as $variant) {
            $variants[] = $this->buildSingleVariant($variant);
        }

        return $variants;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSingleVariant(ProductEntity $variant): array
    {
        return [
            'id' => $variant->getId(),
            'productNumber' => $variant->getProductNumber(),
            'name' => $variant->getName(),
            'price' => $variant->getPrice(),
            'cover' => $variant->getCover(),
            'options' => $this->buildVariantOptions($variant),
            'stock' => $variant->getStock(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildVariantOptions(ProductEntity $variant): array
    {
        $options = $variant->getOptions();
        if ($options === null) {
            return [];
        }

        $variantOptions = [];
        foreach ($options as $option) {
            $group = $option->getGroup();
            if ($group === null) {
                continue;
            }
            $variantOptions[] = [
                'group' => $group->getName(),
                'option' => $option->getName(),
                'groupId' => $group->getId(),
                'optionId' => $option->getId(),
            ];
        }

        return $variantOptions;
    }
}
