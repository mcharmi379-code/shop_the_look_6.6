<?php

declare(strict_types=1);

namespace ICTECHShopTheLook\Core\Content\Cms;

use ICTECHShopTheLook\Service\ProductVariantOptionsResolver;
use ICTECHShopTheLook\Service\ShopTheLookElementConfig;
use ICTECHShopTheLook\Service\VariantMappingBuilder;
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

final class ShopTheLookCmsElementResolver extends AbstractCmsElementResolver
{
    /**
     * @param SalesChannelRepository<ProductCollection> $productRepository
     */
    public function __construct(
        private readonly SalesChannelRepository $productRepository,
        private readonly CurrencyFormatter $currencyFormatter,
        private readonly ProductVariantOptionsResolver $variantOptionsResolver,
        private readonly VariantMappingBuilder $variantMappingBuilder
    ) {
    }

    public function getType(): string
    {
        return 'ict-shop-the-look';
    }

    public function collect(
        CmsSlotEntity $slot,
        ResolverContext $resolverContext
    ): ?CriteriaCollection {
        // $resolverContext is required by interface but not used in this implementation
        unset($resolverContext);
        $productIds = $this->extractProductIdsFromSlot($slot);

        if ($productIds === []) {
            return null;
        }

        $criteriaCollection = new CriteriaCollection();
        $criteriaCollection->add('product_' . $slot->getId(), ProductDefinition::class, $this->buildProductCriteria($productIds));

        return $criteriaCollection;
    }

    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        $config = $slot->getFieldConfig();
        $hotspotsValue = $config->get('hotspots')?->getValue() ?? [];
        $products = $result->get('product_' . $slot->getId());

        $processedHotspots = [];
        if ($products instanceof EntitySearchResult && is_array($hotspotsValue)) {
            /** @var \Shopware\Core\Framework\DataAbstractionLayer\Search\EntitySearchResult<\Shopware\Core\Content\Product\ProductCollection> $products */
            $processedHotspots = $this->processHotspots($hotspotsValue, $products, $resolverContext);
        }

