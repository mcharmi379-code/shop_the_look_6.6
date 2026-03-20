<?php

declare(strict_types=1);

namespace ICTECHShopTheLook\Core\Content\Cms\SalesChannel;

use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Media\MediaDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\EntitySearchResult;

/**
 * CMS element resolver for the 'ict-shop-look-slider' element type.
 *
 * Handles the two-phase CMS data resolution pipeline:
 * - collect(): Declares which media entities need to be fetched for the slider items.
 * - enrich():  Attaches the resolved media objects back to each slider item and sets slot data.
 */
final class ShopLookSliderCmsElementResolver extends AbstractCmsElementResolver
{
    /**
     * Returns the CMS element type identifier this resolver handles.
     */
    public function getType(): string
    {
        return 'ict-shop-look-slider';
    }

    /**
     * Declares the media criteria needed to render the slider.
     *
     * Extracts all mediaIds from the sliderItems config and registers them
     * for batch loading. Returns null if the config is mapped (dynamic) or
     * contains no media IDs.
     */
    public function collect(
        CmsSlotEntity $slot,
        ResolverContext $resolverContext
    ): ?CriteriaCollection {
        // $resolverContext is required by interface but not used in this implementation
        unset($resolverContext);
        $config = $slot->getFieldConfig();
        $sliderItemsConfig = $config->get('sliderItems');

        if (!$sliderItemsConfig || $sliderItemsConfig->isMapped()) {
            return null;
        }

        $sliderItems = $sliderItemsConfig->getArrayValue();

        /** @var list<string> $mediaIds */
        $mediaIds = array_values(array_filter(array_column($sliderItems, 'mediaId'), 'is_string'));

        if ($mediaIds === []) {
            return null;
        }

        $criteria = new Criteria($mediaIds);

        $criteriaCollection = new CriteriaCollection();
        $criteriaCollection->add('media_' . $slot->getUniqueIdentifier(), MediaDefinition::class, $criteria);

        return $criteriaCollection;
    }

    /**
     * Enriches each slider item with its resolved media entity.
     *
     * Iterates over the slider items from config and attaches the corresponding
     * media object (fetched in collect()) to each item under the 'media' key.
     * The enriched items are then set as the slot's data for use in Twig.
     */
    public function enrich(
        CmsSlotEntity $slot,
        ResolverContext $resolverContext,
        ElementDataCollection $result
    ): void {
        // $resolverContext is required by interface but not used in this implementation
        unset($resolverContext);
        $config = $slot->getFieldConfig();
        $sliderItemsConfig = $config->get('sliderItems');

        if (!$sliderItemsConfig) {
            return;
        }

        $sliderItemsValue = $sliderItemsConfig->getArrayValue();
        $rawResult = $result->get('media_' . $slot->getUniqueIdentifier());
        /** @var \Shopware\Core\Framework\DataAbstractionLayer\Search\EntitySearchResult<\Shopware\Core\Content\Media\MediaCollection>|null $mediaResult */
        $mediaResult = $rawResult;

        foreach ($sliderItemsValue as $index => $sliderItem) {
            if (is_array($sliderItem)) {
                $sliderItemsValue[$index] = $this->enrichSliderItem($sliderItem, $mediaResult);
            }
        }

        $slot->setData(new \Shopware\Core\Framework\Struct\ArrayStruct(['sliderItems' => $sliderItemsValue]));
    }

    /**
     * @param array<mixed> $sliderItem
     * @param EntitySearchResult<\Shopware\Core\Content\Media\MediaCollection>|null $mediaResult
     *
     * @return array<mixed>
     */
    private function enrichSliderItem(
        array $sliderItem,
        ?EntitySearchResult $mediaResult
    ): array {
        $mediaId = $this->extractMediaId($sliderItem);
        if ($mediaId !== null && $mediaResult !== null) {
            $mediaEntity = $mediaResult->get($mediaId);
            if ($mediaEntity) {
                $sliderItem['media'] = $mediaEntity;
            }
        }

        return $sliderItem;
    }

    /**
     * @param array<mixed> $sliderItem
     */
    private function extractMediaId(array $sliderItem): ?string
    {
        $mediaId = $sliderItem['mediaId'] ?? null;

        return is_string($mediaId) ? $mediaId : null;
    }
}
