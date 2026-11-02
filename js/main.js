// ---------- Configuración ----------
const WHATSAPP_NUMBER = '51907997473'; // formato internacional, sin + (Perú = 51)
const PRICE = 7;          // S/ por té
const PROMO_QTY = 2;      // cada 2 tés...
const PROMO_PRICE = 12;   // ...cuestan S/ 12
const STORAGE_KEY = 'deltea-cart-v1';

const $ = id => document.getElementById(id);
const money = n => 'S/ ' + n.toFixed(2);

// ---------- Menú móvil ----------
const toggle = document.querySelector('.nav__toggle');
const menu = $('menu');
toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
menu.addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', false);
  }
});

// ---------- Contacto directo por WhatsApp ----------
document.querySelectorAll('[data-wa]').forEach(a => {
  a.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola Deltea, quisiera más información.')}`;
  a.target = '_blank';
  a.rel = 'noopener';
});

// ---------- Carrito ----------
let cart = {}; // { nombre: cantidad }
try { cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { cart = {}; }
const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch {} };

function totals() {
  const units = Object.values(cart).reduce((a, b) => a + b, 0);
  const regular = units * PRICE;
  const pairs = Math.floor(units / PROMO_QTY);
  const total = pairs * PROMO_PRICE + (units % PROMO_QTY) * PRICE;
  return { units, regular, pairs, total, discount: regular - total };
}

// Botón "Agregar" en cada tarjeta de té
document.querySelectorAll('.card').forEach(card => {
  const name = card.querySelector('h3').textContent.trim();
  const buy = document.createElement('div');
  buy.className = 'card__buy';
  buy.innerHTML = `<span class="price">${money(PRICE)}</span>`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn--small add';
  btn.textContent = 'Agregar';
  btn.addEventListener('click', () => {
    cart[name] = (cart[name] || 0) + 1;
    save(); render();
    btn.textContent = '¡Agregado! ✓';
    setTimeout(() => (btn.textContent = 'Agregar'), 1000);
  });
  buy.appendChild(btn);
  card.appendChild(buy);
});

function render() {
  const t = totals();
  const list = $('cartItems');
  list.replaceChildren();

  Object.entries(cart).forEach(([name, qty]) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'items__name';
    label.textContent = name;

    const ctl = document.createElement('div');
    ctl.className = 'qty';
    const mk = (txt, aria, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = txt; b.setAttribute('aria-label', `${aria} ${name}`);
      b.addEventListener('click', fn);
      return b;
    };
    const n = document.createElement('span');
    n.textContent = qty;
    ctl.append(
      mk('−', 'Quitar uno de', () => change(name, -1)),
      n,
      mk('+', 'Agregar uno de', () => change(name, 1))
    );

    const rm = mk('✕', 'Eliminar', () => change(name, -qty));
    rm.className = 'items__rm';
    li.append(label, ctl, rm);
    list.appendChild(li);
  });

  const has = t.units > 0;
  $('cartEmpty').hidden = has;
  $('cartTotals').hidden = !has;
  $('orderForm').hidden = !has;

  $('tSub').textContent = money(t.regular);
  $('tPromoRow').hidden = t.discount === 0;
  $('tPromo').textContent = '- ' + money(t.discount);
  $('tPromoLabel').textContent = `Promo ${PROMO_QTY} x S/ ${PROMO_PRICE}` + (t.pairs > 1 ? ` (×${t.pairs})` : '');
  $('tTotal').textContent = money(t.total);

  const hint = $('promoHint');
  const missing = PROMO_QTY - (t.units % PROMO_QTY);
  hint.hidden = !has || t.units % PROMO_QTY === 0;
  if (!hint.hidden) hint.textContent = `Agrega ${missing} té más y paga solo S/ ${PROMO_PRICE} por ${PROMO_QTY}.`;

  const count = $('cartCount');
  count.hidden = !has;
  count.textContent = t.units;
}

