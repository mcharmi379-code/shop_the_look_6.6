<?php

declare(strict_types=1);

namespace ICTECHShopTheLook;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsAnyFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\PrefixFilter;
use Shopware\Core\Framework\Plugin;
use Shopware\Core\Framework\Plugin\Context\UninstallContext;

/**
 * Main plugin class for ICTECHShopTheLook.
 *
 * Registers the plugin with Shopware and handles lifecycle events:
 * install, uninstall, activate, deactivate, update.
 */
final class ICTECHShopTheLook extends Plugin
{
    public function uninstall(UninstallContext $uninstallContext): void
    {
        parent::uninstall($uninstallContext);

        if ($uninstallContext->keepUserData()) {
            return;
        }

        $context = $uninstallContext->getContext();

        $this->deleteCmsEntitiesByType(
            'cms_slot.repository',
            'type',
            ['ict-shop-the-look', 'ict-shop-look-slider'],
            $context
        );

        $this->deleteCmsEntitiesByType(
            'cms_block.repository',
            'type',
            ['ict-shop-the-look-block', 'ict-shop-look-slider-block'],
            $context
        );

        $this->deleteCmsEntitiesByType(
            'system_config.repository',
            'configurationKey',
            ['ICTECHShopTheLook.config'],
            $context,
            true
        );
    }

    /**
     * @param list<string> $types
     */
    private function deleteCmsEntitiesByType(
        string $repositoryId,
        string $field,
        array $types,
        Context $context,
        bool $usePrefixMatch = false
    ): void {
        $container = $this->container;
        if ($container === null) {
            return;
        }

        $repository = $container->get($repositoryId);
        if (!$repository instanceof EntityRepository) {
            return;
        }

        $criteria = new Criteria();
        if ($usePrefixMatch) {
            foreach ($types as $type) {
                $criteria->addFilter(new PrefixFilter($field, $type));
            }
        } else {
            $criteria->addFilter(new EqualsAnyFilter($field, $types));
        }

        $ids = $repository->searchIds($criteria, $context)->getIds();
        if ($ids === []) {
            return;
        }

        $payload = array_map(
            static fn (string $id): array => ['id' => $id],
            $ids
        );

        $repository->delete($payload, $context);
    }
}
