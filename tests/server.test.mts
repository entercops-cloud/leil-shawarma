import { World, check, section, done } from './harness.mts';

const w = new World();
const admin = w.client('10.0.0.1');
const guest = w.client('20.0.0.1');
const cust = w.client('30.0.0.1');

const menu = [
  { id: 'm1', name: 'شاورما', nameEn: 's', description: '', price: 20, categoryId: 'c', image: '/x', isAvailable: true,
    options: { sizes: [{ name: 'عادي', priceDelta: 0 }, { name: 'كبير', priceDelta: 5 }], breads: ['صاج'], extras: [{ id: 'e1', name: 'جبنة', price: 3 }] } },
];
const offers: any[] = [];
const customization = {
  branding: {}, colors: {}, texts: {},
  payments: { cardEnabled: false, walletEnabled: false },
  loyalty: { enabled: true, pointsPerShekel: 1, includeDeliveryFee: false, awardOn: 'completed' },
  ordering: { minOrder: 0, deliveryRegions: [{ id: 'r1', name: 'خاراس', fee: 4 }] },
};
const item = (q = 2) => ({ cartItemId: 'm1-d', quantity: q, menuItem: { id: 'm1' }, options: { size: 'كبير', bread: 'صاج', extras: ['e1'], unitPrice: 1 } });
const orderBody = (phone: string, extra: any = {}) => ({
  items: [item()], pointsRedeemed: 0,
  customer: { fullName: 'أحمد', phoneNumber: phone, orderType: 'delivery', address: 'شارع المدرسة', neighborhood: 'خاراس', notes: '', paymentMethod: 'cash' },
  ...extra,
});

section('Admin sessions are HttpOnly cookies (nothing readable by page JS)');
let r = await admin.call('POST', '/api/setup', { setupCode: 'SETUP-CODE-9', username: 'owner1', displayName: 'المالك', password: 'Strong#Pass9' });
check('setup ok', r.status === 200);
check('response body has no token', !JSON.stringify(r.body).includes('token'));
const sc = r.setCookies[0] || '';
check('cookie is HttpOnly + Secure + SameSite=Strict', /HttpOnly/.test(sc) && /Secure/.test(sc) && /SameSite=Strict/.test(sc), sc);
check('/me works with the cookie', (await admin.call('GET', '/api/me')).body.user?.username === 'owner1');
check('/me without cookie => null (no error)', (await guest.call('GET', '/api/me')).body.user === null);

section('CSRF protection');
check('write without Origin rejected', (await admin.call('PUT', '/api/content', { menu, offers, customization }, { origin: '' })).status === 403);
check('write from another site rejected', (await admin.call('PUT', '/api/content', { menu, offers, customization }, { origin: 'https://evil.test' })).status === 403);
check('same-site write accepted', (await admin.call('PUT', '/api/content', { menu, offers, customization })).status === 200);

section('Idle timeout is enforced by the server');
w.clock += 20 * 60_000;
check('background GET polling works within idle window', (await admin.call('GET', '/api/orders')).status === 200);
w.clock += 20 * 60_000; // 40 min since last real action; polling must NOT have extended the session
check('session expired after 30 min of no real activity (polling does not extend)', (await admin.call('GET', '/api/orders')).status === 401);
r = await admin.call('POST', '/api/login', { username: 'owner1', password: 'Strong#Pass9' });
check('login again', r.status === 200);
w.clock += 20 * 60_000;
check('activity ping extends the session', (await admin.call('POST', '/api/me/ping', {})).status === 200);
w.clock += 20 * 60_000;
check('still signed in 40 min later thanks to the ping', (await admin.call('GET', '/api/me')).body.user !== null);

section('Customer phone verification');
check('non-Palestinian number rejected (SMS-pumping guard)', (await cust.call('POST', '/api/customer/otp/start', { phone: '+14155550123' })).status === 400);
check('garbage number rejected', (await cust.call('POST', '/api/customer/otp/start', { phone: 'abc' })).status === 400);
check('start ok (local format)', (await cust.call('POST', '/api/customer/otp/start', { phone: '0593965358' })).status === 200);
check('code sent to normalized +970 number', w.otp.sent[0]?.phone === '+970593965358', w.otp.sent);
check('wrong code rejected', (await cust.call('POST', '/api/customer/otp/verify', { phone: '0593965358', code: '000000' })).status === 401);
check('not logged in yet', (await cust.call('GET', '/api/customer/me')).body.customer === null);
r = await cust.call('POST', '/api/customer/otp/verify', { phone: '+970 593 965 358', code: w.otp.sent[0].code });
check('verify ok => HttpOnly customer cookie', r.status === 200 && /leil_cust=.*HttpOnly/.test(r.setCookies[0] || ''), r.setCookies);
check('customer starts with 0 points', (await cust.call('GET', '/api/customer/me')).body.customer?.points === 0);
for (let i = 0; i < 2; i++) await cust.call('POST', '/api/customer/otp/start', { phone: '0593965358' });
check('4th code request within an hour is rate limited', (await cust.call('POST', '/api/customer/otp/start', { phone: '0593965358' })).status === 429);

