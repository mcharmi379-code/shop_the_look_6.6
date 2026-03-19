/**
 * rebuildAddAllForm
 *
 * Rebuilds the hidden form inputs for the "Add All to Cart" button
 * based on the currently checked products and their selected variants.
 *
 * Called from the Twig template's form submit handler so the form
 * always reflects the latest checkbox and variant state at submit time.
 * Duplicate variants (same variantId) have their quantity incremented
 * rather than adding a second line item.
 *
 * @param {HTMLElement} btn - The "Add All" submit button element
 */
window.rebuildAddAllForm = function rebuildAddAllForm(btn) {
            const container = btn.closest('.cms-element-ict-shop-the-look');
            if (!container) return;
            const addAllForm = container.querySelector('.add-all-form');
            if (!addAllForm) return;
            
            addAllForm.querySelectorAll('.product-line-item, .variant-option').forEach(input => {
                input.remove();
            });
            
            const checkedProducts = container.querySelectorAll('.product-select-checkbox:checked');
            
            checkedProducts.forEach((checkbox) => {
                const productId = checkbox.dataset.productId;
                const productItem = checkbox.closest('.product-item');

                // Get selected options
                const selectedOptions = [];
                productItem.querySelectorAll('.variant-radio:checked').forEach(radio => {
                    if (radio.dataset.productId === productId) {
                        selectedOptions.push(radio.value);
                    }
                });

                // Check for variant data
                const variantDataScript = container.querySelector(`.variant-data[data-product-id="${productId}"]`);
                let variantIdToUse = productId;
                
                if (variantDataScript) {
                    const variantData = JSON.parse(variantDataScript.textContent);
                    let matchingVariant = null;

                    if (selectedOptions.length > 0) {
                        matchingVariant = variantData.variants.find(variant => {
                            const hasAll = selectedOptions.every(opt => variant.options.includes(opt));
                            const sameLength = variant.options.length === selectedOptions.length;
                            return hasAll && sameLength;
                        });
                    }

                    // Variants hidden or no match — use first in-stock variant as default
                    if (!matchingVariant) {
                        matchingVariant = variantData.variants.find(candidate => candidate.inStock !== false) || variantData.variants[0] || null;
                    }

                    if (matchingVariant) {
                        variantIdToUse = matchingVariant.id;
                    }
                }
                
                // Add form inputs — increment quantity if same variant already added
                const existingQty = addAllForm.querySelector(`input[name="lineItems[${variantIdToUse}][quantity]"]`);
                if (existingQty) {
                    existingQty.value = String(parseInt(existingQty.value, 10) + 1);
                    return;
                }

                const inputs = [
                    { name: `lineItems[${variantIdToUse}][id]`, value: variantIdToUse },
                    { name: `lineItems[${variantIdToUse}][type]`, value: 'product' },
                    { name: `lineItems[${variantIdToUse}][referencedId]`, value: variantIdToUse },
                    { name: `lineItems[${variantIdToUse}][quantity]`, value: '1' },
                    { name: `lineItems[${variantIdToUse}][stackable]`, value: '1' },
                    { name: `lineItems[${variantIdToUse}][removable]`, value: '1' }
                ];
                
                inputs.forEach(inputData => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = inputData.name;
                    input.value = inputData.value;
                    input.classList.add('product-line-item');
                    input.setAttribute('data-product-id', productId);
                    addAllForm.appendChild(input);
                });
                
                // Add options
                selectedOptions.forEach(optionId => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = `lineItems[${variantIdToUse}][payload][options][${optionId}]`;
                    input.value = optionId;
                    input.classList.add('variant-option', 'product-line-item');
                    input.setAttribute('data-product-id', productId);
                    addAllForm.appendChild(input);
                });
            });
            
        }
        
        document.addEventListener('DOMContentLoaded', function() {

            // Initialise each shop-the-look element independently so multiple
            // elements on the same page don't interfere with each other
            const containers = document.querySelectorAll('.cms-element-ict-shop-the-look');
            containers.forEach(function(container) { initContainer(container); });

            function initContainer(container) {
            
            // Toggle product item visibility and refresh the add-all form
            // whenever a product checkbox is checked or unchecked
            container.querySelectorAll('.product-select-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    const productItem = this.closest('.product-item');
                    const form = productItem.querySelector('.add-to-cart-form');
                    
                    if (this.checked) {
                        productItem.classList.remove('disabled');
                        if (form) form.style.display = 'block';
                    } else {
                        productItem.classList.add('disabled');
                        if (form) form.style.display = 'none';
                    }
                    
                    // Update the add-all form with current selections
                    updateAddAllButton();
                });
            });
            
            // Hotspot click: show the popup tooltip and highlight the
            // corresponding product card in the product list
            container.querySelectorAll('.shop-the-look-hotspot').forEach(hotspot => {
                hotspot.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const productId = this.dataset.productId;
                    const productItem = container.querySelector(`.product-item[data-product-id="${productId}"]`);
                    
                    // Close all other popups
                    container.querySelectorAll('.shop-the-look-hotspot').forEach(otherHotspot => {
                        otherHotspot.classList.remove('active');
                    });
                    
                    // Toggle this popup
                    this.classList.toggle('active');
                    
                    // Remove previous highlights
                    container.querySelectorAll('.product-item').forEach(productListItem => {
                        productListItem.classList.remove('highlighted');
                    });
                    
                    // Highlight clicked product
                    if (productItem && this.classList.contains('active')) {
                        productItem.classList.add('highlighted');
                        productItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                });
            });
            
            // Close popups when clicking outside
            document.addEventListener('click', function() {
                container.querySelectorAll('.shop-the-look-hotspot').forEach(hotspot => {
                    hotspot.classList.remove('active');
                });
                container.querySelectorAll('.product-item').forEach(productListItem => {
                    productListItem.classList.remove('highlighted');
                });
            });
            
            // Handle variant radio selection: resolve the correct variant ID
            // and update both the individual add-to-cart form and the add-all form
            container.querySelectorAll('.variant-radio').forEach(radio => {
                radio.addEventListener('change', function() {
                    const productId = this.dataset.productId;
                    const individualForm = this.closest('.product-item').querySelector('.add-to-cart-form');
                    const addAllForm = container.querySelector('.add-all-form');
                    
                    if (!productId) {
                        return;
                    }
                    
                    
                    // Get variant data for this product
                    const variantDataScript = container.querySelector(`.variant-data[data-product-id="${productId}"]`);
                    
                    if (variantDataScript) {
                        // This product has variants - find the correct one
                        const variantData = JSON.parse(variantDataScript.textContent);
                        const productItem = this.closest('.product-item');
                        const selectedOptions = [];
                        
                        // Collect all selected options for this product
                        productItem.querySelectorAll('.variant-radio:checked').forEach(selectedRadio => {
                            if (selectedRadio.dataset.productId === productId) {
                                selectedOptions.push(selectedRadio.value);
                            }
                        });
                        
                        
                        // Find the variant that matches all selected options
                        let matchingVariant = findMatchingVariant(variantData.variants, selectedOptions);
                        
                        if (matchingVariant) {
                            // Update individual form
                            if (individualForm) {
                                updateFormForVariant(individualForm, matchingVariant.id, selectedOptions, matchingVariant.inStock);
                            }
                            // Update add all form — skip if out of stock
                            if (addAllForm && matchingVariant.inStock !== false) {
                                updateAddAllFormForProduct(addAllForm, productId, matchingVariant.id, selectedOptions);
                                updateAddAllButton();
                            } else if (addAllForm) {
                                updateAddAllFormForProduct(addAllForm, productId, null, []);
                                updateAddAllButton();
                            }
                        } else {
                            let bestMatch = findBestMatchingVariant(variantData.variants, selectedOptions);
                            if (bestMatch) {
                                if (individualForm) {
                                    updateFormForVariant(individualForm, bestMatch.id, selectedOptions, bestMatch.inStock);
                                }
                                if (addAllForm) {
                                    updateAddAllFormForProduct(addAllForm, productId, bestMatch.inStock !== false ? bestMatch.id : null, selectedOptions);
                                    updateAddAllButton();
                                }
                            } else if (variantData.variants.length > 0) {
                                const firstVariant = variantData.variants[0];
                                if (individualForm) {
                                    updateFormForVariant(individualForm, firstVariant.id, selectedOptions, firstVariant.inStock);
                                }
                                if (addAllForm) {
                                    updateAddAllFormForProduct(addAllForm, productId, firstVariant.inStock !== false ? firstVariant.id : null, selectedOptions);
                                    updateAddAllButton();
                                }
                            }
                        }
                    } else {
                        // This product doesn't have variants - just update options
                        const selectedOptions = [];
                        const productItem = this.closest('.product-item');
                        productItem.querySelectorAll('.variant-radio:checked').forEach(selectedRadio => {
                            if (selectedRadio.dataset.productId === productId) {
                                selectedOptions.push(selectedRadio.value);
                            }
                        });
                        
                        // Update individual form
                        if (individualForm) {
                            updateFormForVariant(individualForm, productId, selectedOptions);
                        }
                        // Update add all form
                        if (addAllForm) {
                            updateAddAllFormForProduct(addAllForm, productId, productId, selectedOptions);
                            updateAddAllButton();
                        }
                    }
                });
            });
            
            /**
             * Finds the variant whose option set exactly matches selectedOptions
             * (same options, same count — no partial or superset matches).
             *
             * @param {Array} variants
             * @param {string[]} selectedOptions  Array of option IDs
             * @returns {object|undefined}
             */
            function findMatchingVariant(variants, selectedOptions) {
                const match = variants.find(variant => {
                    // Check if this variant has all the selected options
                    const hasAllOptions = selectedOptions.every(optionId => {
                        const hasOption = variant.options.includes(optionId);
                        return hasOption;
                    });
                    // And check if the variant doesn't have extra options
                    const noExtraOptions = variant.options.length === selectedOptions.length;
                    
                    const isMatch = hasAllOptions && noExtraOptions;
                    return isMatch;
                });
                return match;
            }
            
            /**
             * Finds the variant with the most options in common with selectedOptions.
             * Used as a fallback when no exact match exists (e.g. only one dimension selected).
             *
             * @param {Array} variants
             * @param {string[]} selectedOptions
             * @returns {object|null}
             */
            function findBestMatchingVariant(variants, selectedOptions) {
                let bestMatch = null;
                let maxMatches = 0;
                
                variants.forEach(variant => {
                    const matches = selectedOptions.filter(optionId => {
                        const hasOption = variant.options.includes(optionId);
                        return hasOption;
                    }).length;
                    
                    if (matches > maxMatches) {
                        maxMatches = matches;
                        bestMatch = variant;
                    }
                });
                
                return bestMatch;
            }
            
            /**
             * Replaces all lineItem hidden inputs in an individual add-to-cart form
             * with inputs for the given variantId and selectedOptions.
             *
             * If variantInStock === false, the add button is disabled and an
             * out-of-stock message is shown instead of adding form inputs.
             *
             * @param {HTMLFormElement} form
             * @param {string} variantId
             * @param {string[]} selectedOptions
             * @param {boolean|undefined} variantInStock
             */
            function updateFormForVariant(form, variantId, selectedOptions, variantInStock) {
                // Remove all existing lineItems inputs
                form.querySelectorAll('input[name*="lineItems["]').forEach(input => input.remove());

                const addBtn = form.querySelector('.add-single-to-cart');
                const outOfStockMsg = form.closest('.individual-add-to-cart').querySelector('.variant-out-of-stock-message');

                if (variantInStock === false) {
                    if (addBtn) { addBtn.disabled = true; addBtn.style.opacity = '0.5'; }
                    if (!outOfStockMsg) {
                        const msg = document.createElement('div');
                        msg.className = 'variant-out-of-stock-message out-of-stock-message';
                        msg.style.marginTop = '6px';
                        const container = form.closest('.cms-element-ict-shop-the-look');
                        const addAllBtn = container ? container.querySelector('.add-all-to-cart') : null;
                        msg.textContent = (addAllBtn && addAllBtn.dataset.labelOutOfStock)
                            ? addAllBtn.dataset.labelOutOfStock
                            : 'Selected size is out of stock';
                        form.closest('.individual-add-to-cart').appendChild(msg);
                    }
                    return;
                }

                // In stock — clear any message and re-enable button
                if (addBtn) { addBtn.disabled = false; addBtn.style.opacity = ''; }
                if (outOfStockMsg) outOfStockMsg.remove();

                const inputs = [
                    { name: `lineItems[${variantId}][id]`, value: variantId },
                    { name: `lineItems[${variantId}][type]`, value: 'product' },
                    { name: `lineItems[${variantId}][referencedId]`, value: variantId },
                    { name: `lineItems[${variantId}][quantity]`, value: '1' },
                    { name: `lineItems[${variantId}][stackable]`, value: '1' },
                    { name: `lineItems[${variantId}][removable]`, value: '1' }
                ];
                inputs.forEach(inputData => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = inputData.name;
                    input.value = inputData.value;
                    form.appendChild(input);
                });
                selectedOptions.forEach(optionId => {
                    const optionInput = document.createElement('input');
                    optionInput.type = 'hidden';
                    optionInput.name = `lineItems[${variantId}][payload][options][${optionId}]`;
                    optionInput.value = optionId;
                    optionInput.classList.add('variant-option');
                    form.appendChild(optionInput);
                });
            }
            
            /**
             * Replaces all hidden inputs for a specific product in the add-all form.
             *
             * Removes by both originalProductId and variantId to handle cases where
             * the variant ID changed after a selection update.
             * Passing null as variantId removes the product without re-adding it
             * (used when the selected variant is out of stock).
             *
             * @param {HTMLFormElement} addAllForm
             * @param {string} originalProductId
             * @param {string|null} variantId
             * @param {string[]} selectedOptions
             */
            function updateAddAllFormForProduct(addAllForm, originalProductId, variantId, selectedOptions) {
                // Remove all existing inputs for this product
                addAllForm.querySelectorAll(`input[data-product-id="${originalProductId}"]`).forEach(input => input.remove());
                addAllForm.querySelectorAll(`input[name*="[${originalProductId}]"]`).forEach(input => input.remove());
                if (variantId) {
                    addAllForm.querySelectorAll(`input[name*="[${variantId}]"]`).forEach(input => input.remove());
                }

                // null variantId means out-of-stock — just remove, don't re-add
                if (!variantId) return;

                const inputs = [
                    { name: `lineItems[${variantId}][id]`, value: variantId },
                    { name: `lineItems[${variantId}][type]`, value: 'product' },
                    { name: `lineItems[${variantId}][referencedId]`, value: variantId },
                    { name: `lineItems[${variantId}][quantity]`, value: '1' },
                    { name: `lineItems[${variantId}][stackable]`, value: '1' },
                    { name: `lineItems[${variantId}][removable]`, value: '1' }
                ];
                inputs.forEach(inputData => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = inputData.name;
                    input.value = inputData.value;
                    input.classList.add('product-line-item');
                    input.setAttribute('data-product-id', originalProductId);
                    addAllForm.appendChild(input);
                });
                selectedOptions.forEach(optionId => {
                    const optionInput = document.createElement('input');
                    optionInput.type = 'hidden';
                    optionInput.name = `lineItems[${variantId}][payload][options][${optionId}]`;
                    optionInput.value = optionId;
                    optionInput.classList.add('variant-option', 'product-line-item');
                    optionInput.setAttribute('data-product-id', originalProductId);
                    addAllForm.appendChild(optionInput);
                });
            }
            
            /**
             * Refreshes the add-all button label and rebuilds the add-all form inputs
             * to reflect the current set of checked products and their selected variants.
             *
             * Button label uses a count placeholder: 'Add %count% to Cart'.
             * Button is disabled when no products are checked.
             */
            function updateAddAllButton() {
                const checkedProducts = container.querySelectorAll('.product-select-checkbox:checked');
                const addAllButton = container.querySelector('.add-all-to-cart');
                const addAllForm = container.querySelector('.add-all-form');
                
                
                if (addAllButton && addAllForm) {
                    const labelSelect = addAllButton.dataset.labelSelect || 'Select Products';
                    const labelAdd = addAllButton.dataset.labelAdd || 'Add %count% to Cart';
                    if (checkedProducts.length === 0) {
                        addAllButton.disabled = true;
                        addAllButton.textContent = labelSelect;
                    } else {
                        addAllButton.disabled = false;
                        addAllButton.textContent = labelAdd.replace('%count%', checkedProducts.length);
                        
                        // Remove all existing product inputs from add-all form
                        addAllForm.querySelectorAll('.product-line-item, .variant-option').forEach(input => {
                            input.remove();
                        });
                        
                        // Add inputs only for checked products with their current variants
                        checkedProducts.forEach((checkbox) => {
                            const productId = checkbox.dataset.productId;
                            const productItem = checkbox.closest('.product-item');
                        
                            
                            // Get currently selected options for this product
                            const selectedOptions = [];
                            productItem.querySelectorAll('.variant-radio:checked').forEach(radio => {
                                if (radio.dataset.productId === productId) {
                                    selectedOptions.push(radio.value);
                                }
                            });
                            
                            
                            // Check if this product has variant data
                            const variantDataScript = container.querySelector(`.variant-data[data-product-id="${productId}"]`);
                            
                            if (variantDataScript) {
                                // This product has variants - find the correct one
                                const variantData = JSON.parse(variantDataScript.textContent);
                                let matchingVariant = null;

                                if (selectedOptions.length > 0) {
                                    matchingVariant = findMatchingVariant(variantData.variants, selectedOptions);
                                    if (!matchingVariant) matchingVariant = findBestMatchingVariant(variantData.variants, selectedOptions);
                                }

                                // Variants hidden or no match — use first in-stock variant as default
                                if (!matchingVariant) {
                                    matchingVariant = variantData.variants.find(candidate => candidate.inStock !== false) || variantData.variants[0] || null;
                                }

                                if (matchingVariant) {
                                    addProductToAddAllForm(addAllForm, productId, matchingVariant.id, selectedOptions);
                                } else {
                                    addProductToAddAllForm(addAllForm, productId, productId, selectedOptions);
                                }
                            } else {
                                // Product without variants or with simple options
                                addProductToAddAllForm(addAllForm, productId, productId, selectedOptions);
                            }
                        });
                        

                    }
                }
            }
            
            /**
             * Appends hidden form inputs for one product to the add-all form.
             *
             * If the same variantId is already present (e.g. two checked products
             * resolved to the same variant), its quantity is incremented instead
             * of creating a duplicate line item.
             *
             * @param {HTMLFormElement} addAllForm
             * @param {string} originalProductId
             * @param {string} variantId
             * @param {string[]} selectedOptions
             */
            function addProductToAddAllForm(addAllForm, originalProductId, variantId, selectedOptions) {
                // If this variantId already exists in the form, just increment its quantity
                const existingQty = addAllForm.querySelector(`input[name="lineItems[${variantId}][quantity]"]`);
                if (existingQty) {
                    existingQty.value = String(parseInt(existingQty.value, 10) + 1);
                    return;
                }

                const inputs = [
                    { name: `lineItems[${variantId}][id]`, value: variantId },
                    { name: `lineItems[${variantId}][type]`, value: 'product' },
                    { name: `lineItems[${variantId}][referencedId]`, value: variantId },
                    { name: `lineItems[${variantId}][quantity]`, value: '1' },
                    { name: `lineItems[${variantId}][stackable]`, value: '1' },
                    { name: `lineItems[${variantId}][removable]`, value: '1' }
                ];

                inputs.forEach(inputData => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = inputData.name;
                    input.value = inputData.value;
                    input.classList.add('product-line-item');
                    input.setAttribute('data-product-id', originalProductId);
                    addAllForm.appendChild(input);
                });

                selectedOptions.forEach(optionId => {
                    const optionInput = document.createElement('input');
                    optionInput.type = 'hidden';
                    optionInput.name = `lineItems[${variantId}][payload][options][${optionId}]`;
                    optionInput.value = optionId;
                    optionInput.classList.add('variant-option', 'product-line-item');
                    optionInput.setAttribute('data-product-id', originalProductId);
                    addAllForm.appendChild(optionInput);
                });
            }
            
            // On page load, initialise each product item's form with the correct
            // variant based on the pre-selected (or default) radio button state
            container.querySelectorAll('.product-item').forEach(productItem => {
                const productId = productItem.dataset.productId;
                
                if (productId) {
                    // Initialize with currently selected variants
                    initializeProductVariants(productItem, productId);
                }
            });
            
            /**
             * Reads the currently checked variant radios for a product item and
             * pre-populates both the individual form and the add-all form with
             * the correct variant inputs.
             *
             * Falls back to the first in-stock variant when no radio is pre-selected
             * (e.g. when variant radios are hidden by the showVariantSwitch config).
             *
             * @param {HTMLElement} productItem
             * @param {string} productId
             */
            function initializeProductVariants(productItem, productId) {
                const individualForm = productItem.querySelector('.add-to-cart-form');
                const addAllForm = container.querySelector('.add-all-form');
                
                const selectedOptions = [];
                productItem.querySelectorAll('.variant-radio:checked').forEach(radio => {
                    if (radio.dataset.productId === productId) {
                        selectedOptions.push(radio.value);
                    }
                });
                
                const variantDataScript = container.querySelector(`.variant-data[data-product-id="${productId}"]`);
                
                if (variantDataScript) {
                    const variantData = JSON.parse(variantDataScript.textContent);
                    let matchingVariant = null;

                    if (selectedOptions.length > 0) {
                        matchingVariant = findMatchingVariant(variantData.variants, selectedOptions);
                        if (!matchingVariant) matchingVariant = findBestMatchingVariant(variantData.variants, selectedOptions);
                    }

                    // Variants hidden or no match — use first in-stock variant as default
                    if (!matchingVariant) {
                        matchingVariant = variantData.variants.find(candidate => candidate.inStock !== false) || variantData.variants[0] || null;
                    }

                    if (matchingVariant) {
                        if (individualForm) {
                            updateFormForVariant(individualForm, matchingVariant.id, selectedOptions, matchingVariant.inStock);
                        }
                        if (addAllForm) {
                            updateAddAllFormForProduct(addAllForm, productId, matchingVariant.inStock !== false ? matchingVariant.id : null, selectedOptions);
                        }
                    }
                } else if (selectedOptions.length > 0) {
                    if (individualForm) {
                        updateFormForVariant(individualForm, productId, selectedOptions);
                    }
                    if (addAllForm) {
                        updateAddAllFormForProduct(addAllForm, productId, productId, selectedOptions);
                    }
                } else {
                    if (addAllForm) {
                        updateAddAllFormForProduct(addAllForm, productId, productId, []);
                    }
                }
            }
            
            // Initialize
            updateAddAllButton();

            } // end initContainer
        });