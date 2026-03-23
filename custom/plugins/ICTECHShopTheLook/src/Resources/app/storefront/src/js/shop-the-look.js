document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.cms-element-ict-shop-the-look').forEach(function (container) {
        initContainer(container);
    });
});

function initContainer(container) {

    // ── Hotspot click → highlight product ────────────────────────────────
    container.querySelectorAll('.shop-the-look-hotspot').forEach(function (hotspot) {
        hotspot.addEventListener('click', function (e) {
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

    document.addEventListener('click', function () {
        container.querySelectorAll('.shop-the-look-hotspot').forEach(h => h.classList.remove('active'));
        container.querySelectorAll('.product-item').forEach(item => item.classList.remove('highlighted'));
    });

    // ── Checkbox toggle ───────────────────────────────────────────────────
    container.querySelectorAll('.product-select-checkbox').forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
            const productItem = this.closest('.product-item');
            const form = productItem ? productItem.querySelector('.add-to-cart-form') : null;

            if (this.checked) {
                if (productItem) productItem.classList.remove('disabled');
                if (form) form.style.display = 'block';
            } else {
                if (productItem) productItem.classList.add('disabled');
                if (form) form.style.display = 'none';
            }

            updateAddAllButton(container);
        });
    });

    // ── Variant radio change ──────────────────────────────────────────────
    container.querySelectorAll('.variant-radio').forEach(function (radio) {
        radio.addEventListener('change', function () {
            const productId = this.dataset.productId;
            if (!productId) return;

            const productItem = this.closest('.product-item');
            const individualForm = productItem ? productItem.querySelector('.add-to-cart-form') : null;
            const selectedOptions = getCheckedOptions(productItem, productId);
            const variantData = getVariantData(container, productId);

            if (variantData) {
                const match = findMatchingVariant(variantData.variants, selectedOptions)
                    || findBestMatchingVariant(variantData.variants, selectedOptions)
                    || variantData.variants.find(v => v.inStock !== false)
                    || variantData.variants[0]
                    || null;

                if (match && individualForm) {
                    updateFormForVariant(individualForm, match.id, selectedOptions, match.inStock, container);
                }
            } else if (individualForm) {
                updateFormForVariant(individualForm, productId, selectedOptions, true, container);
            }

            updateAddAllButton(container);
        });
    });

    // ── Add-all form: rebuild before submit ───────────────────────────────
    const addAllForm = container.querySelector('.add-all-form');
    if (addAllForm) {
        addAllForm.addEventListener('submit', function () {
            rebuildAddAllFormInputs(container, addAllForm);
        });
    }

    // ── Initialize each product's variant form state ──────────────────────
    container.querySelectorAll('.product-item').forEach(function (productItem) {
        const productId = productItem.dataset.productId;
        if (productId) initProductVariants(container, productItem, productId);
    });

    updateAddAllButton(container);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getCheckedOptions(productItem, productId) {
    const options = [];
    if (!productItem) return options;
    productItem.querySelectorAll('.variant-radio:checked').forEach(function (r) {
        if (r.dataset.productId === productId) options.push(r.value);
    });
    return options;
}

function getVariantData(container, productId) {
    const script = container.querySelector(`.variant-data[data-product-id="${productId}"]`);
    if (!script) return null;
    try { return JSON.parse(script.textContent); } catch (e) { return null; }
}

function findMatchingVariant(variants, selectedOptions) {
    return variants.find(v =>
        selectedOptions.every(id => v.options.includes(id)) &&
        v.options.length === selectedOptions.length
    ) || null;
}

function findBestMatchingVariant(variants, selectedOptions) {
    let best = null, max = 0;
    variants.forEach(function (v) {
        const count = selectedOptions.filter(id => v.options.includes(id)).length;
        if (count > max) { max = count; best = v; }
    });
    return best;
}

function updateFormForVariant(form, variantId, selectedOptions, inStock, container) {
    // Remove old dynamic inputs
    form.querySelectorAll('input[name*="lineItems["]').forEach(i => i.remove());

    const addBtn = form.querySelector('.add-single-to-cart');
    const wrapper = form.closest('.individual-add-to-cart');
    const outOfStockMsg = wrapper ? wrapper.querySelector('.variant-out-of-stock-message') : null;

    if (inStock === false) {
        if (addBtn) { addBtn.disabled = true; addBtn.style.opacity = '0.5'; }
        if (!outOfStockMsg && wrapper) {
            const msg = document.createElement('div');
            msg.className = 'variant-out-of-stock-message out-of-stock-message';
            msg.style.marginTop = '6px';
            const addAllBtn = container ? container.querySelector('.add-all-to-cart') : null;
            msg.textContent = (addAllBtn && addAllBtn.dataset.labelOutOfStock) || 'Selected size is out of stock';
            wrapper.appendChild(msg);
        }
        return;
    }

    if (addBtn) { addBtn.disabled = false; addBtn.style.opacity = ''; }
    if (outOfStockMsg) outOfStockMsg.remove();

    appendLineItemInputs(form, variantId, selectedOptions, null, null);
}

function appendLineItemInputs(form, variantId, selectedOptions, extraClass, dataProductId) {
    var fields = [
        [`lineItems[${variantId}][id]`, variantId],
        [`lineItems[${variantId}][type]`, 'product'],
        [`lineItems[${variantId}][referencedId]`, variantId],
        [`lineItems[${variantId}][quantity]`, '1'],
        [`lineItems[${variantId}][stackable]`, '1'],
        [`lineItems[${variantId}][removable]`, '1'],
    ];

    if (selectedOptions && selectedOptions.length > 0) {
        var payload = { options: {} };
        selectedOptions.forEach(function (optionId) { payload.options[optionId] = optionId; });
        fields.push([`lineItems[${variantId}][payload]`, JSON.stringify(payload)]);
    }

    fields.forEach(function ([name, value]) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        if (extraClass) input.classList.add(extraClass);
        if (dataProductId) input.dataset.productId = dataProductId;
        form.appendChild(input);
    });
}

