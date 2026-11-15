"""End-to-end test in a real browser: guest order, admin publish/handling, verified-customer loyalty, no browser storage.
Run:  node /tmp/e2e-server.mjs dist &   then   python3 tests/e2e.py
"""
import json, sys, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:4173'
fails = []
def check(label, cond, detail=''):
    print(('  ✓ ' if cond else '  ✗ FAIL: ') + label + ('' if cond else f'  {detail}'))
    if not cond: fails.append(label)

def storage_state(pg):
    return pg.evaluate("""async () => {
        const dbs = indexedDB.databases ? await indexedDB.databases() : [];
        return {local: localStorage.length, session: sessionStorage.length, idb: dbs.length,
                jsCookies: document.cookie};
    }""")

def api_json(pg, path):
    return pg.evaluate("async (p) => (await fetch(p, {cache:'no-store'})).json()", path)

def otp_code():
    return json.load(urllib.request.urlopen(BASE + '/__test/otp'))

with sync_playwright() as p:
    b = p.chromium.launch()
    errors = []
    csp = []
    def watch(pg):
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: csp.append(m.text) if 'Content Security Policy' in m.text else None)
    def ctx(): 
        c = b.new_context(viewport={'width': 430, 'height': 900}); c.on('page', watch); return c

    # ---------- 1. Admin first-run setup through the UI ----------
    print('\n1) Owner creates the admin account (setup code) and the site publishes to the server')
    adminc = ctx(); admin = adminc.new_page(); watch(admin)
    admin.goto(BASE); admin.wait_for_timeout(1200)
    check('server has nothing published yet', api_json(admin, '/api/content')['content'] is None)
    admin.get_by_label('أيقونة إدارة المطعم').click()
    admin.get_by_text('دخول إدارة المطعم').click()
    admin.wait_for_timeout(600)
    pw = admin.locator('input[type=password]')
    pw.nth(0).fill('E2E-SETUP-1')
    admin.locator('input[name="leil-admin-user"]').fill('owner1')
    admin.locator('form input[maxlength="40"]').fill('المالك')
    pw.nth(1).fill('Strong#Pass9'); pw.nth(2).fill('Strong#Pass9')
    admin.get_by_role('button', name='إنشاء الحساب والدخول').click()
    admin.wait_for_timeout(1500)
    me = api_json(admin, '/api/me')
    check('owner is signed in (server cookie)', (me.get('user') or {}).get('username') == 'owner1', me)
    content = None
    for _ in range(30):                      # wait (up to 15s) for the automatic first publish
        content = api_json(admin, '/api/content')['content']
        if content: break
        admin.wait_for_timeout(500)
    admin.wait_for_timeout(800)              # let the one-time legacy cleanup finish
    check('site content was published automatically', bool(content) and len(content['menu']) > 0)
    st = storage_state(admin)
    check('admin browser stores NOTHING (localStorage/sessionStorage/IndexedDB empty)', st['local'] == 0 and st['session'] == 0 and st['idb'] == 0, st)
    check('session cookie is not readable by JavaScript', 'leil_' not in st['jsCookies'], st)

    # ---------- 2. Admin edit is visible to a different visitor ----------
    print('\n2) An admin edit appears for customers without any browser storage')
    admin.get_by_label('أيقونة إدارة المطعم').click()
    admin.get_by_text('تخصيص الهوية والشعار').click()
    admin.wait_for_timeout(500)
    admin.get_by_text('الشعار والهوية').first.click()
    admin.wait_for_timeout(400)
    admin.get_by_text('عبارة الحقوق:').locator('xpath=following-sibling::input').fill('كل الحقوق لمطعم ليل — E2E')
    admin.get_by_text('حفظ وتطبيق التغييرات فوراً').click()
    admin.wait_for_timeout(3000)
    guestc = ctx(); guest = guestc.new_page(); watch(guest)
    guest.goto(BASE); guest.wait_for_timeout(1500)
    check('a brand-new visitor sees the edited footer text', guest.get_by_text('كل الحقوق لمطعم ليل — E2E').count() > 0)
    check('guest browser stores nothing', all(v == 0 for k, v in storage_state(guest).items() if k != 'jsCookies'), storage_state(guest))

    # ---------- 3. Guest places an order ----------
    print('\n3) A guest places an order; it reaches the admin panel')
    guestc.on('page', lambda pg: pg.close() if 'wa.me' in pg.url or 'whatsapp' in pg.url else None)
    guest.get_by_text('أضف للسلة').first.click(); guest.wait_for_timeout(800)
    # open cart
    guest.locator('button:has-text("₪")').first.click(); guest.wait_for_timeout(600)
    guest.get_by_text('متابعة إتمام الطلب').click(); guest.wait_for_timeout(600)
    guest.locator('input[placeholder="مثال: أحمد عبد الله"]').fill('أحمد الزبون')
    guest.locator('input[placeholder="0593965358"]').fill('0561234567')
    guest.locator('textarea').first.fill('خاراس، شارع المدرسة، الطابق الثاني')
    guest.get_by_role('button', name='تأكيد الطلب وإرساله لواتساب المطعم', exact=False).click()
    guest.wait_for_timeout(2500)
    orders = api_json(admin, '/api/orders')['orders']
    check('the order is stored on the server', len(orders) == 1 and orders[0]['customer']['fullName'] == 'أحمد الزبون', orders)
    order_id = orders[0]['orderId'] if orders else ''
    check('guest earned no points (not verified)', orders and orders[0]['pointsEarned'] == 0)
    check('guest browser still stores nothing after ordering', all(v == 0 for k, v in storage_state(guest).items() if k != 'jsCookies'), storage_state(guest))

    # admin sees it in the panel (poll) and completes it
    admin.wait_for_timeout(500)
    admin.get_by_label('أيقونة إدارة المطعم').click()
    admin.get_by_text('لوحة تحكم الإدارة الكاملة').click(); admin.wait_for_timeout(500)
    admin.get_by_text('الطلبات (', exact=False).first.click()
    try:
        admin.get_by_text(order_id).first.wait_for(timeout=15000)   # background polling (every 8s) delivers it
    except Exception:
        pass
    check('admin panel lists the customer order (live polling, no refresh)', admin.get_by_text(order_id).count() > 0, order_id)
    admin.get_by_text('كمكتمل ✓').first.click(); admin.wait_for_timeout(1500)
    check('order marked completed on the server', api_json(admin, '/api/orders')['orders'][0]['status'] == 'completed')

    # guest tracking by order number + phone
    guest.reload(); guest.wait_for_timeout(1200)
    guest.locator('button', has_text='تتبع طلباتي').first.dispatch_event('click'); guest.wait_for_timeout(500)
    guest.get_by_test_id('track-id').fill(order_id); guest.get_by_test_id('track-phone').fill('0561234567')
    guest.get_by_test_id('track-btn').click(); guest.wait_for_timeout(800)
    check('guest can track the order and sees it completed', 'مكتمل' in (guest.get_by_test_id('track-result').inner_text() if guest.get_by_test_id('track-result').count() else ''))
    guest.get_by_test_id('track-phone').fill('0599999999'); guest.get_by_test_id('track-btn').click(); guest.wait_for_timeout(600)
    check('wrong phone number does not reveal the order', guest.get_by_text('لم نجد طلباً بهذه البيانات').count() > 0)
    # loyalty / customer accounts are OFF by default
    guest.reload(); guest.wait_for_timeout(1200)
    check('default: customer accounts & loyalty are switched off on the server', api_json(guest, '/api/status')['customerLoginEnabled'] is False)
    check('default: no loyalty points badge in the header', guest.locator('[title*="رصيد نقاط الولاء"]').count() == 0)
    guest.locator('button', has_text='تتبع طلباتي').first.dispatch_event('click'); guest.wait_for_timeout(500)
    check('default: only order tracking is offered (no phone-code login box)', guest.get_by_test_id('send-code').count() == 0 and guest.get_by_test_id('track-btn').count() == 1)
    guestc.close()

    # the owner switches the feature on from the admin panel
    print('\n3b) Owner switches customer accounts & loyalty on from the admin panel')
    admin.reload(); admin.wait_for_timeout(1500)
    admin.get_by_label('أيقونة إدارة المطعم').click()
    admin.get_by_text('تخصيص الهوية والشعار').click(); admin.wait_for_timeout(400)
    admin.locator('button', has_text='نقاط الولاء').first.click(); admin.wait_for_timeout(400)
    admin.get_by_label('تفعيل حسابات الزبائن ونقاط الولاء').check()
    admin.get_by_text('حفظ وتطبيق التغييرات فوراً').click(); admin.wait_for_timeout(3000)
    check('the switch is saved on the server', api_json(admin, '/api/status')['customerLoginEnabled'] is True)

    # ---------- 4. Verified customer: phone code, points on the server ----------
    print('\n4) Verified customer: phone code login, points credited on completion, nothing stored locally')
    custc = ctx(); cust = custc.new_page(); watch(cust)
    custc.on('page', lambda pg: pg.close() if 'wa.me' in pg.url or 'whatsapp' in pg.url else None)
    cust.goto(BASE); cust.wait_for_timeout(1200)
    cust.locator('button', has_text='تتبع طلباتي').first.dispatch_event('click'); cust.wait_for_timeout(500)
    cust.get_by_test_id('login-phone').fill('0593965358'); cust.get_by_test_id('send-code').click(); cust.wait_for_timeout(800)
    code = otp_code()
    check('a code was sent to the +970 number', code and code['phone'] == '+970593965358', code)
    cust.get_by_test_id('login-code').fill('000000'); cust.get_by_test_id('verify-code').click(); cust.wait_for_timeout(700)
    check('wrong code is rejected', cust.get_by_text('رمز التحقق غير صحيح').count() > 0)
    cust.get_by_test_id('login-code').fill(code['code']); cust.get_by_test_id('verify-code').click(); cust.wait_for_timeout(1000)
    check('signed in: points panel is shown', cust.get_by_text('نقطة · مستوى').count() > 0)
    st = storage_state(cust)
    check('customer browser stores nothing after sign-in', st['local'] == 0 and st['session'] == 0 and st['idb'] == 0, st)
    check('customer cookie is HttpOnly', 'leil_cust' not in st['jsCookies'])
    cust.reload(); cust.wait_for_timeout(1200)
    check('login survives a reload (server cookie)', api_json(cust, '/api/customer/me')['customer'] is not None)

    # close modal, order again as the verified customer
    cust.locator('button:has(svg.lucide-x)').first.click(); cust.wait_for_timeout(400)
    cust.get_by_text('أضف للسلة').first.click(); cust.wait_for_timeout(700)
    cust.locator('button:has-text("₪")').first.click(); cust.wait_for_timeout(500)
    cust.get_by_text('متابعة إتمام الطلب').click(); cust.wait_for_timeout(500)
    check('checkout pre-fills and locks the verified phone number', cust.locator('input[placeholder="0593965358"]').input_value() == '0593965358' and cust.locator('input[placeholder="0593965358"]').get_attribute('readonly') is not None)
    cust.locator('input[placeholder="مثال: أحمد عبد الله"]').fill('سامي')
    cust.locator('textarea').first.fill('خاراس، قرب المسجد، الطابق الأول')
    cust.get_by_role('button', name='تأكيد الطلب وإرساله لواتساب المطعم', exact=False).click(); cust.wait_for_timeout(2500)
    my = api_json(cust, '/api/customer/orders')['orders']
    check('the order is linked to the verified customer', len(my) == 1 and my[0]['customerPhone'] == '970593965358', my)
    pts = my[0]['pointsEarned'] if my else 0
    check('points are pending until completion', pts > 0 and api_json(cust, '/api/customer/me')['customer']['points'] == 0)

    admin.reload(); admin.wait_for_timeout(1500)
    admin.get_by_label('أيقونة إدارة المطعم').click(); admin.get_by_text('لوحة تحكم الإدارة الكاملة').click(); admin.wait_for_timeout(400)
    admin.get_by_text('الطلبات (', exact=False).first.click(); admin.wait_for_timeout(1000)
    admin.get_by_text('كمكتمل ✓').first.click(); admin.wait_for_timeout(1500)
    me2 = api_json(cust, '/api/customer/me')['customer']
    check('after completion the points are credited on the server', me2['points'] == pts and me2['ordersCount'] == 1, me2)

    # ---------- 5. Session safety ----------
    print('\n5) Session safety')
    admin.reload(); admin.wait_for_timeout(1500)
    check('admin login survives a reload (server cookie)', (api_json(admin, '/api/me').get('user') or {}).get('username') == 'owner1')
    admin.get_by_label('أيقونة إدارة المطعم').click(); admin.wait_for_timeout(300)
    admin.get_by_text('تسجيل خروج من الإدارة').click(); admin.wait_for_timeout(1200)
    check('after logout the server no longer recognises the browser', api_json(admin, '/api/me')['user'] is None)
    check('and the orders API now refuses', admin.evaluate("async () => (await fetch('/api/orders')).status") == 401)
    # a page script cannot forge a cross-site write
    forged = admin.evaluate("async () => (await fetch('/api/content', {method:'PUT', headers:{'content-type':'application/json'}, body:'{}'})).status")
    check('unauthenticated write is refused', forged in (401, 403), forged)

    real_errors = [e for e in errors if 'ERR_NAME_NOT_RESOLVED' not in e]
    check('no JavaScript runtime errors on any page', not real_errors, real_errors[:3])
    check('strict Content-Security-Policy is never violated by the app', not csp, csp[:2])
    b.close()

print('\nALL PASSED' if not fails else f'\n{len(fails)} FAILED: {fails}')
sys.exit(1 if fails else 0)
