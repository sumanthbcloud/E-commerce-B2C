/**
 * Main application coordinator for Pass 1 + Pass 2 storefront
 */
(function() {
    const mainEl = () => document.getElementById('main-content');
    const categoriesNavEl = () => document.getElementById('header-categories');
    const cartCountEl = () => document.getElementById('cart-badge');
    const toastEl = () => document.getElementById('toast');
    const accountLinkEl = () => document.getElementById('header-account-link');

    function showToast(message, type = 'success') {
        const toast = toastEl();
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }

    function formatPrice(amount) {
        return `$${Number(amount || 0).toFixed(2)}`;
    }

    function renderCheckoutStepper(activeStep) {
        const steps = [
            { id: 'cart', label: 'Cart', num: 1 },
            { id: 'shipping', label: 'Shipping', num: 2 },
            { id: 'payment', label: 'Payment', num: 3 },
            { id: 'confirmed', label: 'Confirmed', num: 4 }
        ];

        return `
            <div class="checkout-stepper">
                ${steps.map((s, idx) => {
                    let statusClass = '';
                    if (s.id === activeStep) statusClass = 'active';
                    else if (steps.findIndex(x => x.id === activeStep) > idx) statusClass = 'completed';

                    return `
                        <div class="step-item ${statusClass}">
                            <div class="step-badge">${statusClass === 'completed' ? '✓' : s.num}</div>
                            <span class="step-label">${s.label}</span>
                        </div>
                        ${idx < steps.length - 1 ? '<div class="step-connector"></div>' : ''}
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderRatingStars(avgRating, ratingCount, interactive = false, currentSku = null) {
        const rounded = Math.round(avgRating || 0);
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const isFilled = i <= rounded;
            if (interactive) {
                starsHtml += `<button type="button" class="star-btn ${isFilled ? 'filled' : ''}" data-score="${i}" title="Rate ${i} stars">★</button>`;
            } else {
                starsHtml += `<span class="star ${isFilled ? 'filled' : ''}">★</span>`;
            }
        }
        return `
            <div class="rating-display ${interactive ? 'interactive' : ''}">
                <div class="stars">${starsHtml}</div>
                <span class="rating-meta">${avgRating ? avgRating.toFixed(1) : '0.0'} (${ratingCount || 0} reviews)</span>
            </div>
        `;
    }

    function renderProductCard(product) {
        const inStock = product.instock !== 0;
        return `
            <div class="product-card">
                <a href="/product/${product.sku}" data-link class="product-card-media">
                    <img src="/images/${product.sku}.png" alt="${product.name}" onerror="this.src='/images/placeholder.png'">
                    <span class="product-stock-badge ${inStock ? 'in-stock' : 'out-of-stock'}">
                        ${inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                </a>
                <div class="product-card-body">
                    <span class="product-category-tag">${product.categories ? product.categories.join(' &bull; ') : 'Product'}</span>
                    <h3 class="product-title">
                        <a href="/product/${product.sku}" data-link>${product.name}</a>
                    </h3>
                    <p class="product-desc">${product.description || ''}</p>
                    <div class="product-footer">
                        <div class="product-price">${formatPrice(product.price)}</div>
                        <button class="btn btn-primary btn-sm btn-quick-add" data-sku="${product.sku}" ${inStock ? '' : 'disabled'}>
                            ${inStock ? 'Add to Cart' : 'Unavailable'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async function renderCategoriesNav() {
        try {
            const categories = await api.getCategories();
            store.state.categories = categories;
            const nav = categoriesNavEl();
            if (nav) {
                nav.innerHTML = categories.map(cat => `
                    <a href="/category/${encodeURIComponent(cat)}" data-link class="nav-category-item">${cat}</a>
                `).join('');
            }
        } catch (e) {
            console.error('Failed to load categories navigation', e);
        }
    }

    // ==========================================
    // Views: Home, Category, Search, Product
    // ==========================================
    async function showHome() {
        const container = mainEl();
        container.innerHTML = `
            <div class="hero-banner">
                <div class="hero-content">
                    <span class="hero-badge">Featured Catalogue</span>
                    <h1 class="hero-title">Smart technology for modern life</h1>
                    <p class="hero-subtitle">Discover intelligent products designed for work, home and everything in between.</p>
                    <div class="hero-actions">
                        <a href="#featured-products" class="btn btn-primary btn-lg">Shop Products</a>
                    </div>
                </div>
            </div>

            <section class="section">
                <div class="section-header">
                    <h2>Browse by Category</h2>
                    <p class="section-desc">Select an operational domain to filter specialized systems</p>
                </div>
                <div id="home-category-cards" class="category-grid">
                    <div class="loading-state">Loading categories...</div>
                </div>
            </section>

            <section id="featured-products" class="section">
                <div class="section-header">
                    <h2>Featured Systems</h2>
                    <p class="section-desc">Top rated selections across all categories</p>
                </div>
                <div id="home-featured-grid" class="product-grid">
                    <div class="loading-state">Loading products...</div>
                </div>
            </section>
        `;

        try {
            let categories = store.state.categories;
            if (!categories || categories.length === 0) {
                categories = await api.getCategories();
                store.state.categories = categories;
            }

            const catGrid = document.getElementById('home-category-cards');
            if (catGrid) {
                catGrid.innerHTML = categories.map(cat => `
                    <a href="/category/${encodeURIComponent(cat)}" data-link class="category-card">
                        <div class="category-card-header">
                            <span class="category-card-pill">Category</span>
                        </div>
                        <div class="category-card-title">${cat}</div>
                        <span class="category-card-link">Explore Systems &rarr;</span>
                    </a>
                `).join('');
            }

            // Load all products to show a full featured 4-column showcase
            const products = await api.getAllProducts();
            const grid = document.getElementById('home-featured-grid');
            if (grid) {
                if (products && products.length > 0) {
                    grid.innerHTML = products.map(renderProductCard).join('');
                } else {
                    grid.innerHTML = `<div class="empty-state">No products found.</div>`;
                }
            }
        } catch (err) {
            const grid = document.getElementById('home-featured-grid');
            if (grid) grid.innerHTML = `<div class="error-state">Failed to load products: ${err.message}</div>`;
        }
    }

    async function showCategory({ name }) {
        const container = mainEl();
        container.innerHTML = `
            <div class="page-header">
                <nav class="breadcrumb">
                    <a href="/" data-link>Home</a> / <span>Category</span> / <span>${name}</span>
                </nav>
                <h1 class="page-title text-capitalize">${name}</h1>
                <p class="page-subtitle">Showing all available products in ${name}</p>
            </div>
            <div id="category-products-grid" class="product-grid">
                <div class="loading-state">Loading ${name} products...</div>
            </div>
        `;

        try {
            const products = await api.getProductsByCategory(name);
            const grid = document.getElementById('category-products-grid');
            if (!products || products.length === 0) {
                grid.innerHTML = `<div class="empty-state">No products found in category "${name}".</div>`;
                return;
            }
            grid.innerHTML = products.map(renderProductCard).join('');
        } catch (err) {
            const grid = document.getElementById('category-products-grid');
            grid.innerHTML = `<div class="error-state">Error loading category: ${err.message}</div>`;
        }
    }

    async function showSearch({ query }) {
        const container = mainEl();
        container.innerHTML = `
            <div class="page-header">
                <nav class="breadcrumb">
                    <a href="/" data-link>Home</a> / <span>Search</span>
                </nav>
                <h1 class="page-title">Search Results</h1>
                <p class="page-subtitle">Results for "${query}"</p>
            </div>
            <div id="search-products-grid" class="product-grid">
                <div class="loading-state">Searching catalog...</div>
            </div>
        `;

        try {
            const results = await api.searchProducts(query);
            const grid = document.getElementById('search-products-grid');
            if (!results || results.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h3>No matching products</h3>
                        <p>We could not find anything matching "${query}". Try searching for different keywords.</p>
                        <a href="/" data-link class="btn btn-secondary">Back to Store</a>
                    </div>
                `;
                return;
            }
            grid.innerHTML = results.map(renderProductCard).join('');
        } catch (err) {
            const grid = document.getElementById('search-products-grid');
            grid.innerHTML = `<div class="error-state">Search encountered an error: ${err.message}</div>`;
        }
    }

    async function showProduct({ sku }) {
        const container = mainEl();
        container.innerHTML = `<div class="loading-state">Loading product details...</div>`;

        try {
            const [product, rating] = await Promise.all([
                api.getProduct(sku),
                api.getRating(sku)
            ]);

            const inStock = product.instock !== 0;

            container.innerHTML = `
                <div class="page-header">
                    <nav class="breadcrumb">
                        <a href="/" data-link>Home</a> / <a href="/category/${encodeURIComponent(product.categories?.[0] || 'products')}" data-link>${product.categories?.[0] || 'Products'}</a> / <span>${product.name}</span>
                    </nav>
                </div>
                <div class="product-detail-container">
                    <div class="product-detail-gallery">
                        <div class="product-detail-image-box">
                            <img src="/images/${product.sku}.png" alt="${product.name}" onerror="this.src='/images/placeholder.png'">
                        </div>
                    </div>
                    <div class="product-detail-info">
                        <span class="product-sku-tag">SKU: ${product.sku}</span>
                        <h1 class="product-detail-title">${product.name}</h1>
                        
                        <div id="product-rating-box" class="product-detail-rating">
                            ${renderRatingStars(rating.avg_rating, rating.rating_count)}
                        </div>

                        <div class="product-detail-price">${formatPrice(product.price)}</div>
                        
                        <div class="stock-status ${inStock ? 'in-stock' : 'out-of-stock'}">
                            ${inStock ? '● In Stock & Ready to Ship' : '✕ Currently Out of Stock'}
                        </div>

                        <p class="product-detail-desc">${product.description || 'No description available for this item.'}</p>

                        ${inStock ? `
                            <div class="product-actions-bar">
                                <div class="quantity-picker">
                                    <label for="detail-qty">Quantity</label>
                                    <input id="detail-qty" type="number" min="1" max="10" value="1" class="form-input qty-input">
                                </div>
                                <button id="btn-add-detail" class="btn btn-primary btn-lg" data-sku="${product.sku}">Add to Cart</button>
                            </div>
                        ` : ''}

                        <hr class="divider">

                        <div class="rate-product-section">
                            <h3>Rate this Product</h3>
                            <p class="text-muted">Click a star to submit your review rating</p>
                            <div id="interactive-rating-stars">
                                ${renderRatingStars(0, 0, true, product.sku)}
                            </div>
                            <span id="rate-feedback" class="rate-feedback"></span>
                        </div>
                    </div>
                </div>
            `;

            const starBtns = container.querySelectorAll('.star-btn');
            starBtns.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const score = parseInt(btn.getAttribute('data-score'), 10);
                    const feedback = document.getElementById('rate-feedback');
                    if (feedback) feedback.textContent = 'Submitting rating...';
                    try {
                        await api.rateProduct(sku, score);
                        const updatedRating = await api.getRating(sku);
                        const ratingBox = document.getElementById('product-rating-box');
                        if (ratingBox) ratingBox.innerHTML = renderRatingStars(updatedRating.avg_rating, updatedRating.rating_count);
                        if (feedback) {
                            feedback.textContent = `Thank you! Your ${score}-star rating was recorded.`;
                            feedback.className = 'rate-feedback success';
                        }
                    } catch (err) {
                        if (feedback) {
                            feedback.textContent = `Failed to submit rating: ${err.message}`;
                            feedback.className = 'rate-feedback error';
                        }
                    }
                });
            });

            const addBtn = document.getElementById('btn-add-detail');
            if (addBtn) {
                addBtn.addEventListener('click', async () => {
                    const qtyInput = document.getElementById('detail-qty');
                    const qty = parseInt(qtyInput ? qtyInput.value : '1', 10) || 1;
                    addBtn.disabled = true;
                    addBtn.textContent = 'Adding...';
                    try {
                        await api.addToCart(store.state.uniqueId, sku, qty);
                        await store.refreshCart();
                        showToast(`Added ${qty} item(s) of "${product.name}" to cart!`);
                    } catch (err) {
                        showToast(`Could not add to cart: ${err.message}`, 'error');
                    } finally {
                        addBtn.disabled = false;
                        addBtn.textContent = 'Add to Cart';
                    }
                });
            }

        } catch (err) {
            container.innerHTML = `
                <div class="error-state">
                    <h3>Product Not Found</h3>
                    <p>${err.message}</p>
                    <a href="/" data-link class="btn btn-secondary">Return to Catalog</a>
                </div>
            `;
        }
    }

    // ==========================================
    // Pass 2 View: /cart
    // ==========================================
    async function showCart() {
        const container = mainEl();
        container.innerHTML = `
            ${renderCheckoutStepper('cart')}
            <div class="page-header">
                <h1 class="page-title">Shopping Cart</h1>
                <p class="page-subtitle">Review items in your order</p>
            </div>
            <div id="cart-content-view">
                <div class="loading-state">Loading your cart...</div>
            </div>
        `;

        try {
            let cart = await store.refreshCart();

            // Strip out any stale SHIP item when viewing base cart
            const shipItem = cart.items ? cart.items.find(i => i.sku === 'SHIP') : null;
            if (shipItem) {
                cart = await api.updateCartQty(store.state.uniqueId, 'SHIP', 0);
                store.state.cart = cart;
                store.setShippingQuote(null);
            }

            renderCartContent(cart);
        } catch (err) {
            document.getElementById('cart-content-view').innerHTML = `
                <div class="error-state">
                    <h3>Unable to load cart</h3>
                    <p>${err.message}</p>
                    <a href="/" data-link class="btn btn-secondary">Return to Store</a>
                </div>
            `;
        }
    }

    function renderCartContent(cart) {
        const viewEl = document.getElementById('cart-content-view');
        if (!viewEl) return;

        const productItems = (cart.items || []).filter(item => item.sku !== 'SHIP');

        if (!productItems || productItems.length === 0) {
            viewEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🛒</div>
                    <h3>Your cart is empty</h3>
                    <p>Looks like you haven't added any items to your shopping cart yet.</p>
                    <a href="/" data-link class="btn btn-primary">Start Shopping</a>
                </div>
            `;
            return;
        }

        viewEl.innerHTML = `
            <div class="cart-layout">
                <div class="cart-items-panel">
                    <table class="cart-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Price</th>
                                <th>Quantity</th>
                                <th>Subtotal</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productItems.map(item => `
                                <tr data-sku="${item.sku}">
                                    <td class="cart-item-info">
                                        <img src="/images/${item.sku}.png" alt="${item.name}" class="cart-thumb" onerror="this.src='/images/placeholder.png'">
                                        <div>
                                            <a href="/product/${item.sku}" data-link class="cart-item-name">${item.name}</a>
                                            <span class="cart-item-sku">SKU: ${item.sku}</span>
                                        </div>
                                    </td>
                                    <td class="cart-item-price">${formatPrice(item.price)}</td>
                                    <td>
                                        <div class="cart-qty-ctrl">
                                            <button class="btn-qty btn-qty-dec" data-sku="${item.sku}">−</button>
                                            <span class="qty-val">${item.qty}</span>
                                            <button class="btn-qty btn-qty-inc" data-sku="${item.sku}" ${item.qty >= 10 ? 'disabled' : ''}>+</button>
                                        </div>
                                    </td>
                                    <td class="cart-item-subtotal">${formatPrice(item.subtotal)}</td>
                                    <td>
                                        <button class="btn-remove-item" data-sku="${item.sku}" title="Remove item">&times;</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="cart-summary-panel">
                    <div class="order-summary-card">
                        <h3>Order Summary</h3>
                        <div class="summary-line">
                            <span>Subtotal (${productItems.reduce((acc, i) => acc + i.qty, 0)} items)</span>
                            <span>${formatPrice(cart.total)}</span>
                        </div>
                        <div class="summary-line">
                            <span>Estimated Tax</span>
                            <span>${formatPrice(cart.tax || 0)}</span>
                        </div>
                        <div class="summary-line total-line">
                            <span>Total</span>
                            <span class="total-amount">${formatPrice(cart.total)}</span>
                        </div>
                        <p class="summary-note">Shipping calculated during checkout</p>
                        <button id="btn-proceed-checkout" class="btn btn-primary btn-block btn-lg">Proceed to Checkout &rarr;</button>
                    </div>
                </div>
            </div>
        `;

        // Event listeners for quantity changes and removal
        viewEl.querySelectorAll('.btn-qty-inc').forEach(btn => {
            btn.addEventListener('click', async () => {
                const sku = btn.getAttribute('data-sku');
                const item = productItems.find(i => i.sku === sku);
                if (item && item.qty < 10) {
                    await updateCartItemQty(sku, item.qty + 1);
                }
            });
        });

        viewEl.querySelectorAll('.btn-qty-dec').forEach(btn => {
            btn.addEventListener('click', async () => {
                const sku = btn.getAttribute('data-sku');
                const item = productItems.find(i => i.sku === sku);
                if (item) {
                    await updateCartItemQty(sku, item.qty - 1);
                }
            });
        });

        viewEl.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const sku = btn.getAttribute('data-sku');
                await updateCartItemQty(sku, 0);
            });
        });

        const checkoutBtn = document.getElementById('btn-proceed-checkout');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                router.navigate('/shipping');
            });
        }
    }

    async function updateCartItemQty(sku, qty) {
        try {
            const updatedCart = await api.updateCartQty(store.state.uniqueId, sku, qty);
            store.state.cart = updatedCart;
            store.notify();
            renderCartContent(updatedCart);
            showToast(qty === 0 ? 'Item removed from cart' : 'Cart updated');
        } catch (err) {
            showToast(`Could not update cart: ${err.message}`, 'error');
        }
    }

    // ==========================================
    // Pass 2 View: /shipping
    // ==========================================
    async function showShipping() {
        const container = mainEl();
        container.innerHTML = `
            ${renderCheckoutStepper('shipping')}
            <div class="page-header">
                <nav class="breadcrumb">
                    <a href="/cart" data-link>&larr; Back to Cart</a>
                </nav>
                <h1 class="page-title">Shipping & Delivery</h1>
                <p class="page-subtitle">Select your delivery country and destination city</p>
            </div>
            <div id="shipping-view-container">
                <div class="loading-state">Loading shipping locations...</div>
            </div>
        `;

        // Check if cart has items
        const cart = await store.refreshCart();
        const productItems = (cart.items || []).filter(i => i.sku !== 'SHIP');
        if (productItems.length === 0) {
            document.getElementById('shipping-view-container').innerHTML = `
                <div class="empty-state">
                    <h3>Cart is empty</h3>
                    <p>Please add products to your cart before proceeding to shipping.</p>
                    <a href="/" data-link class="btn btn-primary">Browse Catalog</a>
                </div>
            `;
            return;
        }

        try {
            const countries = await api.getShippingCountries();

            document.getElementById('shipping-view-container').innerHTML = `
                <div class="shipping-layout">
                    <div class="shipping-card">
                        <form id="shipping-form" class="shipping-form">
                            <div class="form-group">
                                <label for="ship-country">Country / Destination</label>
                                <select id="ship-country" class="form-input" required>
                                    <option value="" disabled selected>-- Select Country --</option>
                                    ${countries.map(c => `<option value="${c.code}" data-name="${c.name}">${c.name}</option>`).join('')}
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="ship-city">City Search</label>
                                <div class="city-search-box">
                                    <input id="ship-city" type="text" class="form-input" placeholder="Type at least 3 letters of city name..." autocomplete="off" disabled required>
                                    <div id="city-autocomplete-list" class="autocomplete-dropdown" style="display: none;"></div>
                                </div>
                                <span class="form-hint">Type 3 letters to search available distribution hubs.</span>
                            </div>

                            <input type="hidden" id="selected-city-uuid" value="">
                            <input type="hidden" id="selected-city-name" value="">

                            <div id="shipping-quote-box" class="shipping-quote-box" style="display: none;">
                                <div class="quote-header">
                                    <span class="quote-icon">🚚</span>
                                    <h4>Calculated Shipping Rate</h4>
                                </div>
                                <div class="quote-details">
                                    <div class="summary-line">
                                        <span>Delivery Distance</span>
                                        <span id="quote-distance">-</span>
                                    </div>
                                    <div class="summary-line">
                                        <span>Shipping Cost</span>
                                        <span id="quote-cost" class="quote-cost-val">-</span>
                                    </div>
                                </div>
                            </div>

                            <div class="shipping-actions">
                                <button type="button" id="btn-calc-shipping" class="btn btn-secondary" disabled>Calculate Rate</button>
                                <button type="submit" id="btn-confirm-shipping" class="btn btn-primary btn-lg" disabled>Continue to Payment &rarr;</button>
                            </div>
                        </form>
                    </div>

                    <div class="shipping-order-summary">
                        <div class="order-summary-card">
                            <h3>Items in Order</h3>
                            <ul class="order-mini-list">
                                ${productItems.map(item => `
                                    <li class="mini-item">
                                        <span>${item.name} &times; ${item.qty}</span>
                                        <span>${formatPrice(item.subtotal)}</span>
                                    </li>
                                `).join('')}
                            </ul>
                            <div class="summary-line total-line">
                                <span>Subtotal</span>
                                <span>${formatPrice(cart.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            initShippingInteractions();

        } catch (err) {
            document.getElementById('shipping-view-container').innerHTML = `
                <div class="error-state">
                    <h3>Failed to load shipping data</h3>
                    <p>${err.message}</p>
                    <a href="/cart" data-link class="btn btn-secondary">Return to Cart</a>
                </div>
            `;
        }
    }

    function initShippingInteractions() {
        const countrySelect = document.getElementById('ship-country');
        const cityInput = document.getElementById('ship-city');
        const dropdown = document.getElementById('city-autocomplete-list');
        const cityUuidInput = document.getElementById('selected-city-uuid');
        const cityNameInput = document.getElementById('selected-city-name');
        const calcBtn = document.getElementById('btn-calc-shipping');
        const confirmBtn = document.getElementById('btn-confirm-shipping');
        const quoteBox = document.getElementById('shipping-quote-box');
        const form = document.getElementById('shipping-form');

        let calculatedQuote = null;
        let debounceTimer = null;

        countrySelect.addEventListener('change', () => {
            cityInput.disabled = !countrySelect.value;
            cityInput.value = '';
            cityUuidInput.value = '';
            cityNameInput.value = '';
            calcBtn.disabled = true;
            confirmBtn.disabled = true;
            quoteBox.style.display = 'none';
            calculatedQuote = null;
            dropdown.style.display = 'none';
        });

        cityInput.addEventListener('input', () => {
            const query = cityInput.value.trim();
            calcBtn.disabled = true;
            confirmBtn.disabled = true;
            cityUuidInput.value = '';
            cityNameInput.value = '';
            quoteBox.style.display = 'none';
            calculatedQuote = null;

            clearTimeout(debounceTimer);
            if (query.length < 3) {
                dropdown.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                const countryCode = countrySelect.value;
                try {
                    const matches = await api.searchShippingCities(countryCode, query);
                    if (matches && matches.length > 0) {
                        dropdown.innerHTML = matches.map(m => `
                            <div class="autocomplete-item" data-uuid="${m.uuid}" data-name="${m.name}">
                                <strong>${m.name}</strong>
                            </div>
                        `).join('');
                        dropdown.style.display = 'block';

                        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                            item.addEventListener('click', () => {
                                const uuid = item.getAttribute('data-uuid');
                                const name = item.getAttribute('data-name');
                                cityInput.value = name;
                                cityUuidInput.value = uuid;
                                cityNameInput.value = name;
                                dropdown.style.display = 'none';
                                calcBtn.disabled = false;
                            });
                        });
                    } else {
                        dropdown.innerHTML = `<div class="autocomplete-empty">No cities found matching "${query}"</div>`;
                        dropdown.style.display = 'block';
                    }
                } catch (e) {
                    dropdown.style.display = 'none';
                }
            }, 300);
        });

        // Hide dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!cityInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        calcBtn.addEventListener('click', async () => {
            const uuid = cityUuidInput.value;
            if (!uuid) return;
            calcBtn.disabled = true;
            calcBtn.textContent = 'Calculating...';
            try {
                const quote = await api.calculateShipping(uuid);
                const selectedCountryName = countrySelect.options[countrySelect.selectedIndex].getAttribute('data-name');
                quote.location = `${selectedCountryName} ${cityNameInput.value}`;
                calculatedQuote = quote;

                document.getElementById('quote-distance').textContent = `${quote.distance} km`;
                document.getElementById('quote-cost').textContent = formatPrice(quote.cost);
                quoteBox.style.display = 'block';
                confirmBtn.disabled = false;
            } catch (err) {
                showToast(`Failed to calculate rate: ${err.message}`, 'error');
            } finally {
                calcBtn.disabled = false;
                calcBtn.textContent = 'Calculate Rate';
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!calculatedQuote) return;
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Confirming...';
            try {
                // POST shipping quote to add SHIP item to cart
                const updatedCart = await api.confirmShipping(store.state.uniqueId, calculatedQuote);
                store.state.cart = updatedCart;
                store.setShippingQuote(calculatedQuote);
                store.notify();
                router.navigate('/payment');
            } catch (err) {
                showToast(`Could not confirm shipping: ${err.message}`, 'error');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Continue to Payment →';
            }
        });
    }

    // ==========================================
    // Pass 2 View: /payment
    // ==========================================
    async function showPayment() {
        const container = mainEl();
        container.innerHTML = `
            ${renderCheckoutStepper('payment')}
            <div class="page-header">
                <nav class="breadcrumb">
                    <a href="/shipping" data-link>&larr; Back to Shipping</a>
                </nav>
                <h1 class="page-title">Order Review & Payment</h1>
                <p class="page-subtitle">Confirm your final order details and complete payment</p>
            </div>
            <div id="payment-view-container">
                <div class="loading-state">Loading order details...</div>
            </div>
        `;

        try {
            const cart = await store.refreshCart();
            const hasShipping = (cart.items || []).some(i => i.sku === 'SHIP');

            if (!cart.items || cart.items.length === 0) {
                document.getElementById('payment-view-container').innerHTML = `
                    <div class="empty-state">
                        <h3>Cart is empty</h3>
                        <p>No items found to pay for.</p>
                        <a href="/" data-link class="btn btn-primary">Browse Catalog</a>
                    </div>
                `;
                return;
            }

            if (!hasShipping) {
                document.getElementById('payment-view-container').innerHTML = `
                    <div class="error-state">
                        <h3>Shipping not configured</h3>
                        <p>Shipping calculation is required before payment can be processed.</p>
                        <a href="/shipping" data-link class="btn btn-primary">Configure Shipping</a>
                    </div>
                `;
                return;
            }

            const itemsOnly = cart.items.filter(i => i.sku !== 'SHIP');
            const shipItem = cart.items.find(i => i.sku === 'SHIP');

            document.getElementById('payment-view-container').innerHTML = `
                <div class="payment-layout">
                    <div class="payment-main-card">
                        <h3>Review Items</h3>
                        <table class="review-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsOnly.map(i => `
                                    <tr>
                                        <td><strong>${i.name}</strong></td>
                                        <td>${i.qty}</td>
                                        <td>${formatPrice(i.price)}</td>
                                        <td>${formatPrice(i.subtotal)}</td>
                                    </tr>
                                `).join('')}
                                ${shipItem ? `
                                    <tr class="shipping-row">
                                        <td><strong>🚚 Shipping & Handling</strong></td>
                                        <td>1</td>
                                        <td>${formatPrice(shipItem.price)}</td>
                                        <td>${formatPrice(shipItem.subtotal)}</td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>

                        <hr class="divider">

                        <h3>Payment Method</h3>
                        <div class="payment-method-card selected">
                            <div class="pm-radio">●</div>
                            <div>
                                <strong>Secure Standard Checkout</strong>
                                <p class="text-muted">Instant processing via Secure Payment Gateway</p>
                            </div>
                        </div>

                        <div class="payment-actions">
                            <button id="btn-pay-now" class="btn btn-primary btn-lg btn-block">Pay & Place Order ${formatPrice(cart.total)}</button>
                        </div>
                    </div>

                    <div class="payment-summary-panel">
                        <div class="order-summary-card">
                            <h3>Final Order Summary</h3>
                            <div class="summary-line">
                                <span>Items Subtotal</span>
                                <span>${formatPrice(itemsOnly.reduce((a, b) => a + b.subtotal, 0))}</span>
                            </div>
                            <div class="summary-line">
                                <span>Shipping Fee</span>
                                <span>${formatPrice(shipItem ? shipItem.price : 0)}</span>
                            </div>
                            <div class="summary-line">
                                <span>Taxes</span>
                                <span>${formatPrice(cart.tax || 0)}</span>
                            </div>
                            <div class="summary-line total-line">
                                <span>Order Total</span>
                                <span class="total-amount">${formatPrice(cart.total)}</span>
                            </div>
                            <p class="summary-note">Your order will be queued for automated warehouse dispatch upon payment.</p>
                        </div>
                    </div>
                </div>
            `;

            const payBtn = document.getElementById('btn-pay-now');
            if (payBtn) {
                payBtn.addEventListener('click', async () => {
                    // Prevent accidental double clicks
                    payBtn.disabled = true;
                    payBtn.textContent = 'Processing Payment...';

                    try {
                        const result = await api.submitPayment(store.state.uniqueId, cart);
                        // Refresh cart so it's empty in store and UI
                        await store.refreshCart();
                        store.setShippingQuote(null);
                        showOrderConfirmed(result.orderid, cart);
                    } catch (err) {
                        showToast(`Payment error: ${err.message}`, 'error');
                        payBtn.disabled = false;
                        payBtn.textContent = `Pay & Place Order ${formatPrice(cart.total)}`;
                    }
                });
            }

        } catch (err) {
            document.getElementById('payment-view-container').innerHTML = `
                <div class="error-state">
                    <h3>Error loading order</h3>
                    <p>${err.message}</p>
                    <a href="/cart" data-link class="btn btn-secondary">Return to Cart</a>
                </div>
            `;
        }
    }

    function showOrderConfirmed(orderId, finalCart) {
        const container = mainEl();
        container.innerHTML = `
            ${renderCheckoutStepper('confirmed')}
            <div class="confirmed-card">
                <div class="confirmed-icon">🎉</div>
                <h1 class="page-title">Order Successfully Placed!</h1>
                <p class="confirmed-subtitle">Thank you for your business. Your order has been registered and dispatched for fulfillment.</p>
                
                <div class="order-id-badge">
                    <span>Order Confirmation ID:</span>
                    <strong>${orderId}</strong>
                </div>

                <div class="confirmed-summary-box">
                    <h4>Order Summary</h4>
                    <p>Total Charged: <strong>${formatPrice(finalCart.total)}</strong></p>
                    <p>Total Items: <strong>${finalCart.items ? finalCart.items.filter(i => i.sku !== 'SHIP').reduce((a, b) => a + b.qty, 0) : 0}</strong></p>
                </div>

                <div class="confirmed-actions">
                    <a href="/" data-link class="btn btn-primary btn-lg">Continue Shopping</a>
                    <a href="/login" data-link class="btn btn-secondary btn-lg">View Order History</a>
                </div>
            </div>
        `;
    }

    // ==========================================
    // Pass 2 View: /login (Auth & History)
    // ==========================================
    async function showLogin() {
        const container = mainEl();
        const currentUser = store.state.user;

        if (currentUser) {
            // Already logged in: show profile and order history
            container.innerHTML = `
                <div class="page-header">
                    <h1 class="page-title">My Account</h1>
                    <p class="page-subtitle">Welcome back, <strong>${currentUser.name}</strong> (${currentUser.email || 'Registered User'})</p>
                </div>
                <div class="account-actions-bar">
                    <button id="btn-logout" class="btn btn-secondary btn-sm">Log Out</button>
                    <a href="/" data-link class="btn btn-primary btn-sm">Shop Catalog</a>
                </div>

                <section class="section">
                    <div class="section-header">
                        <h2>Order History</h2>
                        <p class="section-desc">Track your previous orders and purchases</p>
                    </div>
                    <div id="order-history-container">
                        <div class="loading-state">Loading order history...</div>
                    </div>
                </section>
            `;

            document.getElementById('btn-logout').addEventListener('click', async () => {
                await store.logout();
                showToast('Logged out successfully');
                showLogin();
            });

            try {
                const history = await api.getOrderHistory(currentUser.name);
                const historyContainer = document.getElementById('order-history-container');
                if (!history || history.length === 0) {
                    historyContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">📦</div>
                            <h3>No past orders found</h3>
                            <p>You haven't completed any orders with this account yet.</p>
                            <a href="/" data-link class="btn btn-primary">Start Shopping</a>
                        </div>
                    `;
                    return;
                }

                historyContainer.innerHTML = `
                    <div class="history-list">
                        ${history.map(order => `
                            <div class="history-card">
                                <div class="history-card-header">
                                    <div>
                                        <span class="history-order-id">Order #${order.orderid}</span>
                                    </div>
                                    <div class="history-total">
                                        ${formatPrice(order.cart ? order.cart.total : 0)}
                                    </div>
                                </div>
                                <div class="history-card-body">
                                    <ul class="history-item-list">
                                        ${(order.cart?.items || []).map(item => `
                                            <li>
                                                <span>${item.name} &times; ${item.qty}</span>
                                                <span>${formatPrice(item.subtotal || item.price)}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            </div>
                        `).reverse().join('')}
                    </div>
                `;
            } catch (err) {
                document.getElementById('order-history-container').innerHTML = `
                    <div class="error-state">Failed to load order history: ${err.message}</div>
                `;
            }
            return;
        }

        // Not logged in: show Login and Register forms side-by-side
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Sign In or Register</h1>
                <p class="page-subtitle">Access your account and track your order history</p>
            </div>

            <div class="auth-grid">
                <div class="auth-card">
                    <h2>Sign In</h2>
                    <p class="text-muted">Enter your account credentials to log in</p>
                    <form id="form-login" class="auth-form">
                        <div class="form-group">
                            <label for="login-username">Username</label>
                            <input id="login-username" type="text" class="form-input" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <input id="login-password" type="password" class="form-input" required autocomplete="current-password">
                        </div>
                        <button type="submit" id="btn-submit-login" class="btn btn-primary btn-block">Sign In</button>
                    </form>
                </div>

                <div class="auth-card">
                    <h2>Create Account</h2>
                    <p class="text-muted">Register to save order history across devices</p>
                    <form id="form-register" class="auth-form">
                        <div class="form-group">
                            <label for="reg-username">Username</label>
                            <input id="reg-username" type="text" class="form-input" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label for="reg-email">Email Address</label>
                            <input id="reg-email" type="email" class="form-input" required autocomplete="email">
                        </div>
                        <div class="form-group">
                            <label for="reg-password">Password</label>
                            <input id="reg-password" type="password" class="form-input" required autocomplete="new-password">
                        </div>
                        <div class="form-group">
                            <label for="reg-confirm">Confirm Password</label>
                            <input id="reg-confirm" type="password" class="form-input" required autocomplete="new-password">
                        </div>
                        <button type="submit" id="btn-submit-register" class="btn btn-secondary btn-block">Register Account</button>
                    </form>
                </div>
            </div>
        `;

        // Handle Login
        const loginForm = document.getElementById('form-login');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-login');
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            btn.disabled = true;
            btn.textContent = 'Signing in...';

            try {
                const oldAnonId = store.state.uniqueId;
                const user = await api.login(username, password);
                
                // Migrate cart from anonymous id to username
                if (oldAnonId && oldAnonId !== username) {
                    await api.renameCart(oldAnonId, username);
                }

                store.setUniqueId(username);
                store.setUser({ name: user.name, email: user.email });
                await store.refreshCart();

                showToast(`Welcome back, ${user.name}!`);
                showLogin();
            } catch (err) {
                showToast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        });

        // Handle Register
        const regForm = document.getElementById('form-register');
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-register');
            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const confirm = document.getElementById('reg-confirm').value;

            if (password !== confirm) {
                showToast('Passwords do not match', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Registering...';

            try {
                const oldAnonId = store.state.uniqueId;
                await api.register(username, email, password);
                
                // Migrate cart from anonymous id to registered username
                if (oldAnonId && oldAnonId !== username) {
                    await api.renameCart(oldAnonId, username);
                }

                store.setUniqueId(username);
                store.setUser({ name: username, email });
                await store.refreshCart();

                showToast(`Account created for ${username}!`);
                showLogin();
            } catch (err) {
                showToast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Register Account';
            }
        });
    }

    // ==========================================
    // Event Handlers & Subscriptions
    // ==========================================
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-quick-add');
        if (btn) {
            const sku = btn.getAttribute('data-sku');
            btn.disabled = true;
            btn.textContent = '...';
            try {
                await api.addToCart(store.state.uniqueId, sku, 1);
                await store.refreshCart();
                showToast(`Item added to cart!`);
            } catch (err) {
                showToast(`Failed to add item: ${err.message}`, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Add to Cart';
            }
        }
    });

    const searchForm = document.getElementById('header-search-form');
    const searchInput = document.getElementById('header-search-input');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = (searchInput ? searchInput.value : '').trim();
            if (q) {
                router.navigate(`/search/${encodeURIComponent(q)}`);
            }
        });
    }

    // Subscribe store updates to header badge and account link
    store.subscribe((state) => {
        const badge = cartCountEl();
        if (badge) {
            const count = store.getCartCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }

        const accountLink = accountLinkEl();
        if (accountLink) {
            const userName = state.user ? state.user.name : 'Account';
            const welcomeSub = state.user ? 'Signed in' : 'Welcome';
            accountLink.innerHTML = `
                <svg class="action-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <div class="action-text">
                    <span class="action-sub">${welcomeSub}</span>
                    <span class="action-main">${userName}</span>
                </div>
            `;
        }
    });

    // Register all routes
    router.add('/', () => showHome());
    router.add('/category/:name', (params) => showCategory(params));
    router.add('/search/:query', (params) => showSearch(params));
    router.add('/product/:sku', (params) => showProduct(params));
    router.add('/cart', () => showCart());
    router.add('/shipping', () => showShipping());
    router.add('/payment', () => showPayment());
    router.add('/login', () => showLogin());

    // Application bootstrap
    async function initApp() {
        await store.init();
        store.notify();
        await renderCategoriesNav();
        router.init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