section('Orders: server prices, guest vs verified customer');
let o = await guest.call('POST', '/api/orders', orderBody('0593965358'));
check('guest order accepted with server price 28*2+4=60', o.status === 200 && o.body.order.total === 60, o.body);
check('guest order earns no points', o.body.order.pointsEarned === 0 && !o.body.order.customerPhone);
check('guest cannot redeem points', (await guest.call('POST', '/api/orders', orderBody('0593965358', { pointsRedeemed: 50 }))).status === 400);
const guestId = o.body.order.orderId;

o = await cust.call('POST', '/api/orders', orderBody('0593965358'));
check('verified customer order is linked and will earn 56 points', o.status === 200 && o.body.order.customerPhone === '970593965358' && o.body.order.pointsEarned === 56, o.body.order);
const id1 = o.body.order.orderId;
check('no points before completion', (await cust.call('GET', '/api/customer/me')).body.customer.points === 0);
o = await cust.call('POST', '/api/orders', orderBody('0561234567'));
check('other phone number on the order => not linked (no loyalty)', o.body.order.pointsEarned === 0 && !o.body.order.customerPhone);

section('Loyalty is settled on the server when the order is completed');
check('customer cannot change an order status', (await cust.call('PATCH', '/api/orders/' + id1, { status: 'completed' })).status === 401);
check('admin: preparing', (await admin.call('PATCH', '/api/orders/' + id1, { status: 'preparing' })).status === 200);
check('still no points while preparing', (await cust.call('GET', '/api/customer/me')).body.customer.points === 0);
check('admin: completed', (await admin.call('PATCH', '/api/orders/' + id1, { status: 'completed' })).status === 200);
let me = (await cust.call('GET', '/api/customer/me')).body.customer;
check('56 points credited, 1 order, tier updated', me.points === 56 && me.ordersCount === 1 && me.totalSpent === 60, me);
await admin.call('PATCH', '/api/orders/' + id1, { status: 'completed' });
check('completing twice does not double-credit', (await cust.call('GET', '/api/customer/me')).body.customer.points === 56);

section('Redeeming points (verified, balance checked on the server)');
check('cannot redeem more than the balance', (await cust.call('POST', '/api/orders', orderBody('0593965358', { pointsRedeemed: 100 }))).status === 400);
check('admin sets balance to 120 for this phone', (await admin.call('PATCH', '/api/customers/970593965358', { points: 120 })).body.customer.points === 120);
o = await cust.call('POST', '/api/orders', orderBody('0593965358', { pointsRedeemed: 50 }));
check('redeem 50 => -5 ₪, balance 70 immediately', o.status === 200 && o.body.order.pointsDiscount === 5 && o.body.customer.points === 70, o.body);
const id2 = o.body.order.orderId;
await admin.call('PATCH', '/api/orders/' + id2, { status: 'cancelled' });
check('cancelling returns the 50 redeemed points', (await cust.call('GET', '/api/customer/me')).body.customer.points === 120);
await admin.call('PATCH', '/api/orders/' + id1, { status: 'cancelled' });
check('cancelling a completed order reverses its 56 points', (await cust.call('GET', '/api/customer/me')).body.customer.points === 64);

section('awardOn = placed credits immediately');
await admin.call('PUT', '/api/content', { menu, offers, customization: { ...customization, loyalty: { ...customization.loyalty, awardOn: 'placed' } } });
o = await cust.call('POST', '/api/orders', orderBody('0593965358'));
check('credited at placement (64+56=120)', o.body.customer.points === 120, o.body.customer);
await admin.call('PUT', '/api/content', { menu, offers, customization });

