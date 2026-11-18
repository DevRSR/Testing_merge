
/**
 * Mini Marketplace — Member 3: Checkout
 *
 * Required HTML:
 * <section id="checkout-page" hidden>
 *   <form id="checkout-form" novalidate>
 *     <label for="checkout-name">Full name</label>
 *     <input id="checkout-name" name="name" autocomplete="name" required>
 *     <p id="checkout-name-error" class="checkout-error"></p>
 *
 *     <label for="checkout-email">Email</label>
 *     <input id="checkout-email" name="email" type="email" autocomplete="email" required>
 *     <p id="checkout-email-error" class="checkout-error"></p>
 *
 *     <label for="checkout-phone">Phone number</label>
 *     <input id="checkout-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" required>
 *     <p id="checkout-phone-error" class="checkout-error"></p>
 *
 *     <label for="checkout-address">Delivery address</label>
 *     <textarea id="checkout-address" name="address" autocomplete="street-address" required></textarea>
 *     <p id="checkout-address-error" class="checkout-error"></p>
 *
 *     <p id="checkout-cart-error" class="checkout-error" role="alert"></p>
 *     <p>Order total: <span id="checkout-total">$0.00</span></p>
 *     <button id="place-order-button" type="submit">Place Order</button>
 *   </form>
 * </section>
 *
 * Usage in main.js:
 *   const checkoutUI = initCheckout(cart, {
 *     onOrder: (order) => showOrderSummary(order),
 *   });
 *   // Call checkoutUI.refresh() when opening the checkout page.
 *
 * The cart is NOT cleared here. Member 4 owns persistence, summary,
 * navigation, and the Continue Shopping action.
 */

const FIELD_NAMES = ['name', 'email', 'phone', 'address'];

const formatUSD = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(amount);

function validateCustomer(customer) {
  const errors = {};

  if (!customer.name) {
    errors.name = 'Please enter your full name.';
  } else if (customer.name.length < 2) {
    errors.name = 'Your name must contain at least 2 characters.';
  }

  if (!customer.email) {
    errors.email = 'Please enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!customer.phone) {
    errors.phone = 'Please enter your phone number.';
  } else if (!/^\d{7,15}$/.test(customer.phone)) {
    errors.phone = 'Enter a phone number with 7 to 15 digits only.';
  }

  if (!customer.address) {
    errors.address = 'Please enter your delivery address.';
  } else if (customer.address.length < 5) {
    errors.address = 'Please provide a more complete delivery address.';
  }

  return errors;
}

function makeOrderId() {
  // Date and a random suffix make collisions unlikely in this demo app.
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${Date.now()}-${suffix}`;
}

/**
 * Connect the checkout form to an existing Cart instance.
 *
 * @param {object} cart - Must expose getItems(), getTotal(), getItemCount().
 * @param {{ onOrder: (order: object) => void }} options
 * @returns {{ refresh: Function, reset: Function, destroy: Function }}
 */
export function initCheckout(cart, { onOrder } = {}) {
  if (!cart || ['getItems', 'getTotal', 'getItemCount'].some(
    (method) => typeof cart[method] !== 'function'
  )) {
    throw new TypeError('initCheckout requires a compatible Cart instance.');
  }

  if (typeof onOrder !== 'function') {
    throw new TypeError('initCheckout requires an onOrder callback.');
  }

  const form = document.getElementById('checkout-form');
  const totalDisplay = document.getElementById('checkout-total');
  const cartError = document.getElementById('checkout-cart-error');
  const submitButton = document.getElementById('place-order-button');

  const fields = Object.fromEntries(FIELD_NAMES.map((name) => [
    name, document.getElementById(`checkout-${name}`),
  ]));
  const errorElements = Object.fromEntries(FIELD_NAMES.map((name) => [
    name, document.getElementById(`checkout-${name}-error`),
  ]));

  if (!form || !totalDisplay || !cartError || !submitButton ||
      Object.values(fields).some((field) => !field) ||
      Object.values(errorElements).some((node) => !node)) {
    throw new Error('Checkout UI is missing one or more required HTML elements.');
  }

  // HTML validation is supplementary; our messages appear beneath each field.
  form.noValidate = true;
  cartError.setAttribute('role', 'alert');

  function readCustomer() {
    return Object.fromEntries(FIELD_NAMES.map((name) => [
      name, fields[name].value.trim(),
    ]));
  }

  function showFieldError(name, message = '') {
    errorElements[name].textContent = message;
    fields[name].setAttribute('aria-invalid', String(Boolean(message)));
    if (message) {
      fields[name].setAttribute('aria-describedby', errorElements[name].id);
    } else {
      fields[name].removeAttribute('aria-describedby');
    }
  }

  function clearErrors() {
    FIELD_NAMES.forEach((name) => showFieldError(name));
    cartError.textContent = '';
  }

  function refresh() {
    totalDisplay.textContent = formatUSD(cart.getTotal());
    const isEmpty = cart.getItemCount() === 0;
    submitButton.disabled = isEmpty;
    cartError.textContent = isEmpty
      ? 'Your cart is empty. Add products before checking out.'
      : '';
  }

  function handleInput(event) {
    const name = FIELD_NAMES.find((key) => fields[key] === event.target);
    if (!name) return;
    // Revalidate only fields already showing an error.
    if (errorElements[name].textContent) {
      const errors = validateCustomer(readCustomer());
      showFieldError(name, errors[name] || '');
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearErrors();
    refresh();

    if (cart.getItemCount() === 0) return;

    const customer = readCustomer();
    const errors = validateCustomer(customer);

    FIELD_NAMES.forEach((name) => showFieldError(name, errors[name] || ''));

    const firstInvalid = FIELD_NAMES.find((name) => errors[name]);
    if (firstInvalid) {
      fields[firstInvalid].focus();
      return;
    }

    const order = {
      orderId: makeOrderId(),
      customer,
      items: cart.getItems().map((item) => ({ ...item })),
      total: cart.getTotal(),
      date: new Date().toISOString(),
    };

    // Integration callback handles summary, storage, and navigation.
    onOrder(order);
  }

  form.addEventListener('input', handleInput);
  form.addEventListener('submit', handleSubmit);
  refresh();

  return {
    refresh,
    reset() {
      form.reset();
      clearErrors();
      refresh();
    },
    destroy() {
      form.removeEventListener('input', handleInput);
      form.removeEventListener('submit', handleSubmit);
    },
  };
}
