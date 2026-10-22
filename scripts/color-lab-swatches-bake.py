# PNG layers from color-lab-swatches.mjs -> WebP in src/features/colorLab/swatches/
# python scripts/color-lab-swatches-bake.py <png dir>
import sys, glob, os
from PIL import Image
src, out = sys.argv[1], os.path.join(os.path.dirname(__file__), '..', 'src', 'features', 'colorLab', 'swatches')
os.makedirs(out, exist_ok=True)
for f in glob.glob(os.path.join(src, 'stroke-*.png')):
    Image.open(f).save(os.path.join(out, os.path.basename(f)[:-4] + '.webp'), quality=86, method=6, alpha_quality=92)
