<?php

declare(strict_types=1);

namespace ICTECHShopTheLook;

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
    }
}
