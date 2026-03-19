<?php declare(strict_types=1);

namespace ICTECHShopTheLook\Core\Content\Cms;

use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Cms\SalesChannel\Struct\TextStruct;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Content\Product\ProductDefinition;
use Shopware\Core\Content\Product\ProductEntity;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\EntitySearchResult;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsAnyFilter;
use Shopware\Core\System\Currency\CurrencyFormatter;
use Shopware\Core\System\SalesChannel\Entity\SalesChannelRepository;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

/**
 * CMS element resolver for the 'ict-shop-the-look' element type.
 *
 * Responsible for two phases of the CMS rendering pipeline:
 * - collect(): Declares which product data needs to be fetched before rendering.
 * - enrich():  Processes the fetched data and assigns it to the CMS slot for use in Twig.
 *
 * Each hotspot in the element config references a product ID. This resolver
 * loads those products (including their variants), resolves formatted prices,
 * and builds the variant mapping data needed by the storefront JS.
 */
class ShopTheLookCmsElementResolver extends AbstractCmsElementResolver
{
    /**
     * @param SalesChannelRepository<ProductCollection> $productRepository
     */
    public function __construct(
        private readonly SalesChannelRepository $productRepository,
        private readonly CurrencyFormatter $currencyFormatter
    ) {
    }

    /**
     * Returns the CMS element type identifier this resolver handles.
     */
    public function getType(): string
    {
        return 'ict-shop-the-look';
    }

    /**
     * Declares the product criteria needed to render this CMS element.
     *
     * Extracts all product IDs from the hotspot config and builds a criteria
     * collection so Shopware fetches them (with all required associations)
     * before enrich() is called.
     *
     * Returns null if no valid hotspots/product IDs are configured.
     */
    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $config        = $slot->getFieldConfig();
        $hotspotsValue = $config->get('hotspots')?->getValue() ?? [];

        if (!is_array($hotspotsValue) || empty($hotspotsValue)) {
            return null;
        }

        /** @var string[] $productIds */
        $productIds = [];
        foreach ($hotspotsValue as $hotspot) {
            if (is_array($hotspot) && isset($hotspot['productId']) && is_string($hotspot['productId']) && $hotspot['productId'] !== '') {
                $productIds[] = $hotspot['productId'];
            }
        }

        if (empty($productIds)) {
            return null;
        }

        $criteriaCollection = new CriteriaCollection();

        // Load products with all associations needed for variant switching,
        // price display, configurator settings, and SEO URLs
        $criteria = new Criteria();
        $criteria->addFilter(new EqualsAnyFilter('id', array_values($productIds)));
        $criteria->addAssociation('cover');
        $criteria->addAssociation('prices');
        $criteria->addAssociation('options');
        $criteria->addAssociation('options.group');
        $criteria->addAssociation('properties');
        $criteria->addAssociation('properties.group');
        $criteria->addAssociation('children.cover');
        $criteria->addAssociation('children.prices');
        $criteria->addAssociation('children.options');
        $criteria->addAssociation('children.options.group');
        $criteria->addAssociation('configuratorGroupConfig');
        $criteria->addAssociation('configuratorSettings');
        $criteria->addAssociation('configuratorSettings.option');
        $criteria->addAssociation('configuratorSettings.option.group');
        $criteria->addAssociation('configuratorSettings.media');
        $criteria->addAssociation('visibilities');
        $criteria->addAssociation('seoUrls');

        $criteriaCollection->add('product_' . $slot->getId(), ProductDefinition::class, $criteria);

