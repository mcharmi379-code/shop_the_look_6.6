<?php

declare(strict_types=1);

namespace ICTECHShopTheLook\Service;

use Shopware\Core\Content\Product\ProductEntity;
use Shopware\Core\Content\Property\Aggregate\PropertyGroupOption\PropertyGroupOptionEntity;

final class ProductVariantOptionsResolver
{
    /**
     * @return array<string, array<string, mixed>>
     */
    public function resolve(ProductEntity $product): array
    {
        $children = $product->getChildren();
        if ($children !== null && $children->count() > 0) {
            return $this->fromChildren($product);
        }

        return $this->fromProductDirectly($product);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function fromChildren(ProductEntity $product): array
    {
        $allOptions = [];
        foreach ($product->getChildren() ?? [] as $child) {
            foreach ($child->getOptions() ?? [] as $option) {
                $allOptions = $this->addOption($allOptions, $option);
            }
        }

        return $allOptions;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function fromProductDirectly(ProductEntity $product): array
    {
        $allOptions = $this->collectFromOptions($product);

        foreach ($product->getProperties() ?? [] as $property) {
            $allOptions = $this->addOption($allOptions, $property);
        }

        return $allOptions;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function collectFromOptions(ProductEntity $product): array
    {
        $allOptions = [];
        foreach ($product->getOptions() ?? [] as $option) {
            $allOptions = $this->addOption($allOptions, $option);
        }

        return $allOptions;
    }

    /**
     * @param array<string, array<string, mixed>> $allOptions
     *
     * @return array<string, array<string, mixed>>
     */
    private function addOption(
        array $allOptions,
        PropertyGroupOptionEntity $option
    ): array {
        $group = $option->getGroup();
        if ($group === null) {
            return $allOptions;
        }

        $allOptions[$group->getName()][$option->getId()] = $option;

        return $allOptions;
    }
}
