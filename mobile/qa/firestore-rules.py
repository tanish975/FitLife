#!/usr/bin/env python3
"""Exercise owner-only rules against the *local* Firestore emulator, never production."""
import base64, json, os, sys, time, urllib.error, urllib.request
host = os.environ.get('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8188')
if host.split(':')[0] not in ('127.0.0.1', 'localhost', '::1'):
    raise SystemExit('Refusing to run destructive rules tests against a non-local server.')
project = 'demo-fitlife'
base = f'http://{host}/v1/projects/{project}/databases/(default)/documents'

def b64(obj):
    return base64.urlsafe_b64encode(json.dumps(obj, separators=(',', ':')).encode()).decode().rstrip('=')
def token(uid):
    now = int(time.time())
    payload = {'iss': f'https://securetoken.google.com/{project}', 'aud': project, 'sub': uid, 'user_id': uid,
               'iat': now, 'exp': now + 3600, 'auth_time': now, 'firebase': {'sign_in_provider': 'google.com'}}
    return b64({'alg': 'none', 'typ': 'JWT'}) + '.' + b64(payload) + '.'
def request(method, suffix, uid=None, body=None):
    headers = {'Content-Type': 'application/json'}
    if uid: headers['Authorization'] = 'Bearer ' + token(uid)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + suffix, method=method, headers=headers, data=data)
    try:
        with urllib.request.urlopen(req, timeout=20) as response: return response.status, response.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()
def path(uid, device): return f'projects/{project}/databases/(default)/documents/users/{uid}/devices/{device}'
def write(uid, device, who, schema=1, payload='{"schema":1}', extra=None, omit=None):
    fields = {'schema': {'integerValue': str(schema)}, 'payload': {'stringValue': payload}}
    if extra: fields.update(extra)
    if omit: fields.pop(omit)
    return request('POST', ':commit', who, {'writes': [{'update': {'name': path(uid, device), 'fields': fields}}]})
def check(label, expected, outcome):
    code, body = outcome
    if code not in expected:
        raise AssertionError(f'{label}: expected {expected}, got {code}: {body[:500]}')
    print('PASS', label, code)
a, b = 'alice', 'bob'
device = 'a' * 32
check('owner can list a previously empty account', (200,), request('GET', '/users/emptyaccount/devices?pageSize=11', 'emptyaccount'))
check('anonymous cannot create', (403,), write(a, device, None))
check('anonymous cannot list', (403,), request('GET', f'/users/{a}/devices?pageSize=11'))
check('owner creates own snapshot through REST commit', (200,), write(a, device, a))
check('owner can read own snapshot', (200,), request('GET', f'/users/{a}/devices/{device}', a))
check('owner can list own snapshots', (200,), request('GET', f'/users/{a}/devices?pageSize=11', a))
check('other account cannot read', (403,), request('GET', f'/users/{a}/devices/{device}', b))
check('other account cannot list', (403,), request('GET', f'/users/{a}/devices?pageSize=11', b))
check('other account cannot overwrite', (403,), write(a, device, b, payload='attacker'))
check('other account can create its own', (200,), write(b, 'b'*32, b))
check('invalid device id rejected', (403,), write(a, 'not-an-id', a))
check('wrong schema rejected', (403,), write(a, device, a, schema=2))
check('missing payload rejected', (403,), write(a, device, a, omit='payload'))
check('non-string payload rejected', (403,), request('POST', ':commit', a, {'writes': [{'update': {'name':path(a, device),'fields':{'schema':{'integerValue':'1'},'payload':{'integerValue':'123'}}}}]}))
check('extra data field rejected', (403,), write(a, device, a, extra={'admin': {'booleanValue': True}}))
check('oversized payload rejected', (403,), write(a, device, a, payload='x'*500001))
check('owner cannot delete device document directly', (403,), request('POST', ':commit', a, {'writes': [{'delete': path(a, device)}]}))
check('other database paths denied', (403,), request('GET', '/private/secrets', a))
print('All owner, isolation, schema, size and delete rules passed in the Firestore emulator.')