function change(name, delta) {
  cart[name] = (cart[name] || 0) + delta;
  if (cart[name] <= 0) delete cart[name];
  save(); render();
}

// ---------- Drawer ----------
const drawer = $('drawer');
const overlay = $('overlay');
let lastFocus = null;

function openCart() {
  lastFocus = document.activeElement;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  $('cartClose').focus();
}
function closeCart() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}
$('cartOpen').addEventListener('click', openCart);
$('cartOpen2').addEventListener('click', openCart);
$('cartClose').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeCart(); });

$('cartClear').addEventListener('click', () => { cart = {}; save(); render(); });

// ---------- Formulario y envío por WhatsApp ----------
const form = $('orderForm');
const delivery = () => form.elements.entrega.value === 'Delivery';
const syncDelivery = () => { $('deliveryFields').hidden = !delivery(); };
form.querySelectorAll('input[name=entrega]').forEach(r => r.addEventListener('change', syncDelivery));
syncDelivery();

form.addEventListener('submit', e => {
  e.preventDefault();
  const f = form.elements;
  const err = $('formError');
  const nombre = f.nombre.value.trim();
  const direccion = f.direccion.value.trim();
  const distrito = f.distrito.value.trim();

  const missing = [];
  if (!nombre) missing.push('tu nombre');
  if (delivery() && !direccion) missing.push('la dirección');
  if (delivery() && !distrito) missing.push('el distrito');
  if (missing.length) {
    err.textContent = 'Falta completar: ' + missing.join(', ') + '.';
    err.hidden = false;
    return;
  }
  err.hidden = true;

  const t = totals();
  if (!t.units) return;

  // Emojis por código (evita problemas de codificación del archivo).
  const E = c => String.fromCodePoint(c);
  // WhatsApp de Windows rompe emojis en los títulos "MI PEDIDO", "MIS DATOS" y "Comentarios":
  // ahí van sin emoji. En el resto se comprobó en un pedido real que 🍵 🔸 💰 🚚 📍 🏠 ✨ ❤️ ✅ llegan bien.
  const TEA = E(0x1F375), TRUCK = E(0x1F69A),
        PIN = E(0x1F4CD), HOME = E(0x1F3E0), MONEY = E(0x1F4B0),
        SPARK = E(0x2728), OK = E(0x2705), HEART = E(0x2764) + E(0xFE0F), DOT = E(0x1F538);
  const LINE = '━'.repeat(14);
  const lines = [
    `${TEA} *DELTEA · NUEVO PEDIDO* ${TEA}`,
    LINE,
    '',
    '*MI PEDIDO*',
    ...Object.entries(cart).map(([name, qty]) => `${DOT} ${qty} x ${name}`),
    '',
    `${MONEY} *RESUMEN*`,
    `Subtotal: ${money(t.regular)}`
  ];
  if (t.discount) lines.push(`${SPARK} Promo ${PROMO_QTY} x S/ ${PROMO_PRICE}: ahorras ${money(t.discount)}`);
  lines.push(`*TOTAL A PAGAR: ${money(t.total)}*`, '', '*MIS DATOS*', `*Nombre:* ${nombre}`,
             `${TRUCK} *Entrega:* ${f.entrega.value}`);
  if (delivery()) {
    lines.push(`${PIN} *Dirección:* ${direccion}`, `${HOME} *Distrito:* ${distrito}`);
    if (f.referencia.value.trim()) lines.push(`*Referencia:* ${f.referencia.value.trim()}`);
  }
  if (f.notas.value.trim()) lines.push(`*Comentarios:* _${f.notas.value.trim()}_`);
  lines.push('', LINE, `¡Gracias por elegir Deltea! ${HEART} Quedo atento(a) a la confirmación ${OK}`);

  // api.whatsapp.com conserva mejor los emojis que wa.me en WhatsApp para Windows.
  const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank', 'noopener');
});

render();
