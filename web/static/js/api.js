/**
 * Complete API client for E-commerce-B2C microservices
 * Connects directly through Nginx reverse-proxy paths
 */
const api = {
    // Catalogue Service
    async getCategories() {
        const res = await fetch('/api/catalogue/categories');
        if (!res.ok) throw new Error(`Failed to load categories: ${res.status}`);
        return await res.json();
    },

    async getProductsByCategory(category) {
        const res = await fetch(`/api/catalogue/products/${encodeURIComponent(category)}`);
        if (!res.ok) throw new Error(`Failed to load products for ${category}: ${res.status}`);
        return await res.json();
    },

    async getProduct(sku) {
        const res = await fetch(`/api/catalogue/product/${encodeURIComponent(sku)}`);
        if (!res.ok) throw new Error(`Product ${sku} not found`);
        return await res.json();
    },

    async searchProducts(text) {
        const res = await fetch(`/api/catalogue/search/${encodeURIComponent(text)}`);
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        return await res.json();
    },

    // User Service
    async getUniqueId() {
        const res = await fetch('/api/user/uniqueid');
        if (!res.ok) throw new Error(`Failed to acquire session ID`);
        const data = await res.json();
        return data.uuid;
    },

    async login(name, password) {
        const res = await fetch('/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password })
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Invalid username or password');
        }
        return await res.json();
    },

    async register(name, email, password) {
        const res = await fetch('/api/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Registration failed');
        }
        return { name, email };
    },

    async getOrderHistory(username) {
        const res = await fetch(`/api/user/history/${encodeURIComponent(username)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.history || [];
    },

    // Cart Service
    async getCart(cartId) {
        const res = await fetch(`/api/cart/cart/${encodeURIComponent(cartId)}`);
        if (!res.ok) return { total: 0, tax: 0, items: [] };
        return await res.json();
    },

    async addToCart(cartId, sku, qty = 1) {
        const res = await fetch(`/api/cart/add/${encodeURIComponent(cartId)}/${encodeURIComponent(sku)}/${qty}`);
        if (!res.ok) throw new Error(`Failed to add item to cart`);
        return await res.json();
    },

    async updateCartQty(cartId, sku, qty) {
        const res = await fetch(`/api/cart/update/${encodeURIComponent(cartId)}/${encodeURIComponent(sku)}/${qty}`);
        if (!res.ok) throw new Error(`Failed to update cart quantity`);
        return await res.json();
    },

    async renameCart(fromId, toId) {
        try {
            const res = await fetch(`/api/cart/rename/${encodeURIComponent(fromId)}/${encodeURIComponent(toId)}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('Cart rename skipped or failed:', e);
        }
        return null;
    },

    // Shipping Service
    async getShippingCountries() {
        const res = await fetch('/api/shipping/codes');
        if (!res.ok) throw new Error(`Failed to load shipping countries`);
        return await res.json();
    },

    async searchShippingCities(countryCode, text) {
        const res = await fetch(`/api/shipping/match/${encodeURIComponent(countryCode)}/${encodeURIComponent(text)}`);
        if (!res.ok) return [];
        return await res.json();
    },

    async calculateShipping(cityUuid) {
        const res = await fetch(`/api/shipping/calc/${encodeURIComponent(cityUuid)}`);
        if (!res.ok) throw new Error(`Failed to calculate shipping rate`);
        return await res.json();
    },

    async confirmShipping(cartId, shippingPayload) {
        const res = await fetch(`/api/shipping/confirm/${encodeURIComponent(cartId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shippingPayload)
        });
        if (!res.ok) throw new Error(`Failed to confirm shipping details`);
        return await res.json();
    },

    // Payment Service
    async submitPayment(cartId, cartPayload) {
        const res = await fetch(`/api/payment/pay/${encodeURIComponent(cartId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cartPayload)
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || `Payment failed (${res.status})`);
        }
        return await res.json();
    },

    // Ratings Service
    async getRating(sku) {
        try {
            const res = await fetch(`/api/ratings/api/fetch/${encodeURIComponent(sku)}`);
            if (!res.ok) return { avg_rating: 0, rating_count: 0 };
            return await res.json();
        } catch (e) {
            return { avg_rating: 0, rating_count: 0 };
        }
    },

    async rateProduct(sku, score) {
        const res = await fetch(`/api/ratings/api/rate/${encodeURIComponent(sku)}/${score}`, {
            method: 'PUT'
        });
        if (!res.ok) throw new Error(`Failed to submit rating`);
        return await res.json();
    }
};

window.api = api;
