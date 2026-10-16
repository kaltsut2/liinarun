"""Hahmomallien pakkaus pelikäyttöön.

    python3 tyokalut/pakkaa_glb.py 3dmallit/nimi.glb 3dmallit/nimi_pakattu.glb [--harvenna 0.7]

Tekee kaksi asiaa, joita three.js:n GLTFLoader tukee ilman lisäkirjastoja:
1. yhdistää identtiset kärkipisteet ja indeksoi kolmiot (vientityökalu
   tallentaa jokaisen kolmion kulman erikseen),
2. tallentaa sijainnit 16-bittisinä ja normaalit 8-bittisinä lukuina
   (KHR_mesh_quantization).

Solmuhierarkia, nimet ja nivelet säilyvät. Kvantisoinnin purku siirtyy
mesh-solmun matriisiin tasaisella skaalalla, jotta normaalit pysyvät oikein.
Tarvitsee numpyn (pip install numpy).

--harvenna X poistaa osuuden X kolmioista isoista (yli 20 000 kolmiota),
pehmeästi varjostetuista ja kuviottomista osista, kuten hiuksista.
Tasaisesti varjostettuja osia (terävät särmät) ei kosketa, koska
harvennus pyöristäisi niiden särmät. Tarvitsee fast-simplification-paketin.
"""
import json, struct, sys
import numpy as np

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def lue(src):
    b = open(src, 'rb').read()
    l = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + l])
    o = 20 + l
    bl = struct.unpack('<I', b[o:o + 4])[0]
    return j, b[o + 8:o + 8 + bl]


def accessor(j, binb, i):
    a = j['accessors'][i]
    bv = j['bufferViews'][a['bufferView']]
    dt = np.dtype(CT[a['componentType']])
    n = NC[a['type']]
    stride = bv.get('byteStride', dt.itemsize * n)
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    base = np.frombuffer(binb, dtype=np.uint8)
    rivit = np.lib.stride_tricks.as_strided(base[start:], shape=(a['count'], dt.itemsize * n), strides=(stride, 1))
    arr = rivit.copy().view(dt).reshape(a['count'], n)
    if a.get('normalized'):
        arr = np.maximum(arr.astype(np.float32) / np.iinfo(dt).max, -1)
    return arr


def mat_trs(n):
    if 'matrix' in n:
        return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t
    return M


