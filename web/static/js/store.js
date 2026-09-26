/**
 * Global client store for session, cart, authentication and shared state
 */
const store = {
    state: {
        uniqueId: localStorage.getItem('ecommerce_b2c_unique_id') || '',
        user: JSON.parse(localStorage.getItem('ecommerce_b2c_user') || 'null'),
        cart: { total: 0, tax: 0, items: [] },
        shippingQuote: JSON.parse(sessionStorage.getItem('ecommerce_b2c_shipping') || 'null'),
        categories: [],
        listeners: []
    },

    async init() {
        if (!this.state.uniqueId) {
            try {
                const uuid = await api.getUniqueId();
                this.setUniqueId(uuid);
            } catch (err) {
                console.error('Failed to init uniqueId:', err);
                const fallback = 'anon-' + Math.random().toString(36).substr(2, 9);
                this.setUniqueId(fallback);
            }
        }
        await this.refreshCart();
    },

    setUniqueId(id) {
        this.state.uniqueId = id;
        localStorage.setItem('ecommerce_b2c_unique_id', id);
        this.notify();
    },

    setUser(user) {
        this.state.user = user;
        if (user) {
            localStorage.setItem('ecommerce_b2c_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('ecommerce_b2c_user');
        }
        this.notify();
    },

    async logout() {
        this.setUser(null);
        // Acquire fresh anonymous unique id
        try {
            const uuid = await api.getUniqueId();
            this.setUniqueId(uuid);
        } catch (e) {
            const fallback = 'anon-' + Math.random().toString(36).substr(2, 9);
            this.setUniqueId(fallback);
        }
        this.state.cart = { total: 0, tax: 0, items: [] };
        this.setShippingQuote(null);
        await this.refreshCart();
        this.notify();
    },

    setShippingQuote(quote) {
        this.state.shippingQuote = quote;
        if (quote) {
            sessionStorage.setItem('ecommerce_b2c_shipping', JSON.stringify(quote));
        } else {
            sessionStorage.removeItem('ecommerce_b2c_shipping');
        }
        this.notify();
    },

    async refreshCart() {
        if (!this.state.uniqueId) return;
        try {
            const cart = await api.getCart(this.state.uniqueId);
            this.state.cart = cart || { total: 0, tax: 0, items: [] };
            this.notify();
            return this.state.cart;
        } catch (e) {
            console.error('Failed to refresh cart:', e);
            return this.state.cart;
        }
    },

    getCartCount() {
        if (!this.state.cart || !this.state.cart.items) return 0;
        return this.state.cart.items.reduce((acc, item) => {
            if (item.sku === 'SHIP') return acc;
            return acc + (item.qty || 0);
        }, 0);
    },

    subscribe(listener) {
        this.state.listeners.push(listener);
        return () => {
            this.state.listeners = this.state.listeners.filter(l => l !== listener);
        };
    },

    notify() {
        for (const listener of this.state.listeners) {
            try {
                listener(this.state);
            } catch (err) {
                console.error('Error in store listener:', err);
            }
        }
    }
};

window.store = store;
