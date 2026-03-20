<?php

declare(strict_types=1);

namespace ICTECHShopTheLook\Struct;

use Shopware\Core\Framework\Struct\Struct;

/**
 * Data transfer struct for Shop The Look related products.
 *
 * Attached to the product detail page as a page extension under the key
 * 'shopTheLookData'. Contains the list of related look products (with
 * their variants) to be rendered in the associated products table on the
 * product detail page.
 *
 * @see \ICTECHShopTheLook\Subscriber\ProductDetailPageSubscriber
 */
final class ShopTheLookRelatedStruct extends Struct
{
    /** @var array<int, array<string, mixed>> */
    protected array $relatedLooks;

    /**
     * @param array<int, array<string, mixed>> $relatedLooks
     *        Array of related product data arrays
     */
    public function __construct(array $relatedLooks = [])
    {
        $this->relatedLooks = $relatedLooks;
    }

    /**
     * Returns all related look products.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getRelatedLooks(): array
    {
        return $this->relatedLooks;
    }

    public function getApiAlias(): string
    {
        return 'shop_the_look_related';
    }
}