def harvenna(P, idx, osuus, nimi=''):
    """Pehmeän pinnan harvennus: yhdistää kärjet sijainnin mukaan,
    harventaa ja laskee pehmeät normaalit uudelleen. Palauttaa None,
    jos pinta on tasaisesti varjostettu tai liian pieni."""
    import fast_simplification
    if len(idx) // 3 < 20000:            # pienissä osissa (kukat, remmit) säästö on mitätön ja riski suuri
        return None
    uniq, inv = np.unique(np.round(P.astype(np.float64), 6), axis=0, return_inverse=True)
    inv = inv.reshape(-1)
    if len(idx) / len(uniq) < 5:          # alle 5 kolmiota per kärki: särmikäs pinta
        return None
    alku = inv[idx].reshape(-1, 3)
    pts, faces = fast_simplification.simplify(uniq.astype(np.float32), alku.astype(np.int32),
                                              target_reduction=osuus)
    pts = pts.astype(np.float32); faces = faces.astype(np.int64)
    a, b, c = pts[faces[:, 0]], pts[faces[:, 1]], pts[faces[:, 2]]
    fn = np.cross(b - a, c - a)
    # Laaduntarkistus: harvennus voi romauttaa ohuen putken (kameran remmi)
    # tai yhdistää erilliset pinnat (hiuskiehkura ja mekko) kolmioilla, jotka
    # ulottuvat tyhjän tilan yli. Siksi (1) pinta-ala ei saa muuttua yli 3 %
    # ja (2) jokaisen uuden kolmion keskipisteen ja särmien keskipisteiden
    # sekä kärkipisteiden on oltava alkuperäisen pinnan lähellä: lähimmän alkuperäisen kolmion
    # näytepisteen etäisyys saa olla enintään 0,75 × sen kolmion pisin särmä
    # (+ 0,3 % mallin koosta). Muuten osa jätetään harventamatta.
    from scipy.spatial import cKDTree
    U = uniq.astype(np.float64)
    ua, ub, uc = U[alku[:, 0]], U[alku[:, 1]], U[alku[:, 2]]
    ala0 = np.linalg.norm(np.cross(ub - ua, uc - ua), axis=1).sum()
    ala1 = np.linalg.norm(fn.astype(np.float64), axis=1).sum()
    pisin0 = np.max([np.linalg.norm(ub - ua, axis=1), np.linalg.norm(uc - ub, axis=1),
                     np.linalg.norm(ua - uc, axis=1)], axis=0)
    naytteet = np.vstack([(ua + ub + uc) / 3, (ua + ub) / 2, (ub + uc) / 2, (uc + ua) / 2, U])
    koot = np.concatenate([pisin0] * 4 + [np.zeros(len(U))])
    A, B, C = a.astype(np.float64), b.astype(np.float64), c.astype(np.float64)
    kokeet = np.vstack([(A + B + C) / 3, (A + B) / 2, (B + C) / 2, (C + A) / 2, pts.astype(np.float64)])
    etaisyys, lahin = cKDTree(naytteet).query(kokeet)
    diag = np.linalg.norm(U.max(0) - U.min(0))
    ylitys = etaisyys - (0.75 * koot[lahin] + 0.003 * diag)
    if abs(ala1 / max(ala0, 1e-12) - 1) > 0.03 or ylitys.max() > 0:
        print(f'  {nimi}: harvennus hylätty: ala {ala1 / max(ala0, 1e-12):.3f}, '
              f'irrallaan {(ylitys > 0).sum()} pistettä, pahin {etaisyys[ylitys.argmax()] / diag:.1%} mallin koosta')
        return None
    vn = np.zeros_like(pts)
    for k in range(3): np.add.at(vn, faces[:, k], fn)
    vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)
    print(f'  {nimi}: harvennettu {len(idx) // 3} -> {len(faces)} kolmiota, pahin poikkeama {etaisyys[ylitys.argmax()] / diag:.1%}')
    return pts, vn.astype(np.float32), faces.reshape(-1)