        return $criteriaCollection;
    }

    /**
     * Enriches the CMS slot with resolved product and hotspot data.
     *
     * For each hotspot:
     * - Resolves the product entity from the pre-fetched result.
     * - If the product is a variant, fetches its parent to get all sibling variants.
     * - Builds variant mapping data (option IDs → variant ID + stock status)
     *   which is used by the storefront JS to resolve the correct variant on selection.
     * - Resolves a formatted price string for the current sales channel currency.
     *
     * All resolved data is assigned to a TextStruct and set on the slot,
     * making it available as `element.data` in the Twig template.
     */
    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        $slotData   = new TextStruct();
        $config = $slot->getFieldConfig();

        $hotspotsValue = $config->get('hotspots')?->getValue() ?? [];
        $lookImage     = $config->get('lookImage')?->getValue();

        $products = $result->get('product_' . $slot->getId());

        $processedHotspots = [];
        if ($products instanceof EntitySearchResult && is_array($hotspotsValue)) {
            $productCollection = $products->getEntities();

            foreach ($hotspotsValue as $hotspot) {
                if (!is_array($hotspot) || !isset($hotspot['productId']) || !is_string($hotspot['productId']) || $hotspot['productId'] === '') {
                    continue;
                }

                $product = $productCollection->get($hotspot['productId']);
                if (!$product instanceof ProductEntity) {
                    continue;
                }

                // Default to using the product itself for variant resolution
                $productForVariants = $product;

                // If the configured product is a variant, fetch its parent so we can
                // show all sibling variants (not just the ones on this specific variant)
                $parentId = $product->getParentId();
                if ($parentId !== null) {
                    $parentCriteria = new Criteria([$parentId]);
                    $parentCriteria->addAssociation('children');
                    $parentCriteria->addAssociation('children.options');
                    $parentCriteria->addAssociation('children.options.group');
                    $parentCriteria->addAssociation('children.cover');

                    $parentResult  = $this->productRepository->search($parentCriteria, $resolverContext->getSalesChannelContext());
                    $parentProduct = $parentResult->first();
                    if ($parentProduct instanceof ProductEntity) {
                        $productForVariants = $parentProduct;
                    }
                }

                // Build grouped variant options (e.g. ['Color' => [...], 'Size' => [...]])
                $allVariants = $this->loadAllVariantsForProduct($productForVariants);

                // Build variant mapping: each child variant mapped to its option IDs and stock status.
                // This is serialised to JSON in the Twig template and consumed by the storefront JS
                // to resolve which variant ID to add to cart when the user selects options.
                $variantMappingData = [];
                $children           = $productForVariants->getChildren();
                if ($children !== null && $children->count() > 0) {
                    foreach ($children as $child) {
                        /** @var ProductEntity $child */
                        $childOptions          = [];
                        $childOptionCollection = $child->getOptions();
                        if ($childOptionCollection !== null) {
                            foreach ($childOptionCollection as $option) {
                                $childOptions[] = $option->getId();
                            }
                        }

                        // Prefer availableStock (respects clearance stock setting); fall back to raw stock
                        $availableStock = $child->getAvailableStock() ?? $child->getStock();
                        $translated     = $child->getTranslated();
                        $name           = isset($translated['name']) && is_string($translated['name']) ? $translated['name'] : ($child->getName() ?? '');

                        $variantMappingData[] = [
                            'id'      => $child->getId(),
                            'name'    => $name,
                            'options' => $childOptions,
                            'inStock' => $child->getActive() && $availableStock > 0,
                        ];
                    }
                }

                $processedHotspots[] = [
                    'id'                => isset($hotspot['id']) && is_string($hotspot['id']) ? $hotspot['id'] : uniqid(),
                    'xPosition'         => $hotspot['xPosition'] ?? 50,
                    'yPosition'         => $hotspot['yPosition'] ?? 50,
                    'product'           => $product,
                    'allVariants'       => $allVariants,
                    'variantMappingData'=> $variantMappingData,
                    'parentProduct'     => $productForVariants,
                    'formattedPrice'    => $this->resolveFormattedPrice($product, $resolverContext->getSalesChannelContext()),
                ];
            }
        }

        $slotData->assign([
            'lookImage'         => $lookImage,
            'hotspots'          => $processedHotspots,
            'imageDimension'    => $config->get('imageDimension')?->getValue() ?? '300x300',
            'customWidth'       => $config->get('customWidth')?->getValue() ?? 300,
            'customHeight'      => $config->get('customHeight')?->getValue() ?? 300,
            'layoutStyle'       => $config->get('layoutStyle')?->getValue() ?? 'image-products',
            'showPrices'        => $config->get('showPrices')?->getValue() ?? true,
            'showVariantSwitch' => $config->get('showVariantSwitch')?->getValue() ?? true,
            'addAllToCart'      => $config->get('addAllToCart')?->getValue() ?? true,
            'addSingleProduct'  => $config->get('addSingleProduct')?->getValue() ?? true,
        ]);

        $slot->setData($slotData);
    }

    /**
     * Resolves a formatted price string for the given product in the current sales channel currency.
     *
     * Tries to get the price directly for the active currency first.
     * If not available, falls back to the default currency price and applies the exchange rate factor.
     * Returns an empty string if no price is available.
     */
    private function resolveFormattedPrice(ProductEntity $product, SalesChannelContext $salesChannelContext): string
    {
        $currency   = $salesChannelContext->getCurrency();
        $currencyId = $currency->getId();
        $factor     = $currency->getFactor();

        // Try to get price directly for the active currency
        $price = $product->getCurrencyPrice($currencyId);

        // Fall back to default currency price and apply the exchange rate factor
        if ($price === null) {
            $priceCollection = $product->getPrice();
            $price           = $priceCollection?->first();
        }

        if ($price === null) {
            return '';
        }

        // Apply factor only if the price is not already in the active currency
        $gross = $price->getGross() * ($price->getCurrencyId() === $currencyId ? 1.0 : $factor);

        return $this->currencyFormatter->formatCurrencyByLanguage(
            $gross,
            $currency->getIsoCode(),
            $salesChannelContext->getContext()->getLanguageId(),
            $salesChannelContext->getContext()
        );
    }

    /**
     * Builds a grouped map of all available variant options for a product.
     *
     * For products with children (variants): collects options from each child variant,
     * grouped by option group name (e.g. ['Size' => [...options], 'Color' => [...options]]).
     *
     * For simple products (no children): falls back to the product's own options,
     * then also includes properties (e.g. material, target group) as additional groups.
     *
     * Returns an empty array on any error to avoid breaking the CMS render.
     *
     * @return array<string, array<string, mixed>>
     */
    private function loadAllVariantsForProduct(ProductEntity $product): array
    {
        /** @var array<string, array<string, mixed>> $allOptions */
        $allOptions = [];

        try {
            $children = $product->getChildren();

            if ($children !== null && $children->count() > 0) {
                // Product has variants — collect options from each child
                foreach ($children as $child) {
                    /** @var ProductEntity $child */
                    $options = $child->getOptions();
                    if ($options === null) {
                        continue;
                    }
                    foreach ($options as $option) {
                        $group = $option->getGroup();
                        if ($group === null) {
                            continue;
                        }
                        $groupName = $group->getName();
                        if (!isset($allOptions[$groupName])) {
                            $allOptions[$groupName] = [];
                        }
                        // Keyed by option ID to avoid duplicates across variants
                        $allOptions[$groupName][$option->getId()] = $option;
                    }
                }
            } else {
                // Simple product — use its own options
                $options = $product->getOptions();
                if ($options !== null) {
                    foreach ($options as $option) {
                        $group = $option->getGroup();
                        if ($group === null) {
                            continue;
                        }
                        $groupName = $group->getName();
                        if (!isset($allOptions[$groupName])) {
                            $allOptions[$groupName] = [];
                        }
                        $allOptions[$groupName][$option->getId()] = $option;
                    }
                }

                // Also include product properties (e.g. material, target group) as selectable groups
                $properties = $product->getProperties();
                if ($properties !== null) {
                    foreach ($properties as $property) {
                        $group = $property->getGroup();
                        if ($group === null) {
                            continue;
                        }
                        $groupName = $group->getName();
                        if (!isset($allOptions[$groupName])) {
                            $allOptions[$groupName] = [];
                        }
                        $allOptions[$groupName][$property->getId()] = $property;
                    }
                }
            }

            return $allOptions;
        } catch (\Exception $exception) {
            // Return empty array to prevent CMS render failure on unexpected data issues
            return [];
        }
    }
}
