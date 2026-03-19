<?php declare(strict_types=1);

namespace ICTECHShopTheLook;

use Shopware\Core\Framework\Plugin;
use Shopware\Core\Framework\Plugin\Context\ActivateContext;
use Shopware\Core\Framework\Plugin\Context\DeactivateContext;
use Shopware\Core\Framework\Plugin\Context\InstallContext;
use Shopware\Core\Framework\Plugin\Context\UninstallContext;
use Shopware\Core\Framework\Plugin\Context\UpdateContext;

/**
 * Main plugin class for ICTECHShopTheLook.
 *
 * Registers the plugin with Shopware and handles lifecycle events:
 * install, uninstall, activate, deactivate, update.
 */
class ICTECHShopTheLook extends Plugin
{
    /**
     * Called once when the plugin is installed.
     * Runs migrations and registers plugin assets via parent.
     */
    public function install(InstallContext $installContext): void
    {
        parent::install($installContext);
    }

    /**
     * Called when the plugin is uninstalled.
     * If the user chose to keep data, we skip cleanup.
     * Otherwise, any plugin-specific data removal would go here.
     */
    public function uninstall(UninstallContext $uninstallContext): void
    {
        parent::uninstall($uninstallContext);

        if ($uninstallContext->keepUserData()) {
            return;
        }
    }

    /**
     * Called when the plugin is activated.
     * Parent handles theme recompilation and plugin state update.
     */
    public function activate(ActivateContext $activateContext): void
    {
        parent::activate($activateContext);
    }

    /**
     * Called when the plugin is deactivated.
     * Parent handles plugin state update in Shopware.
     */
    public function deactivate(DeactivateContext $deactivateContext): void
    {
        parent::deactivate($deactivateContext);
    }

    /**
     * Called when the plugin is updated to a newer version.
     * Parent runs any pending migrations.
     */
    public function update(UpdateContext $updateContext): void
    {
        parent::update($updateContext);
    }

    /**
     * Called after install is complete.
     * Useful for tasks that require the plugin to be fully installed first.
     */
    public function postInstall(InstallContext $installContext): void
    {
        parent::postInstall($installContext);
    }

    /**
     * Called after update is complete.
     * Useful for post-migration tasks or cache warming.
     */
    public function postUpdate(UpdateContext $updateContext): void
    {
        parent::postUpdate($updateContext);
    }
}
