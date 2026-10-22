import sys, json
import numpy as np
from PIL import Image
out = sys.argv[1]
def save(arr, path, q=88, aq=70):
    Image.fromarray(np.clip(arr * 255 + .5, 0, 255).astype(np.uint8), 'RGBA').save(path, quality=q, method=6, alpha_quality=aq)
def light_only(rgb):
    # Light on black -> straight-alpha light, so plain "over" ~ screen.
    al = np.clip((rgb.max(axis=2, keepdims=True) - .02) / .98, 0, 1)
    col = np.where(al > 1e-3, rgb / np.maximum(rgb.max(axis=2, keepdims=True), 1e-3), 0)
    return np.concatenate([np.clip(col, 0, 1), al], axis=2)
for name in ('beaker-200', 'beaker-600'):
    L = lambda n: np.asarray(Image.open(f'final/{name}-{n}.png').convert('RGBA')).astype(np.float32) / 255
    m = json.load(open('final/beakers.json'))[name]
    for part in ('back', 'front'):
        layer = light_only(L(part)[..., :3])
        if part == 'back':
            # The thick base catches hard glints that read as clutter in an empty beaker.
            rows = np.arange(layer.shape[0])[:, None, None]
            layer[..., 3:4] *= np.where(rows > m['y0'] - m['ry'] * .6, .3, 1)
        save(layer, f'{out}/{name}-{part}.webp', 86)
    for part in ('liquid', 'top'):
        shade, gloss = L(f'{part}-shade'), L(f'{part}-gloss')
        a = shade[..., 3:4]
        mask = np.concatenate([np.ones_like(shade[..., :3]), a], axis=2)
        gray = shade[..., :3].mean(axis=2, keepdims=True) / np.maximum(a, 1e-3)
        shadow = np.concatenate([np.zeros_like(shade[..., :3]), np.clip(1 - gray, 0, 1) * a], axis=2)
        save(mask, f'{out}/{name}-{part}-mask.webp', 80)
        save(shadow, f'{out}/{name}-{part}-shadow.webp', 92, 100)
        save(light_only(gloss[..., :3] * gloss[..., 3:4]), f'{out}/{name}-{part}-gloss.webp')
