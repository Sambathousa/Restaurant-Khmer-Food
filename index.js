
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

let orderHistory = []; 
let activeSelectedSize = 'M'; 

let currentModalPrices = { S: 0, M: 0, L: 0 };

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

  keys.forEach(cartKey => {
    const { qty, unitPrice, displayName } = cart[cartKey];
    const itemTotal = qty * unitPrice;
    total += itemTotal;
    totalQty += qty;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <span class="cart-item-name">${displayName}</span>
      <div class="cart-item-qty">
        <button class="qty-btn" data-action="decrease" data-key="${cartKey}">−</button>
        <span>${qty}</span>
        <button class="qty-btn" data-action="increase" data-key="${cartKey}">+</button>
      </div>
      <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
    `;
    cartItemsList.appendChild(row);
  });

  cartTotal.textContent = `Total: $${total.toFixed(2)}`;
  cartCount.textContent = totalQty;

  cartItemsList.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cartKey = btn.dataset.key;
      const action  = btn.dataset.action;
      if (action === 'increase') {
        cart[cartKey].qty += 1;
      } else {
        cart[cartKey].qty -= 1;
        if (cart[cartKey].qty <= 0) delete cart[cartKey];
      }
      renderCart();
      saveCart();
    });
  });
}

function addToCart(name, unitPrice, size = 'M') {

  const cartKey = `${name} (${size})`; 
  
  if (cart[cartKey]) {
    cart[cartKey].qty += 1;
  } else {
    cart[cartKey] = { 
      qty: 1, 
      unitPrice, 
      displayName: `${name} [${size}]` 
    };
  }
  renderCart();
  saveCart();
}

function bindCardButton(btn) {
  const card      = btn.closest('.card1');
  const name      = card.querySelector('.title').textContent.trim();
  const priceM    = parseFloat(card.dataset.priceM || parsePrice(card.querySelector('.price').textContent));

  btn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    addToCart(name, priceM, 'M'); 

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

function renderHistory() {
  historyItemsList.innerHTML = '';

  if (orderHistory.length === 0) {
    historyItemsList.appendChild(historyEmpty.cloneNode(true));
    return;
  }

  [...orderHistory].reverse().forEach(order => {
    const block = document.createElement('div');
    block.className = 'history-order';

    const lines = order.items
      .map(item => `
        <div class="history-order-line">
          <span>${item.displayName || item.name} x${item.qty}</span>
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

document.querySelector('.checkout-btn').addEventListener('click', async () => {
  if (Object.keys(cart).length === 0) {
    alert('Your cart is empty!');
    return;
  }

  const items = Object.entries(cart).map(([cartKey, { qty, unitPrice, displayName }]) => ({
    name: cartKey, displayName, qty, unitPrice
  }));

  const total = items.reduce((sum, { qty, unitPrice }) => sum + qty * unitPrice, 0);

  const summaryText = items
    .map(({ displayName, qty, unitPrice }) => `• ${displayName} x${qty} — $${(qty * unitPrice).toFixed(2)}`)
    .join('\n');

  alert(`🛒 Order Summary:\n\n${summaryText}\n\nTotal: $${total.toFixed(2)}\n\nThank you for your order!`);

  const order = {
    date: new Date().toISOString(),
    items,
    total
  };
  orderHistory.push(order);
  await saveHistory();
  renderHistory();

  cart = {};
  renderCart();
  await saveCart();
  cartDropdown.classList.remove('open');
});

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
}

document.addEventListener('click', e => {
  if (!cartToggle.contains(e.target) && !cartDropdown.contains(e.target)) {
    cartDropdown.classList.remove('open');
  }
  if (!historyToggle.contains(e.target) && !historyDropdown.contains(e.target)) {
    historyDropdown.classList.remove('open');
  }
  if (navMenu && menuToggle && !navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
    navMenu.classList.remove('open');
    menuToggle.classList.remove('open');
  }
});

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

document.querySelectorAll('.nav a').forEach(link => {
  const href = link.getAttribute('href');
  if (href && href.length > 1 && href.startsWith('#')) {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
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

const foodModal        = document.getElementById('foodModal');
const closeModalBtn    = document.querySelector('.close-modal');
const modalImg         = document.getElementById('modalImg');
const modalTag         = document.getElementById('modalTag');
const modalTitle       = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalPrice       = document.getElementById('modalPrice');
const modalAddToCartBtn = document.getElementById('modalAddToCartBtn');
const sizeButtons      = document.querySelectorAll('.size-opt-btn');

sizeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    sizeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeSelectedSize = btn.dataset.size;

    modalPrice.textContent = `Price: ${currentModalPrices[activeSelectedSize]}$`;
  });
});

document.querySelectorAll('.card1').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('.btn-card')) return;

    const title = card.querySelector('.title').textContent.trim();
    const tag = card.querySelector('.tag').textContent.trim();
    const desc = card.querySelector('.describtion').textContent.trim();
    const imgSrc = card.querySelector('.image-card1 img').src;

    const baseM = parsePrice(card.querySelector('.price').textContent);
    currentModalPrices.S = card.dataset.priceS ? card.dataset.priceS : (baseM * 0.8).toFixed(2);
    currentModalPrices.M = card.dataset.priceM ? card.dataset.priceM : baseM.toFixed(2);
    currentModalPrices.L = card.dataset.priceL ? card.dataset.priceL : (baseM * 1.2).toFixed(2);

    modalTitle.textContent = title;
    modalTag.textContent = tag;
    modalDescription.textContent = desc;
    modalImg.src = imgSrc;

    activeSelectedSize = 'M';
    modalPrice.textContent = `Price: ${currentModalPrices['M']}$`;
    
    sizeButtons.forEach(b => {
      if(b.dataset.size === 'M') b.classList.add('active');
      else b.classList.remove('active');
    });

    foodModal.classList.add('open');
  });
});

modalAddToCartBtn.addEventListener('click', () => {
  const currentItemName = modalTitle.textContent;
  const currentItemPrice = parseFloat(currentModalPrices[activeSelectedSize]);

  addToCart(currentItemName, currentItemPrice, activeSelectedSize); 
  
  modalAddToCartBtn.textContent = '✓ Added!';
  setTimeout(() => {
    modalAddToCartBtn.textContent = 'Add Selected to Cart';
    foodModal.classList.remove('open');
  }, 800);
  
  cartDropdown.classList.add('open');
});

closeModalBtn.addEventListener('click', () => {
  foodModal.classList.remove('open');
});

window.addEventListener('click', (e) => {
  if (e.target === foodModal) {
    foodModal.classList.remove('open');
  }
});

(async function init() {
  await Promise.all([loadCart(), loadHistory()]);
  renderCart();
  renderHistory();
})();