function rebuildAddAllFormInputs(container, addAllForm) {
    // Remove all previously built dynamic inputs
    addAllForm.querySelectorAll('.product-line-item').forEach(i => i.remove());

    container.querySelectorAll('.product-select-checkbox:checked').forEach(function (checkbox) {
        const productId = checkbox.dataset.productId;
        const productItem = checkbox.closest('.product-item');
        const selectedOptions = getCheckedOptions(productItem, productId);
        const variantData = getVariantData(container, productId);

        let variantId = productId;

        if (variantData) {
            const match = findMatchingVariant(variantData.variants, selectedOptions)
                || findBestMatchingVariant(variantData.variants, selectedOptions)
                || variantData.variants.find(v => v.inStock !== false)
                || variantData.variants[0]
                || null;
            if (match) variantId = match.id;
        }

        // Avoid duplicate quantity entries
        const existingQty = addAllForm.querySelector(`input[name="lineItems[${variantId}][quantity]"]`);
        if (existingQty) {
            existingQty.value = String(parseInt(existingQty.value, 10) + 1);
            return;
        }

        appendLineItemInputs(addAllForm, variantId, selectedOptions, 'product-line-item', productId);
    });
}

function updateAddAllButton(container) {
    const checked = container.querySelectorAll('.product-select-checkbox:checked');
    const addAllButton = container.querySelector('.add-all-to-cart');
    if (!addAllButton) return;

    const labelSelect = addAllButton.dataset.labelSelect || 'Select Products';
    const labelAdd = addAllButton.dataset.labelAdd || 'Add %count% to Cart';

    if (checked.length === 0) {
        addAllButton.disabled = true;
        addAllButton.textContent = labelSelect;
    } else {
        addAllButton.disabled = false;
        addAllButton.textContent = labelAdd.replace('%count%', checked.length);
    }
}

function initProductVariants(container, productItem, productId) {
    const individualForm = productItem.querySelector('.add-to-cart-form');
    const selectedOptions = getCheckedOptions(productItem, productId);
    const variantData = getVariantData(container, productId);

    if (!variantData) return;

    const match = (selectedOptions.length > 0
        ? findMatchingVariant(variantData.variants, selectedOptions) || findBestMatchingVariant(variantData.variants, selectedOptions)
        : null)
        || variantData.variants.find(v => v.inStock !== false)
        || variantData.variants[0]
        || null;

    if (match && individualForm) {
        updateFormForVariant(individualForm, match.id, selectedOptions, match.inStock, container);
    }
}
