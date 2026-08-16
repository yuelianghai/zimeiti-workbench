# -*- coding: utf-8 -*-
"""纯标准库生成 PNG 图标（紫粉渐变 + 白色星星/笔）"""
import zlib, struct, math, os

OUT = os.path.dirname(os.path.abspath(__file__))


def chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)


def write_png(path, w, h, px):
    raw = b''.join(b'\x00' + bytes(px[y]) for y in range(h))
    data = (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))
    open(path, 'wb').write(data)


def lerp(a, b, t):
    return a + (b - a) * t


def rounded_alpha(x, y, w, h, r, ss=3):
    """圆角矩形抗锯齿覆盖率"""
    hit = 0
    for sy in range(ss):
        for sx in range(ss):
            px = x + (sx + .5) / ss
            py = y + (sy + .5) / ss
            cx = min(max(px, r), w - r)
            cy = min(max(py, r), h - r)
            if (px - cx) ** 2 + (py - cy) ** 2 <= r * r + 1e-9:
                hit += 1
    return hit / (ss * ss)


def star_alpha(x, y, cx, cy, R, r, n=5, rot=-math.pi / 2, ss=3):
    hit = 0
    for sy in range(ss):
        for sx in range(ss):
            px = x + (sx + .5) / ss - cx
            py = y + (sy + .5) / ss - cy
            ang = math.atan2(py, px) - rot
            dist = math.hypot(px, py)
            step = math.pi / n
            k = (ang % (2 * step)) / step
            if k > 1:
                k = 2 - k
            edge = lerp(R, r, 1 - abs(k * 2 - 1)) if False else None
            # 星形半径插值：在尖角(k=0)为R，在凹角(k=1)为r
            rad = lerp(R, r, k)
            if dist <= rad:
                hit += 1
    return hit / (ss * ss)


def make(size, path, pad_ratio=0.0):
    w = h = size
    px = [[0] * (w * 4) for _ in range(h)]
    pad = int(size * pad_ratio)
    bw = size - pad * 2
    radius = bw * 0.235
    # 渐变色 品牌紫 #7256EE -> 淡紫
    c1 = (114, 86, 238)
    c2 = (168, 120, 240)
    cx, cy = size / 2, size / 2

    # 星星参数
    SR = bw * 0.30
    Sr = SR * 0.42
    scy = cy - bw * 0.045

    for y in range(h):
        row = px[y]
        for x in range(w):
            a = rounded_alpha(x - pad, y - pad, bw, bw, radius)
            if a <= 0:
                continue
            t = ((x - pad) / bw * 0.55 + (y - pad) / bw * 0.45)
            t = min(1, max(0, t))
            r = int(lerp(c1[0], c2[0], t))
            g = int(lerp(c1[1], c2[1], t))
            b = int(lerp(c1[2], c2[2], t))

            sa = star_alpha(x, y, cx, scy, SR, Sr)
            if sa > 0:
                r = int(lerp(r, 255, sa))
                g = int(lerp(g, 255, sa))
                b = int(lerp(b, 255, sa))

            # 底部小横条（像一支笔的笔触）
            by0, by1 = cy + bw * 0.255, cy + bw * 0.315
            bx0, bx1 = cx - bw * 0.20, cx + bw * 0.20
            if by0 <= y <= by1 and bx0 <= x <= bx1:
                edge = min(1.0, min(x - bx0, bx1 - x, y - by0, by1 - y) / 2.0 + .5)
                r = int(lerp(r, 255, 0.92 * edge))
                g = int(lerp(g, 255, 0.92 * edge))
                b = int(lerp(b, 255, 0.92 * edge))

            i = x * 4
            row[i] = r
            row[i + 1] = g
            row[i + 2] = b
            row[i + 3] = int(255 * a)
    write_png(path, w, h, px)
    print('ok', path)


make(192, os.path.join(OUT, 'icon-192.png'))
make(512, os.path.join(OUT, 'icon-512.png'))
make(512, os.path.join(OUT, 'icon-maskable.png'), pad_ratio=0.10)