def pakkaa(src, dst, harvennus=0.0):
    j, binb = lue(src)
    uusi = bytearray()
    bviews, accs = [], []

    def lisaa(data, target=None, stride=None):
        while len(uusi) % 4: uusi.append(0)
        bv = {'buffer': 0, 'byteOffset': len(uusi), 'byteLength': len(data)}
        if target: bv['target'] = target
        if stride: bv['byteStride'] = stride
        uusi.extend(data)
        bviews.append(bv)
        return len(bviews) - 1

    # kuvat säilyvät sellaisenaan
    for im in j.get('images', []):
        if 'bufferView' in im:
            bv = j['bufferViews'][im['bufferView']]
            s = bv.get('byteOffset', 0)
            im['bufferView'] = lisaa(binb[s:s + bv['byteLength']])

    ennen_v = jalkeen_v = 0
    mesh_dq = {}
    solmun_nimi = {n['mesh']: n.get('name', '') for n in j['nodes'] if 'mesh' in n}
    for mi, mesh in enumerate(j['meshes']):
        # yhteinen purku meshin kaikille primitiiveille
        kaikki = [accessor(j, binb, p['attributes']['POSITION']) for p in mesh['primitives']]
        pmin = np.min([k.min(0) for k in kaikki], 0); pmax = np.max([k.max(0) for k in kaikki], 0)
        c = (pmin + pmax) / 2
        s = float(max((pmax - pmin).max() / 2, 1e-6)) * 1.0001
        mesh_dq[mi] = (c, s)
        for p in mesh['primitives']:
            at = p['attributes']
            P = accessor(j, binb, at['POSITION'])
            N = accessor(j, binb, at['NORMAL']) if 'NORMAL' in at else None
            UV = accessor(j, binb, at['TEXCOORD_0']) if 'TEXCOORD_0' in at else None
            idx = accessor(j, binb, p['indices']).reshape(-1).astype(np.int64) if 'indices' in p else np.arange(len(P))
            ennen_v += len(P)
            aine = j['materials'][p['material']] if 'material' in p else {}
            kuvio = 'baseColorTexture' in aine.get('pbrMetallicRoughness', {})
            if harvennus > 0 and N is not None and not kuvio:
                tulos = harvenna(P, idx, harvennus, mesh.get('name') or solmun_nimi.get(mi) or f'mesh {mi}')
                if tulos is not None:
                    P, N, idx = tulos
                    UV = None              # kuvioton materiaali ei tarvitse tekstuurikoordinaatteja
            # yhdistäminen kvantisoiduilla avaimilla
            qP = np.round((P - c) / s * 32767).astype(np.int16)
            osat = [qP.view(np.uint8).reshape(len(P), -1)]
            if N is not None:
                nn = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
                qN = np.round(nn * 127).astype(np.int8)
                osat.append(qN.view(np.uint8).reshape(len(P), -1))
            if UV is not None:
                osat.append(UV.astype(np.float32).view(np.uint8).reshape(len(P), -1))
            avain = np.ascontiguousarray(np.hstack(osat))
            _, eka, kaanteinen = np.unique(avain.view(np.dtype((np.void, avain.shape[1]))).reshape(-1),
                                            return_index=True, return_inverse=True)
            jarj = np.argsort(eka); uusiNro = np.empty_like(jarj); uusiNro[jarj] = np.arange(len(jarj))
            valitut = eka[jarj]
            uidx = uusiNro[kaanteinen.reshape(-1)][idx]
            nv = len(valitut); jalkeen_v += nv

            uat = {}
            pos4 = np.zeros((nv, 4), np.int16); pos4[:, :3] = qP[valitut]
            # min/max tallennetussa muodossa eli kokonaislukuina (glTF-määrittely)
            accs.append({'bufferView': lisaa(pos4.tobytes(), 34962, 8), 'componentType': 5122, 'normalized': True,
                         'count': nv, 'type': 'VEC3',
                         'min': [int(x) for x in pos4[:, :3].min(0)], 'max': [int(x) for x in pos4[:, :3].max(0)]})
            uat['POSITION'] = len(accs) - 1
            if N is not None:
                n4 = np.zeros((nv, 4), np.int8); n4[:, :3] = qN[valitut]
                accs.append({'bufferView': lisaa(n4.tobytes(), 34962, 4), 'componentType': 5120, 'normalized': True,
                             'count': nv, 'type': 'VEC3'})
                uat['NORMAL'] = len(accs) - 1
            if UV is not None:
                accs.append({'bufferView': lisaa(UV[valitut].astype(np.float32).tobytes(), 34962), 'componentType': 5126,
                             'count': nv, 'type': 'VEC2'})
                uat['TEXCOORD_0'] = len(accs) - 1
            if nv < 65535:
                accs.append({'bufferView': lisaa(uidx.astype(np.uint16).tobytes(), 34963), 'componentType': 5123,
                             'count': len(uidx), 'type': 'SCALAR'})
            else:
                accs.append({'bufferView': lisaa(uidx.astype(np.uint32).tobytes(), 34963), 'componentType': 5125,
                             'count': len(uidx), 'type': 'SCALAR'})
            p['attributes'] = uat
            p['indices'] = len(accs) - 1

    # purku mesh-solmujen matriisiin
    for n in j['nodes']:
        if 'mesh' in n:
            c, s = mesh_dq[n['mesh']]
            D = np.eye(4); D[:3, :3] *= s; D[:3, 3] = c
            M = mat_trs(n) @ D
            for k in ('translation', 'rotation', 'scale'): n.pop(k, None)
            n['matrix'] = [float(x) for x in M.T.reshape(-1)]

    j['accessors'] = accs
    j['bufferViews'] = bviews
    while len(uusi) % 4: uusi.append(0)
    j['buffers'] = [{'byteLength': len(uusi)}]
    for k in ('extensionsUsed', 'extensionsRequired'):
        j[k] = sorted(set(j.get(k, [])) | {'KHR_mesh_quantization'})
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(uusi))
    out += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(uusi), 0x004E4942) + bytes(uusi)
    open(dst, 'wb').write(out)
    print(f'{src}: kärkipisteet {ennen_v} -> {jalkeen_v}, koko {len(open(src, "rb").read())/1e6:.2f} -> {len(out)/1e6:.2f} Mt')


if __name__ == '__main__':
    osuus = float(sys.argv[sys.argv.index('--harvenna') + 1]) if '--harvenna' in sys.argv else 0.0
    pakkaa(sys.argv[1], sys.argv[2], osuus)
