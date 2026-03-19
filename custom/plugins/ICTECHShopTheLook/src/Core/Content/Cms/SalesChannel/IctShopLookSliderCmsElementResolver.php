<?php declare(strict_types=1);

namespace ICTECHShopTheLook\Core\Content\Cms\SalesChannel;

use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Media\MediaDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

/**
 * CMS element resolver for the 'ict-shop-look-slider' element type.
 *
 * Handles the two-phase CMS data resolution pipeline:
 * - collect(): Declares which media entities need to be fetched for the slider items.
 * - enrich():  Attaches the resolved media objects back to each slider item and sets slot data.
 */
class IctShopLookSliderCmsElementResolver extends AbstractCmsElementResolver
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
    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $config            = $slot->getFieldConfig();
        $sliderItemsConfig = $config->get('sliderItems');

        // Skip if config is missing or dynamically mapped (not static)
        if (!$sliderItemsConfig || $sliderItemsConfig->isMapped()) {
            return null;
        }

        $sliderItems = $sliderItemsConfig->getArrayValue();

        // Extract all non-empty mediaId strings from the slider items array
        /** @var list<string> $mediaIds */
        $mediaIds = array_values(array_filter(array_column($sliderItems, 'mediaId'), 'is_string'));

        if (empty($mediaIds)) {
            return null;
        }

        $criteria = new Criteria($mediaIds);

        $criteriaCollection = new CriteriaCollection();
        // Key includes the slot's unique identifier to avoid collisions when
        // multiple slider elements exist on the same CMS page
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
    public function enrich(CmsSlotEntity $slot, ResolverContext $resolverContext, ElementDataCollection $result): void
    {
        $config            = $slot->getFieldConfig();
        $sliderItemsConfig = $config->get('sliderItems');

        if (!$sliderItemsConfig) {
            return;
        }

        $sliderItemsValue = $sliderItemsConfig->getArrayValue();
        $mediaResult      = $result->get('media_' . $slot->getUniqueIdentifier());

        // Attach the resolved media entity to each slider item by its mediaId
        foreach ($sliderItemsValue as &$sliderItem) {
            if (!is_array($sliderItem)) {
                continue;
            }
            $mediaId = isset($sliderItem['mediaId']) && is_string($sliderItem['mediaId']) ? $sliderItem['mediaId'] : null;
            if ($mediaId !== null && $mediaResult) {
                $mediaEntity = $mediaResult->get($mediaId);
                if ($mediaEntity) {
                    $sliderItem['media'] = $mediaEntity;
                }
            }
        }

        // Wrap in ArrayStruct so Twig can access it as element.data.sliderItems
        $slot->setData(new \Shopware\Core\Framework\Struct\ArrayStruct(['sliderItems' => $sliderItemsValue]));
    }
}
