<?php declare(strict_types=1);

namespace ICTECHShopTheLook\Subscriber;

use ICTECHShopTheLook\Struct\ShopTheLookRelatedStruct;
use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotCollection;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Content\Product\ProductEntity;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Storefront\Page\Product\ProductPageLoadedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Listens to the product detail page load event and attaches
 * "Shop The Look" related products as a page extension.
 *
 * When a product detail page loads, this subscriber scans all
 * CMS slots of type 'ict-shop-the-look' to find any look that
 * contains the current product (or its parent variant), then
 * resolves the other products in that look and attaches them
 * to the page as 'shopTheLookData'.
 */
class ProductDetailPageSubscriber implements EventSubscriberInterface
{
    /**
     * @param EntityRepository<CmsSlotCollection> $cmsSlotRepository
     * @param EntityRepository<ProductCollection> $productRepository
     */
    public function __construct(
        private readonly EntityRepository $cmsSlotRepository,
        private readonly EntityRepository $productRepository
    ) {
    }

    /**
     * Registers the events this subscriber listens to.
     *
     * @return array<string, string>
     */
    public static function getSubscribedEvents(): array
    {
        return [
            ProductPageLoadedEvent::class => 'onProductPageLoaded',
        ];
    }

    /**
     * Triggered when a product detail page is loaded.
     * Fetches related "Shop The Look" products and attaches them to the page.
     */
    public function onProductPageLoaded(ProductPageLoadedEvent $event): void
    {
        $product = $event->getPage()->getProduct();
        $context = $event->getSalesChannelContext();

        $productId = $product->getId();
        $parentId  = $product->getParentId();

        /** @var array<int, array<string, mixed>> $relatedProducts */
        $relatedProducts = $this->getShopTheLookDataForProduct($productId, $parentId, $context->getContext());

        if (!empty($relatedProducts)) {
            $struct = new ShopTheLookRelatedStruct($relatedProducts);
            $event->getPage()->addExtension('shopTheLookData', $struct);
        }
    }

    /**
     * Finds all products associated with the current product via Shop The Look CMS slots.
     *
     * Logic uses a two-pass approach:
     * - Pass 1: Prefer matching by parent product ID (handles variant product pages).
     *   If the current product is a variant, we look for its parent ID in hotspot configs.
     * - Pass 2: If no parent match found, fall back to matching by the direct product ID.
     *
     * This ensures that visiting any variant of a product still shows the correct look.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getShopTheLookDataForProduct(string $productId, ?string $parentId, Context $context): array
    {
        // Load all CMS slots of type 'ict-shop-the-look' with their translations (config is stored in translations)
        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('type', 'ict-shop-the-look'));
        $criteria->addAssociation('translations');

        $cmsSlots = $this->cmsSlotRepository->search($criteria, $context);

        /** @var array<int, string> $associatedProductIds */
        $associatedProductIds = [];
        $foundByParentMatch   = false;

        // PASS 1: Check all slots for a hotspot matching the parent product ID.
        // This is preferred because variant product pages should still find the look
        // that was configured with the parent product.
        if ($parentId !== null) {
            foreach ($cmsSlots->getElements() as $slot) {
                $translated = $slot->getTranslated();
                $config = isset($translated['config']) && is_array($translated['config']) ? $translated['config'] : [];

                $hotspotsConfig = isset($config['hotspots']) && is_array($config['hotspots']) ? $config['hotspots'] : [];
                if (!isset($hotspotsConfig['value']) || !is_array($hotspotsConfig['value'])) {
                    continue;
                }

                $hotspots       = $hotspotsConfig['value'];
                $parentMatchFound = false;

                // Check if any hotspot in this slot references the parent product
                foreach ($hotspots as $hotspot) {
                    if (!is_array($hotspot) || !isset($hotspot['productId']) || !is_string($hotspot['productId']) || $hotspot['productId'] === '') {
                        continue;
                    }
                    if ($hotspot['productId'] === $parentId) {
                        $parentMatchFound = true;
                        break;
                    }
                }

                if ($parentMatchFound) {
                    $foundByParentMatch = true;
                    // Collect all other product IDs from this slot (excluding the matched parent)
                    foreach ($hotspots as $hotspot) {
                        if (!is_array($hotspot) || !isset($hotspot['productId']) || !is_string($hotspot['productId']) || $hotspot['productId'] === '') {
                            continue;
                        }
                        if ($hotspot['productId'] !== $parentId) {
                            $associatedProductIds[] = $hotspot['productId'];
                        }
                    }
                    break; // Stop after first matching slot
                }
            }
        }

