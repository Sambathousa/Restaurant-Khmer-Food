let cart = {};

const cartCount     = document.getElementById('cartCount');
const cartDropdown  = document.getElementById('cartDropdown');
const cartToggle    = document.getElementById('cartToggle');
const cartItemsList = document.getElementById('cartItemsList');
const cartEmpty     = document.getElementById('cartEmpty');
const cartTotal     = document.getElementById('cartTotal');
const menuToggle    = document.getElementById('menuToggle');
const navMenu       = document.getElementById('navMenu');
const categoryTabs  = document.getElementById('categoryTabs');
const menuGrid      = document.getElementById('menuGrid');
const noResults     = document.getElementById('noResults');

const historyToggle    = document.getElementById('historyToggle');
const historyDropdown  = document.getElementById('historyDropdown');
const historyItemsList = document.getElementById('historyItemsList');
const historyEmpty     = document.getElementById('historyEmpty');
const clearHistoryBtn  = document.getElementById('clearHistoryBtn');

const CART_KEY    = 'khmerfood:cart';
const HISTORY_KEY = 'khmerfood:order-history';

let orderHistory = []; // array of { date: ISOString, items: [{name, qty, unitPrice}], total }


/* ---------------- storage helpers ---------------- */

async function saveCart() {
  try {
    await window.storage.set(CART_KEY, JSON.stringify(cart));
  } catch (err) {
    console.error('Failed to save cart:', err);
  }
}

async function loadCart() {
  try {
    const result = await window.storage.get(CART_KEY);
    if (result && result.value) {
      cart = JSON.parse(result.value);
    }
  } catch (err) {
    // key not found yet — that's fine, start with empty cart
    cart = {};
  }
}

async function saveHistory() {
  try {
    await window.storage.set(HISTORY_KEY, JSON.stringify(orderHistory));
  } catch (err) {
    console.error('Failed to save order history:', err);
  }
}

async function loadHistory() {
  try {
    const result = await window.storage.get(HISTORY_KEY);
    if (result && result.value) {
      orderHistory = JSON.parse(result.value);
    }
  } catch (err) {
    orderHistory = [];
  }
}


/* ---------------- formatting helpers ---------------- */