        $slot->setData($this->buildSlotData(new ShopTheLookElementConfig($config), $processedHotspots));
    }

    /**
     * @param array<int, array<string, mixed>> $processedHotspots
     */
    private function buildSlotData(ShopTheLookElementConfig $elementConfig, array $processedHotspots): TextStruct
    {
        $slotData = new TextStruct();
        $slotData->assign([
            'lookImage' => $elementConfig->getLookImage(),
            'hotspots' => $processedHotspots,
            'imageDimension' => $elementConfig->getImageDimension(),
            'customWidth' => $elementConfig->getCustomWidth(),
            'customHeight' => $elementConfig->getCustomHeight(),
            'layoutStyle' => $elementConfig->getLayoutStyle(),
            'showPrices' => $elementConfig->isShowPrices(),
            'showVariantSwitch' => $elementConfig->isShowVariantSwitch(),
            'addAllToCart' => $elementConfig->isAddAllToCart(),
            'addSingleProduct' => $elementConfig->isAddSingleProduct(),
        ]);

        return $slotData;
    }

    /**
     * @return array<int, string>
     */
    private function extractProductIdsFromSlot(CmsSlotEntity $slot): array
    {
        $hotspotsValue = $slot->getFieldConfig()->get('hotspots')?->getValue() ?? [];

        if (! is_array($hotspotsValue) || $hotspotsValue === []) {
            return [];
        }

        return $this->collectProductIdsFromHotspots($hotspotsValue);
    }

    /**
     * @param array<mixed> $hotspotsValue
     *
     * @return array<int, string>
     */
    private function collectProductIdsFromHotspots(array $hotspotsValue): array
    {
        $productIds = [];
        foreach ($hotspotsValue as $hotspot) {
            if (! is_array($hotspot)) {
                continue;
            }
            /** @var array<string, mixed> $hotspot */
            $productId = $this->extractHotspotProductId($hotspot);
            if ($productId !== null) {
                $productIds[] = $productId;
            }
        }

        return $productIds;
    }

    /**
     * @param array<int, string> $productIds
     */
    private function buildProductCriteria(array $productIds): Criteria
    {
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

        return $criteria;
    }

    /**
     * @param array<mixed> $hotspotsValue
     * @param EntitySearchResult<\Shopware\Core\Content\Product\ProductCollection> $products
     *
     * @return array<int, array<string, mixed>>
     */
    private function processHotspots(
        array $hotspotsValue,
        EntitySearchResult $products,
        ResolverContext $resolverContext
    ): array {
        /** @var ProductCollection $productCollection */
        $productCollection = $products->getEntities();
        $processedHotspots = [];

        foreach ($hotspotsValue as $hotspot) {
            if (! is_array($hotspot)) {
                continue;
            }
            /** @var array<string, mixed> $hotspot */
            $processed = $this->processSingleHotspot($hotspot, $productCollection, $resolverContext);
            if ($processed !== null) {
                $processedHotspots[] = $processed;
            }
        }

        return $processedHotspots;
    }

    /**
     * @param array<string, mixed> $hotspot
     *
     * @return array<string, mixed>|null
     */
    private function processSingleHotspot(
        array $hotspot,
        ProductCollection $productCollection,
        ResolverContext $resolverContext
    ): ?array {
        $productId = $this->extractHotspotProductId($hotspot);
        if ($productId === null) {
            return null;
        }

        $product = $productCollection->get($productId);
        if (!$product instanceof ProductEntity) {
            return null;
        }

        $productForVariants = $this->resolveProductForVariants($product, $resolverContext->getSalesChannelContext());

        return $this->buildHotspotData($hotspot, $product, $productForVariants, $resolverContext->getSalesChannelContext());
    }

    /**
     * @param array<string, mixed> $hotspot
     */
    private function extractHotspotProductId(array $hotspot): ?string
    {
        if (!isset($hotspot['productId'])
            || !is_string($hotspot['productId'])
            || $hotspot['productId'] === ''
        ) {
            return null;
        }

        return $hotspot['productId'];
    }

    private function resolveProductForVariants(ProductEntity $product, SalesChannelContext $salesChannelContext): ProductEntity
    {
        $parentId = $product->getParentId();
        if ($parentId === null) {
            return $product;
        }

        $parentCriteria = new Criteria([$parentId]);
        $parentCriteria->addAssociation('children');
        $parentCriteria->addAssociation('children.options');
        $parentCriteria->addAssociation('children.options.group');
        $parentCriteria->addAssociation('children.cover');

        $parentProduct = $this->productRepository->search($parentCriteria, $salesChannelContext)->first();

        return $parentProduct instanceof ProductEntity ? $parentProduct : $product;
    }

    /**
     * @param array<string, mixed> $hotspot
     *
     * @return array<string, mixed>
     */
    private function buildHotspotData(array $hotspot, ProductEntity $product, ProductEntity $productForVariants, SalesChannelContext $salesChannelContext): array
    {
        return [
            'id' => isset($hotspot['id']) && is_string($hotspot['id']) ? $hotspot['id'] : uniqid(),
            'xPosition' => $hotspot['xPosition'] ?? 50,
            'yPosition' => $hotspot['yPosition'] ?? 50,
            'product' => $product,
            'allVariants' => $this->variantOptionsResolver->resolve($productForVariants),
            'variantMappingData' => $this->variantMappingBuilder->build($productForVariants),
            'parentProduct' => $productForVariants,
            'formattedPrice' => $this->resolveFormattedPrice($product, $salesChannelContext),
        ];
    }

    private function resolveFormattedPrice(ProductEntity $product, SalesChannelContext $salesChannelContext): string
    {
        $currency = $salesChannelContext->getCurrency();
        $currencyId = $currency->getId();
        $price = $product->getCurrencyPrice($currencyId) ?? $product->getPrice()?->first();

        if ($price === null) {
            return '';
        }

        $gross = $price->getGross() * ($price->getCurrencyId() === $currencyId ? 1.0 : $currency->getFactor());

        return $this->currencyFormatter->formatCurrencyByLanguage(
            $gross,
            $currency->getIsoCode(),
            $salesChannelContext->getContext()->getLanguageId(),
            $salesChannelContext->getContext()
        );
    }
}
