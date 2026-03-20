document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-add-all-to-cart]');
    if (!btn) return;
    rebuildAddAllForm(btn);
});

function rebuildAddAllForm(btn) {
    const container = btn.closest('.cms-element-ict-shop-the-look');
    if (!container) return;
    const addAllForm = container.querySelector('.add-all-form');
    if (!addAllForm) return;

    addAllForm.querySelectorAll('.product-line-item, .variant-option').forEach(input => input.remove());

    container.querySelectorAll('.product-select-checkbox:checked').forEach((checkbox) => {
        const productId = checkbox.dataset.productId;
        const productItem = checkbox.closest('.product-item');

        const selectedOptions = [];
        productItem.querySelectorAll('.variant-radio:checked').forEach(radio => {
            if (radio.dataset.productId === productId) {
                selectedOptions.push(radio.value);
            }
        });

        const variantDataScript = container.querySelector(`.variant-data[data-product-id="${productId}"]`);
        let variantIdToUse = productId;

        if (variantDataScript) {
            const variantData = JSON.parse(variantDataScript.textContent);
            let matchingVariant = null;

            if (selectedOptions.length > 0) {
                matchingVariant = variantData.variants.find(variant =>
                    selectedOptions.every(opt => variant.options.includes(opt)) &&
                    variant.options.length === selectedOptions.length
                );
            }

            if (!matchingVariant) {
                matchingVariant = variantData.variants.find(candidate => candidate.inStock !== false) || variantData.variants[0] || null;
            }

            if (matchingVariant) {
                variantIdToUse = matchingVariant.id;
            }
        }

        const existingQty = addAllForm.querySelector(`input[name="lineItems[${variantIdToUse}][quantity]"]`);
        if (existingQty) {
            existingQty.value = String(parseInt(existingQty.value, 10) + 1);
            return;
        }

        [
            [`lineItems[${variantIdToUse}][id]`, variantIdToUse],
            [`lineItems[${variantIdToUse}][type]`, 'product'],
            [`lineItems[${variantIdToUse}][referencedId]`, variantIdToUse],
            [`lineItems[${variantIdToUse}][quantity]`, '1'],
            [`lineItems[${variantIdToUse}][stackable]`, '1'],
            [`lineItems[${variantIdToUse}][removable]`, '1'],
        ].forEach(([name, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            input.classList.add('product-line-item');
            input.setAttribute('data-product-id', productId);
            addAllForm.appendChild(input);
        });

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

document.addEventListener('change', function(e) {
    const select = e.target.closest('.variant-selector[data-product-id]');
    if (!select) return;
    const productId = select.dataset.productId;
    const variantId = select.value;
    const form = document.querySelector(`.add-to-cart-form[data-product-id="${productId}"]`);
    if (form) {
        form.querySelectorAll('input[name*="lineItems["]').forEach(input => input.remove());
        if (variantId) {
            [['id', variantId], ['type', 'product'], ['referencedId', variantId], ['quantity', '1'], ['stackable', '1'], ['removable', '1']].forEach(([key, val]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = `lineItems[${variantId}][${key}]`;
                input.value = val;
                form.appendChild(input);
            });
        }
    }
    const priceDisplay = document.getElementById('price-' + productId);
    if (variantId && priceDisplay) {
        const selectedOption = select.querySelector(`option[value="${variantId}"]`);
        if (selectedOption) priceDisplay.textContent = selectedOption.dataset.formattedPrice ?? '';
    }
});

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.cms-element-ict-shop-the-look').forEach(function(container) {
        initContainer(container);
    });

    function initContainer(container) {
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

                updateAddAllButton();
            });
        });

        container.querySelectorAll('.shop-the-look-hotspot').forEach(hotspot => {
            hotspot.addEventListener('click', function(e) {
                e.stopPropagation();
                const productId = this.dataset.productId;
                const productItem = container.querySelector(`.product-item[data-product-id="${productId}"]`);

                container.querySelectorAll('.shop-the-look-hotspot').forEach(h => h.classList.remove('active'));
                this.classList.toggle('active');
                container.querySelectorAll('.product-item').forEach(item => item.classList.remove('highlighted'));

                if (productItem && this.classList.contains('active')) {
                    productItem.classList.add('highlighted');
                    productItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        });

        document.addEventListener('click', function() {
            container.querySelectorAll('.shop-the-look-hotspot').forEach(h => h.classList.remove('active'));
            container.querySelectorAll('.product-item').forEach(item => item.classList.remove('highlighted'));
        });

        container.querySelectorAll('.variant-radio').forEach(radio => {
            radio.addEventListener('change', function() {
                const productId = this.dataset.productId;
                if (!productId) return;

                const individualForm = this.closest('.product-item').querySelector('.add-to-cart-form');
                const addAllForm = container.querySelector('.add-all-form');
                const variantDataScript = container.querySelector(`.variant-data[data-product-id="${productId}"]`);

                if (variantDataScript) {
                    const variantData = JSON.parse(variantDataScript.textContent);
                    const productItem = this.closest('.product-item');
                    const selectedOptions = [];

                    productItem.querySelectorAll('.variant-radio:checked').forEach(selectedRadio => {
                        if (selectedRadio.dataset.productId === productId) {
                            selectedOptions.push(selectedRadio.value);
                        }
                    });

                    let matchingVariant = findMatchingVariant(variantData.variants, selectedOptions);

                    if (matchingVariant) {
                        if (individualForm) {
                            updateFormForVariant(individualForm, matchingVariant.id, selectedOptions, matchingVariant.inStock);
                        }
                        if (addAllForm) {
                            updateAddAllFormForProduct(addAllForm, productId, matchingVariant.inStock !== false ? matchingVariant.id : null, selectedOptions);
                            updateAddAllButton();
                        }
                    } else {
                        const bestMatch = findBestMatchingVariant(variantData.variants, selectedOptions);
                        const fallback = bestMatch || (variantData.variants.length > 0 ? variantData.variants[0] : null);
                        if (fallback) {
                            if (individualForm) {
                                updateFormForVariant(individualForm, fallback.id, selectedOptions, fallback.inStock);
                            }
                            if (addAllForm) {
                                updateAddAllFormForProduct(addAllForm, productId, fallback.inStock !== false ? fallback.id : null, selectedOptions);
                                updateAddAllButton();
                            }
                        }
                    }
                } else {
                    const selectedOptions = [];
                    const productItem = this.closest('.product-item');
                    productItem.querySelectorAll('.variant-radio:checked').forEach(selectedRadio => {
                        if (selectedRadio.dataset.productId === productId) {
                            selectedOptions.push(selectedRadio.value);
                        }
                    });

                    if (individualForm) updateFormForVariant(individualForm, productId, selectedOptions);
                    if (addAllForm) {
                        updateAddAllFormForProduct(addAllForm, productId, productId, selectedOptions);
                        updateAddAllButton();
                    }
                }
            });
        });

        function findMatchingVariant(variants, selectedOptions) {
            return variants.find(variant =>
                selectedOptions.every(optionId => variant.options.includes(optionId)) &&
                variant.options.length === selectedOptions.length
            );
        }

        function findBestMatchingVariant(variants, selectedOptions) {
            let bestMatch = null;
            let maxMatches = 0;

            variants.forEach(variant => {
                const matches = selectedOptions.filter(optionId => variant.options.includes(optionId)).length;
                if (matches > maxMatches) {
                    maxMatches = matches;
                    bestMatch = variant;
                }
            });

            return bestMatch;
        }

        function updateFormForVariant(form, variantId, selectedOptions, variantInStock) {
            form.querySelectorAll('input[name*="lineItems["]').forEach(input => input.remove());

            const addBtn = form.querySelector('.add-single-to-cart');
            const outOfStockMsg = form.closest('.individual-add-to-cart').querySelector('.variant-out-of-stock-message');

            if (variantInStock === false) {
                if (addBtn) { addBtn.disabled = true; addBtn.style.opacity = '0.5'; }
                if (!outOfStockMsg) {
                    const msg = document.createElement('div');
                    msg.className = 'variant-out-of-stock-message out-of-stock-message';
                    msg.style.marginTop = '6px';
                    const addAllBtn = form.closest('.cms-element-ict-shop-the-look')?.querySelector('.add-all-to-cart');
                    msg.textContent = addAllBtn?.dataset.labelOutOfStock || 'Selected size is out of stock';
                    form.closest('.individual-add-to-cart').appendChild(msg);
                }
                return;
            }

            if (addBtn) { addBtn.disabled = false; addBtn.style.opacity = ''; }
            if (outOfStockMsg) outOfStockMsg.remove();

            [
                [`lineItems[${variantId}][id]`, variantId],
                [`lineItems[${variantId}][type]`, 'product'],
                [`lineItems[${variantId}][referencedId]`, variantId],
                [`lineItems[${variantId}][quantity]`, '1'],
                [`lineItems[${variantId}][stackable]`, '1'],
                [`lineItems[${variantId}][removable]`, '1'],
            ].forEach(([name, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value;
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

        function updateAddAllFormForProduct(addAllForm, originalProductId, variantId, selectedOptions) {
            addAllForm.querySelectorAll(`input[data-product-id="${originalProductId}"]`).forEach(input => input.remove());
            addAllForm.querySelectorAll(`input[name*="[${originalProductId}]"]`).forEach(input => input.remove());
            if (variantId) {
                addAllForm.querySelectorAll(`input[name*="[${variantId}]"]`).forEach(input => input.remove());
            }

            if (!variantId) return;

            [
                [`lineItems[${variantId}][id]`, variantId],
                [`lineItems[${variantId}][type]`, 'product'],
                [`lineItems[${variantId}][referencedId]`, variantId],
                [`lineItems[${variantId}][quantity]`, '1'],
                [`lineItems[${variantId}][stackable]`, '1'],
                [`lineItems[${variantId}][removable]`, '1'],
            ].forEach(([name, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value;
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

        function updateAddAllButton() {
            const checkedProducts = container.querySelectorAll('.product-select-checkbox:checked');
            const addAllButton = container.querySelector('.add-all-to-cart');
            const addAllForm = container.querySelector('.add-all-form');

            if (!addAllButton || !addAllForm) return;

            const labelSelect = addAllButton.dataset.labelSelect || 'Select Products';
            const labelAdd = addAllButton.dataset.labelAdd || 'Add %count% to Cart';

            if (checkedProducts.length === 0) {
                addAllButton.disabled = true;
                addAllButton.textContent = labelSelect;
                return;
            }

            addAllButton.disabled = false;
            addAllButton.textContent = labelAdd.replace('%count%', checkedProducts.length);

            addAllForm.querySelectorAll('.product-line-item, .variant-option').forEach(input => input.remove());

            checkedProducts.forEach((checkbox) => {
                const productId = checkbox.dataset.productId;
                const productItem = checkbox.closest('.product-item');

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
                        matchingVariant = findMatchingVariant(variantData.variants, selectedOptions)
                            || findBestMatchingVariant(variantData.variants, selectedOptions);
                    }

                    if (!matchingVariant) {
                        matchingVariant = variantData.variants.find(candidate => candidate.inStock !== false) || variantData.variants[0] || null;
                    }

                    addProductToAddAllForm(addAllForm, productId, matchingVariant ? matchingVariant.id : productId, selectedOptions);
                } else {
                    addProductToAddAllForm(addAllForm, productId, productId, selectedOptions);
                }
            });
        }

        function addProductToAddAllForm(addAllForm, originalProductId, variantId, selectedOptions) {
            const existingQty = addAllForm.querySelector(`input[name="lineItems[${variantId}][quantity]"]`);
            if (existingQty) {
                existingQty.value = String(parseInt(existingQty.value, 10) + 1);
                return;
            }

            [
                [`lineItems[${variantId}][id]`, variantId],
                [`lineItems[${variantId}][type]`, 'product'],
                [`lineItems[${variantId}][referencedId]`, variantId],
                [`lineItems[${variantId}][quantity]`, '1'],
                [`lineItems[${variantId}][stackable]`, '1'],
                [`lineItems[${variantId}][removable]`, '1'],
            ].forEach(([name, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value;
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

        container.querySelectorAll('.product-item').forEach(productItem => {
            const productId = productItem.dataset.productId;
            if (productId) initializeProductVariants(productItem, productId);
        });

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
                    matchingVariant = findMatchingVariant(variantData.variants, selectedOptions)
                        || findBestMatchingVariant(variantData.variants, selectedOptions);
                }

                if (!matchingVariant) {
                    matchingVariant = variantData.variants.find(candidate => candidate.inStock !== false) || variantData.variants[0] || null;
                }

                if (matchingVariant) {
                    if (individualForm) updateFormForVariant(individualForm, matchingVariant.id, selectedOptions, matchingVariant.inStock);
                    if (addAllForm) updateAddAllFormForProduct(addAllForm, productId, matchingVariant.inStock !== false ? matchingVariant.id : null, selectedOptions);
                }
            } else if (selectedOptions.length > 0) {
                if (individualForm) updateFormForVariant(individualForm, productId, selectedOptions);
                if (addAllForm) updateAddAllFormForProduct(addAllForm, productId, productId, selectedOptions);
            } else {
                if (addAllForm) updateAddAllFormForProduct(addAllForm, productId, productId, []);
            }
        }

        updateAddAllButton();
    }
});