function parsePrice(priceText) {
  const match = priceText.replace(/\s/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}


/* ---------------- cart rendering ---------------- */

function renderCart() {
  cartItemsList.innerHTML = '';

  const keys = Object.keys(cart);

  if (keys.length === 0) {
    cartItemsList.appendChild(cartEmpty.cloneNode(true));
    cartTotal.textContent = 'Total: $0';
    cartCount.textContent = '0';
    return;
  }

  let total = 0;
  let totalQty = 0;

  keys.forEach(name => {
    const { qty, unitPrice } = cart[name];
    const itemTotal = qty * unitPrice;
    total += itemTotal;
    totalQty += qty;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <span class="cart-item-name">${name}</span>
      <div class="cart-item-qty">
        <button class="qty-btn" data-action="decrease" data-name="${name}">−</button>
        <span>${qty}</span>
        <button class="qty-btn" data-action="increase" data-name="${name}">+</button>
      </div>
      <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
    `;
    cartItemsList.appendChild(row);
  });

  cartTotal.textContent = `Total: $${total.toFixed(2)}`;
  cartCount.textContent = totalQty;

  cartItemsList.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name   = btn.dataset.name;
      const action = btn.dataset.action;
      if (action === 'increase') {
        cart[name].qty += 1;
      } else {
        cart[name].qty -= 1;
        if (cart[name].qty <= 0) delete cart[name];
      }
      renderCart();
      saveCart();
    });
  });
}


function addToCart(name, unitPrice) {
  if (cart[name]) {
    cart[name].qty += 1;
  } else {
    cart[name] = { qty: 1, unitPrice };
  }
  renderCart();
  saveCart();
}


function bindCardButton(btn) {
  const card      = btn.closest('.card1');
  const name      = card.querySelector('.title').textContent.trim();
  const priceText = card.querySelector('.price').textContent.trim();
  const unitPrice = parsePrice(priceText);

  btn.addEventListener('click', () => {
    addToCart(name, unitPrice);

    btn.textContent = '✓ Added!';
    btn.classList.add('added');
    setTimeout(() => {
      btn.textContent = 'Add to cart';
      btn.classList.remove('added');
    }, 1200);

    cartDropdown.classList.add('open');
  });
}

document.querySelectorAll('.btn-card').forEach(bindCardButton);


cartToggle.addEventListener('click', e => {
  e.stopPropagation();
  historyDropdown.classList.remove('open');
  cartDropdown.classList.toggle('open');
});


document.addEventListener('click', e => {
  if (!cartToggle.contains(e.target) && !cartDropdown.contains(e.target)) {
    cartDropdown.classList.remove('open');
  }
  if (!historyToggle.contains(e.target) && !historyDropdown.contains(e.target)) {
    historyDropdown.classList.remove('open');
  }
});


/* ---------------- order history rendering ---------------- */

function renderHistory() {
  historyItemsList.innerHTML = '';

  if (orderHistory.length === 0) {
    historyItemsList.appendChild(historyEmpty.cloneNode(true));
    return;
  }

  // newest first
  [...orderHistory].reverse().forEach(order => {
    const block = document.createElement('div');
    block.className = 'history-order';

    const lines = order.items
      .map(item => `
        <div class="history-order-line">
          <span>${item.name} x${item.qty}</span>
          <span>$${(item.qty * item.unitPrice).toFixed(2)}</span>
        </div>
      `)
      .join('');

    block.innerHTML = `
      <span class="history-order-date">${formatDate(order.date)}</span>
      ${lines}
      <div class="history-order-total">
        <span>Total</span>
        <span>$${order.total.toFixed(2)}</span>
      </div>
    `;
    historyItemsList.appendChild(block);
  });
}


historyToggle.addEventListener('click', e => {
  e.stopPropagation();
  cartDropdown.classList.remove('open');
  historyDropdown.classList.toggle('open');
});


clearHistoryBtn.addEventListener('click', async () => {
  orderHistory = [];
  renderHistory();
  await saveHistory();
});


/* ---------------- checkout ---------------- */

document.querySelector('.checkout-btn').addEventListener('click', async () => {
  if (Object.keys(cart).length === 0) {
    alert('Your cart is empty!');
    return;
  }

  const items = Object.entries(cart).map(([name, { qty, unitPrice }]) => ({
    name, qty, unitPrice
  }));

  const total = items.reduce((sum, { qty, unitPrice }) => sum + qty * unitPrice, 0);

  const summaryText = items
    .map(({ name, qty, unitPrice }) => `• ${name} x${qty} — $${(qty * unitPrice).toFixed(2)}`)
    .join('\n');

  alert(`🛒 Order Summary:\n\n${summaryText}\n\nTotal: $${total.toFixed(2)}\n\nThank you for your order!`);

  // record this order in history with a timestamp
  const order = {
    date: new Date().toISOString(),
    items,
    total
  };
  orderHistory.push(order);
  await saveHistory();
  renderHistory();

  // clear the live cart
  cart = {};
  renderCart();
  await saveCart();
  cartDropdown.classList.remove('open');
});


/* ---------------- mobile nav ---------------- */

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', e => {
    e.stopPropagation();
    navMenu.classList.toggle('open');
    menuToggle.classList.toggle('open');
  });

  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      menuToggle.classList.remove('open');
    });
  });

  document.addEventListener('click', e => {
    if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
      navMenu.classList.remove('open');
      menuToggle.classList.remove('open');
    }
  });
}


/* ---------------- category filter tabs ---------------- */

if (categoryTabs && menuGrid) {
  const cards = Array.from(menuGrid.querySelectorAll('.card1'));

  categoryTabs.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    categoryTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const category = btn.dataset.category;
    let visibleCount = 0;

    cards.forEach(card => {
      const matches = category === 'all' || card.dataset.category === category;
      card.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });

    if (noResults) {
      noResults.hidden = visibleCount !== 0;
    }
  });
}


document.querySelectorAll('.nav a[href="#"]').forEach((link, i) => {
  const targets = ['menu', null, null, null];
  if (targets[i]) {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector('.' + targets[i])
        ?.scrollIntoView({ behavior: 'smooth' });
    });
  }
});


const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity    = '1';
        entry.target.style.transform  = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.card1').forEach((card, i) => {
  card.style.opacity    = '0';
  card.style.transform  = 'translateY(24px)';
  card.style.transition = `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`;
  observer.observe(card);
});


(function typewriterHero() {
  const tagline = document.querySelector('.logo-sub');
  if (!tagline) return;
  const original = tagline.textContent;
  tagline.textContent = '';
  let idx = 0;
  const interval = setInterval(() => {
    tagline.textContent += original[idx];
    idx++;
    if (idx >= original.length) clearInterval(interval);
  }, 80);
})();


window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  if (window.scrollY > 10) {
    header.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
  } else {
    header.style.boxShadow = 'none';
  }
});


/* ---------------- init: load persisted data on page load ---------------- */

(async function init() {
  await Promise.all([loadCart(), loadHistory()]);
  renderCart();
  renderHistory();
})();