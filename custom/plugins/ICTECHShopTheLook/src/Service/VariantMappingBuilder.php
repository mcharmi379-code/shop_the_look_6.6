<?php

declare(strict_types=1);

namespace ICTECHShopTheLook\Service;

use Shopware\Core\Content\Product\ProductEntity;

final class VariantMappingBuilder
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function build(ProductEntity $product): array
    {
        $children = $product->getChildren();
        if ($children === null || $children->count() === 0) {
            return [];
        }

        $variantMappingData = [];
        foreach ($children as $child) {
            $variantMappingData[] = $this->buildSingleVariantMapping($child);
        }

        return $variantMappingData;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSingleVariantMapping(ProductEntity $child): array
    {
        $availableStock = $child->getAvailableStock() ?? $child->getStock();

        return [
            'id' => $child->getId(),
            'name' => $this->resolveName($child),
            'options' => $this->collectOptionIds($child),
            'inStock' => $child->getActive() && $availableStock > 0,
        ];
    }

    private function resolveName(ProductEntity $child): string
    {
        $translated = $child->getTranslated();

        return isset($translated['name']) && is_string($translated['name'])
            ? $translated['name']
            : ($child->getName() ?? '');
    }

    /**
     * @return array<int, string>
     */
    private function collectOptionIds(ProductEntity $child): array
    {
        $optionCollection = $child->getOptions();
        if ($optionCollection === null) {
            return [];
        }

        $ids = [];
        foreach ($optionCollection as $option) {
            $ids[] = $option->getId();
        }

        return $ids;
    }
}