        // PASS 2: Only runs if no parent match was found above.
        // Falls back to matching by the direct product ID (for simple/non-variant products).
        if (!$foundByParentMatch) {
            foreach ($cmsSlots->getElements() as $slot) {
                $translated = $slot->getTranslated();
                $config = isset($translated['config']) && is_array($translated['config']) ? $translated['config'] : [];

                $hotspotsConfig = isset($config['hotspots']) && is_array($config['hotspots']) ? $config['hotspots'] : [];
                if (!isset($hotspotsConfig['value']) || !is_array($hotspotsConfig['value'])) {
                    continue;
                }

                $hotspots         = $hotspotsConfig['value'];
                $directMatchFound = false;

                foreach ($hotspots as $hotspot) {
                    if (!is_array($hotspot) || !isset($hotspot['productId']) || !is_string($hotspot['productId']) || $hotspot['productId'] === '') {
                        continue;
                    }
                    if ($hotspot['productId'] === $productId) {
                        $directMatchFound = true;
                        break;
                    }
                }

                if ($directMatchFound) {
                    // Collect all other product IDs from this slot (excluding current product and its parent)
                    foreach ($hotspots as $hotspot) {
                        if (!is_array($hotspot) || !isset($hotspot['productId']) || !is_string($hotspot['productId']) || $hotspot['productId'] === '') {
                            continue;
                        }
                        if ($hotspot['productId'] !== $productId && $hotspot['productId'] !== $parentId) {
                            $associatedProductIds[] = $hotspot['productId'];
                        }
                    }
                    break;
                }
            }
        }

        // Deduplicate collected product IDs
        /** @var array<int, string> $associatedProductIds */
        $associatedProductIds = array_values(array_unique($associatedProductIds));

        if (empty($associatedProductIds)) {
            return [];
        }

        // Resolve the collected IDs to actual product entities to get their parent IDs
        $checkCriteria = new Criteria($associatedProductIds);
        $checkProducts = $this->productRepository->search($checkCriteria, $context);

        // Use the current product's parent (or itself if it has no parent) as the reference
        $currentParentId = $parentId ?? $productId;

        // Collect the root (parent) product IDs for each associated product,
        // excluding the current product's own parent to avoid showing the same product
        /** @var array<int, string> $parentProductIds */
        $parentProductIds = [];
        foreach ($checkProducts->getElements() as $checkProduct) {
            $targetParentId = $checkProduct->getParentId() ?? $checkProduct->getId();
            if ($targetParentId !== $currentParentId) {
                $parentProductIds[] = $targetParentId;
            }
        }

        $parentProductIds = array_values(array_unique($parentProductIds));

        if (empty($parentProductIds)) {
            return [];
        }

        return $this->getProductsWithVariants($parentProductIds, $context);
    }

    /**
     * Loads full product data including all variants and their options for the given parent product IDs.
     * Only returns root (non-variant) products; child products are nested under their parent.
     *
     * @param array<int, string> $productIds  Array of parent product IDs
     * @return array<int, array<string, mixed>>
     */
    private function getProductsWithVariants(array $productIds, Context $context): array
    {
        $criteria = new Criteria($productIds);
        $criteria->addAssociation('cover.media');
        $criteria->addAssociation('children.cover.media');
        $criteria->addAssociation('children.options.group');
        $criteria->addAssociation('children.prices');
        $criteria->addAssociation('prices');

        $products = $this->productRepository->search($criteria, $context);

        $result = [];
        foreach ($products->getElements() as $product) {
            // Skip variant products — we only want root products here
            if ($product->getParentId() !== null) {
                continue;
            }

            /** @var array<int, array<string, mixed>> $variants */
            $variants = [];
            $children = $product->getChildren();

            if ($product->getChildCount() > 0 && $children !== null) {
                foreach ($children as $variant) {
                    /** @var array<int, array<string, mixed>> $variantOptions */
                    $variantOptions = [];
                    $options        = $variant->getOptions();

                    if ($options !== null) {
                        foreach ($options as $option) {
                            $group = $option->getGroup();
                            if ($group === null) {
                                continue;
                            }
                            $variantOptions[] = [
                                'group'    => $group->getName(),
                                'option'   => $option->getName(),
                                'groupId'  => $group->getId(),
                                'optionId' => $option->getId(),
                            ];
                        }
                    }

                    $variants[] = [
                        'id'            => $variant->getId(),
                        'productNumber' => $variant->getProductNumber(),
                        'name'          => $variant->getName(),
                        'price'         => $variant->getPrice(),
                        'cover'         => $variant->getCover(),
                        'options'       => $variantOptions,
                        'stock'         => $variant->getStock(),
                    ];
                }
            }

            $result[] = [
                'id'            => $product->getId(),
                'name'          => $product->getName(),
                'productNumber' => $product->getProductNumber(),
                'price'         => $product->getPrice(),
                'cover'         => $product->getCover(),
                'stock'         => $product->getStock(),
                'variants'      => $variants,
                'hasVariants'   => !empty($variants),
            ];
        }

        return $result;
    }
}