section('Customer history & guest tracking');
const mine = (await cust.call('GET', '/api/customer/orders')).body.orders;
check('customer sees only their own linked orders', mine.length >= 3 && mine.every((x: any) => x.customerPhone === '970593965358'), mine.map((x: any) => x.orderId));
check('history requires login', (await guest.call('GET', '/api/customer/orders')).status === 401);
check('guest lookup: right order+phone', (await guest.call('GET', `/api/orders/lookup?orderId=${guestId}&phone=0593965358`)).body.status === 'pending');
check('guest lookup: wrong phone => 404', (await guest.call('GET', `/api/orders/lookup?orderId=${guestId}&phone=0561111111`)).status === 404);
await cust.call('POST', '/api/customer/logout', {});
check('logout clears the session', (await cust.call('GET', '/api/customer/me')).body.customer === null);

section('Media library on the server');
const png = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(30)]).toString('base64');
check('upload requires admin', (await guest.call('POST', '/api/media', { dataUrl: png, library: true })).status === 401);
const up = await admin.call('POST', '/api/media', { dataUrl: png, library: true, name: 'شعار.png' });
check('admin upload returns permanent url + library item', up.status === 200 && up.body.url.startsWith('/api/media/') && up.body.item.name === 'شعار.png', up.body);
check('library lists it', (await admin.call('GET', '/api/media')).body.items.length === 1);
check('image is publicly served', (await guest.call('GET', up.body.url)).status === 200);
check('content-publish uploads do not clutter the library', ((await admin.call('POST', '/api/media', { dataUrl: png.replace('AAAA', 'BBBB') + 'AA' })).status === 200) && (await admin.call('GET', '/api/media')).body.items.length === 1);
await admin.call('DELETE', '/api/media/' + up.body.id);
check('delete removes from library list', (await admin.call('GET', '/api/media')).body.items.length === 0);

section('Reviews & users (regression)');
const rv = await guest.call('POST', '/api/reviews', { itemId: 'm1', rating: 5, userName: 'سامي', comment: 'ممتاز' });
check('guest can review', rv.status === 200);
check('guest cannot delete review', (await guest.call('DELETE', '/api/reviews/' + rv.body.review.id)).status === 401);
check('admin can delete review', (await admin.call('DELETE', '/api/reviews/' + rv.body.review.id)).status === 200);
check('add manager', (await admin.call('POST', '/api/users', { username: 'mgr1', displayName: 'م', password: 'Mgr#Pass123', role: 'manager' })).status === 200);
const mgr = w.client('40.0.0.1');
check('manager login', (await mgr.call('POST', '/api/login', { username: 'mgr1', password: 'Mgr#Pass123' })).status === 200);
check('manager cannot list users', (await mgr.call('GET', '/api/users')).status === 403);
check('manager can edit content', (await mgr.call('PUT', '/api/content', { menu, offers, customization })).status === 200);
const list = (await admin.call('GET', '/api/users')).body.users;
await admin.call('PATCH', '/api/users/' + list.find((u: any) => u.username === 'mgr1').id, { disabled: true });
check('disabling a user kills their session immediately', (await mgr.call('GET', '/api/orders')).status === 401);

section('Brute force lockout');
const atk = w.client('66.6.6.6');
let last: any;
for (let i = 0; i < 5; i++) last = await atk.call('POST', '/api/login', { username: 'owner1', password: 'Wrong#Pass1' });
check('locked after 5 wrong passwords', last.body.retryAfter > 0, last.body);
check('even the correct password is refused while locked', (await atk.call('POST', '/api/login', { username: 'owner1', password: 'Strong#Pass9' })).status === 429);

section('Accounts & loyalty are OFF until the owner switches them on');
w.otpEnabled = true;
await admin.call('PUT', '/api/content', { menu, offers, customization: { ...customization, loyalty: { ...customization.loyalty, enabled: false } } });
const stOff = (await guest.call('GET', '/api/status')).body;
check('status: verification exists but the feature is switched off', stOff.verificationAvailable === true && stOff.customerLoginEnabled === false, stOff);
check('otp start refused while switched off', (await guest.call('POST', '/api/customer/otp/start', { phone: '0561112223' })).status === 503);
await admin.call('PUT', '/api/content', { menu, offers, customization });
check('switching it on enables customer login', (await guest.call('GET', '/api/status')).body.customerLoginEnabled === true);

section('Customer login disabled when no verification method is connected');
w.otpEnabled = false;
check('status says disabled even when switched on', (await guest.call('GET', '/api/status')).body.customerLoginEnabled === false && (await guest.call('GET', '/api/status')).body.verificationAvailable === false);
check('otp start => 503', (await guest.call('POST', '/api/customer/otp/start', { phone: '0593965358' })).status === 503);
done();
