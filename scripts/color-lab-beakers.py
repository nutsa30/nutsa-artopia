# Renders Griffin low-form beakers as compositing layers for the color lab.
# blender -b --factory-startup -P beaker.py -- <outdir> [samples]
# Units: 1 Blender unit = 1 cm. Orthographic camera, so a liquid level only
# moves its surface straight up/down on screen.
import bpy, bmesh, math, json, sys, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
SAMPLES = int(argv[1]) if len(argv) > 1 else 384
os.makedirs(OUT, exist_ok=True)
TILT = math.radians(14)
STUDIO = os.environ.get('BEAKER_STUDIO', 'all')  # 'all' = reflections and refraction see the studio; 'glossy' = reflections only
ONLY = os.environ.get('BEAKER_ONLY')
FLOOR = float(os.environ.get('BEAKER_FLOOR', '0.03'))          # what the thick base refracts
STUDIO_STRENGTH = float(os.environ.get('BEAKER_STRENGTH', '0.5'))  # render just one beaker while trying a look

BEAKERS = {
    # name: outer diameter, height, wall, base, nominal ml, major mark step, minor step, px width
    'beaker-200': dict(od=6.5, h=9.0, wall=0.13, base=0.32, ml=200, major=50, minor=25, px=340),
    'beaker-600': dict(od=9.0, h=12.5, wall=0.16, base=0.4, ml=600, major=100, minor=50, px=620),
}

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = kind; prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices: d.use = d.type == kind
                sc.cycles.device = 'GPU'; break
        except Exception: pass
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 16; sc.cycles.transmission_bounces = 16; sc.cycles.glossy_bounces = 8
    sc.render.film_transparent = True
    sc.cycles.film_transparent_glass = True
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    # Product-photo studio: the camera sees black (the page composites light only), but the glass reflects and
    # refracts a soft studio around it: a bright horizon band, a light floor and a dim ceiling. Grazing reflections of
    # that band draw the whole silhouette as one continuous edge, and the thick base shows by refracting the floor,
    # so the vessel reads as a beaker at a glance (owner, 2026-10-22: the old one looked like loose streaks, no base).
    nt = world.node_tree; nodes, links = nt.nodes, nt.links
    bg = nodes['Background']; bg.inputs[0].default_value = (0, 0, 0, 1); bg.inputs[1].default_value = 0
    studio = nodes.new('ShaderNodeBackground')
    coord = nodes.new('ShaderNodeTexCoord'); sep = nodes.new('ShaderNodeSeparateXYZ')
    ramp = nodes.new('ShaderNodeValToRGB'); r = ramp.color_ramp
    links.new(coord.outputs['Generated'], sep.inputs[0])
    # Generated on the world = view direction mapped to 0..1; z: .5 = horizon
    links.new(sep.outputs['Z'], ramp.inputs[0])
    r.elements[0].position, r.elements[0].color = 0.0, (FLOOR, FLOOR, FLOOR * 1.05, 1)   # floor
    r.elements[1].position, r.elements[1].color = 1.0, (0, 0, 0, 1)                      # ceiling
    for pos, c in ((0.46, (FLOOR, FLOOR, FLOOR * 1.05, 1)), (0.495, (1.0, 1.0, 1.0, 1)), (0.53, (0.85, 0.87, 0.9, 1)), (0.58, (0.0, 0.0, 0.0, 1))):
        e = r.elements.new(pos); e.color = c
    links.new(ramp.outputs['Color'], studio.inputs['Color']); studio.inputs['Strength'].default_value = STUDIO_STRENGTH
    path = nodes.new('ShaderNodeLightPath'); mix = nodes.new('ShaderNodeMixShader')
    if STUDIO == 'glossy':  # reflections only: refraction through the walls stays dark
        links.new(path.outputs['Is Glossy Ray'], mix.inputs['Fac'])
        links.new(bg.outputs[0], mix.inputs[1]); links.new(studio.outputs[0], mix.inputs[2])
    else:
        links.new(path.outputs['Is Camera Ray'], mix.inputs['Fac'])
        links.new(studio.outputs[0], mix.inputs[1]); links.new(bg.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], nodes['World Output'].inputs['Surface'])
    return sc

def mat(name, **p):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    for k, v in p.items():
        if k in b.inputs: b.inputs[k].default_value = v
    return m

def lathe(name, profile, steps=128):
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0, z)) for r, z in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    for poly in me.polygons: poly.use_smooth = True
    return ob

def arc_strip(name, r, a0, a1, z, h, n=16):
    bm = bmesh.new(); rows = []
    for dz in (-h / 2, h / 2):
        rows.append([bm.verts.new((r * math.cos(a0 + (a1 - a0) * i / n), r * math.sin(a0 + (a1 - a0) * i / n), z + dz)) for i in range(n + 1)])
    for i in range(n): bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return ob

def split(ob, keep):
    """Copy of ob keeping only faces for which keep(center) is true."""
    c = ob.copy(); c.data = ob.data.copy(); bpy.context.collection.objects.link(c)
    bm = bmesh.new(); bm.from_mesh(c.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.calc_center_median())], context='FACES')
    bm.to_mesh(c.data); bm.free()
    return c

def light(name, loc, rot, size, power, sx=None):
    d = bpy.data.lights.new(name, 'AREA'); d.shape = 'RECTANGLE'; d.size = size; d.size_y = sx or size; d.energy = power
    o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = rot
    bpy.context.collection.objects.link(o)
    return o

def build(spec):
    sc = reset()
    ro, H, wall, base = spec['od'] / 2, spec['h'], spec['wall'], spec['base']
    ri = ro - wall
    level = base + spec['ml'] / (math.pi * ri * ri)  # inner height of the nominal volume
    lip = 0.09
    profile = [(0, 0), (ro - .25, 0), (ro - .06, .05), (ro, .25), (ro, H - .15), (ro + lip, H - .08), (ro + lip * .8, H + .02),
               (ri + .02, H), (ri, H - .1), (ri, base + .2), (ri - .2, base), (0, base)]
    glass = lathe('glass', profile, 384)  # fine enough that refracted glints stay smooth, not zig-zag
    # Pouring spout on the left: pull the top of the rim outwards.
    for v in glass.data.vertices:
        ang = math.atan2(v.co.y, v.co.x) - math.pi
        ang = (ang + math.pi) % math.tau - math.pi
        fall = max(0, 1 - abs(ang) / .32) ** 2
        rise = max(0, (v.co.z - (H - 1.0)) / 1.0) ** 2
        if fall and rise:
            v.co.x -= fall * rise * .3; v.co.z += fall * rise * .08
    glass_m = mat('glass', **{'Base Color': (1, 1, 1, 1), 'Roughness': .015, 'IOR': 1.47, 'Transmission Weight': 1.0})
    glass.data.materials.append(glass_m)
    # Printed white graduation: ticks and numbers on the front, facing the camera slightly left of centre.
    enamel = mat('enamel', **{'Base Color': (.93, .93, .9, 1), 'Roughness': .45})
    marks = []
    face = math.radians(-112)  # angle on the cylinder where the scale sits (front-left)
    def place(ob, z, ang, outward=.012):
        ob.location = ((ro + outward) * math.cos(ang), (ro + outward) * math.sin(ang), z)
        ob.rotation_euler = (math.radians(90), 0, ang + math.radians(90))
    step = spec['minor']
    for ml in range(step, spec['ml'] + 1, step):
        z = base + ml / (math.pi * ri * ri)
        major = ml % spec['major'] == 0
        w = .9 if major else .5
        t = arc_strip('tick', ro + .012, face - w / ro, face, z, .055 if major else .04)
        t.data.materials.append(enamel); marks.append(t)
        if major:
            bpy.ops.object.text_add()
            tx = bpy.context.object; tx.data.body = str(ml); tx.data.size = .42 if spec['ml'] <= 200 else .5
            tx.data.align_x = 'LEFT'; tx.data.align_y = 'CENTER'
            bpy.ops.object.convert(target='MESH')
            tx = bpy.context.object
            place(tx, z, face + .08 / ro)
            tx.data.materials.append(enamel); marks.append(tx)
    bpy.ops.object.text_add(); tx = bpy.context.object; tx.data.body = f"{spec['ml']} ml"; tx.data.size = .36
    tx.data.align_x = 'CENTER'; tx.data.align_y = 'CENTER'; bpy.ops.object.convert(target='MESH'); tx = bpy.context.object
    place(tx, base + .9, face + .9 / ro); tx.data.materials.append(enamel); marks.append(tx)
    # Liquid: side (filled to the nominal mark) and top surface with a meniscus.
    liquid = lathe('liquid', [(0, base + .01), (ri - .2, base + .01), (ri - .01, base + .2), (ri - .01, level)], 96)
    top = lathe('top', [(0, level), (ri * .7, level), (ri * .93, level + .03), (ri - .01, level + .1)], 96)
    # Camera
    cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cam_d); bpy.context.collection.objects.link(cam); sc.camera = cam
    mid = H * .5
    cam.rotation_euler = (math.pi / 2 - TILT, 0, 0)
    cam.location = (0, -60 * math.cos(TILT), mid + 60 * math.sin(TILT))
    span_w, span_h = ro * 2 + 1.4, H + 1.2 + ro * 2 * math.sin(TILT)
    cam_d.ortho_scale = max(span_w, span_h)
    sc.render.resolution_x = spec['px']; sc.render.resolution_y = round(spec['px'] * span_h / span_w)
    cam_d.ortho_scale = span_h if span_h > span_w else span_w
    cam_d.shift_y = -.02
    # Studio: softbox key on the left, strip lights right and back, top panel.
    light('key', (-14, -10, mid + 6), (math.radians(70), 0, math.radians(-55)), 9, float(os.environ.get('BEAKER_KEY', '2600')), 14)
    light('strip_r', (12, -6, mid + 1), (math.radians(90), 0, math.radians(62)), 1.0, 450, 16)
    light('rim', (4, 14, mid + 3), (math.radians(-80), 0, math.radians(165)), 6, 900, 12)
    light('top', (0, -9, H + 12), (math.radians(-30), 0, 0), 8, 260, 8)
    # Edge lights just behind and beside the glass: they outline the silhouette.
    for side in (-1, 1):
        o = light(f'edge{side}', (side * (ro + 5), 7, mid), (0, 0, 0), .5, float(os.environ.get('BEAKER_EDGE', '20')), H * 1.4)
        o.rotation_euler = (Vector((0, -1.5, mid)) - o.location).to_track_quat('-Z', 'Y').to_euler()
    for m in marks: m.visible_glossy = False; m.visible_transmission = False
    return dict(sc=sc, glass=glass, marks=marks, liquid=liquid, top=top, level=level, ri=ri, ro=ro, H=H, base=base, cam=cam)

def project(sc, cam, p):
    v = world_to_camera_view(sc, cam, Vector(p))
    return (v.x * sc.render.resolution_x, (1 - v.y) * sc.render.resolution_y)

def show(objs, everything):
    for o in everything: o.hide_render = o not in objs

def render(sc, path):
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

meta = {}
for name, spec in BEAKERS.items():
    if ONLY and name != ONLY:
        continue
    b = build(spec); sc, cam = b['sc'], b['cam']
    front = split(b['glass'], lambda c: c.y < 0 and c.z > b['base'] + .05)
    back = split(b['glass'], lambda c: not (c.y < 0 and c.z > b['base'] + .05))
    b['glass'].hide_render = True
    every = [front, back, b['liquid'], b['top'], *b['marks']]
    # Glass on black: the page adds it with a screen blend, so only light counts.
    sc.render.film_transparent = False
    show([back], every); render(sc, f'{OUT}/{name}-back.png')
    show([front, *b['marks']], every); render(sc, f'{OUT}/{name}-front.png')
    sc.render.film_transparent = True
    # Liquid passes: a white matte body (tinted in the page) and a black glossy coat (added on top).
    matte = mat('matte', **{'Base Color': (1, 1, 1, 1), 'Roughness': .55, 'Specular IOR Level': 0.0})
    gloss = mat('gloss', **{'Base Color': (0, 0, 0, 1), 'Roughness': .5, 'Specular IOR Level': 0.0, 'Coat Weight': 1.0, 'Coat Roughness': .06})
    for part in ('liquid', 'top'):
        ob = b[part]
        for pass_name, m in (('shade', matte), ('gloss', gloss)):
            ob.data.materials.clear(); ob.data.materials.append(m)
            show([ob], every); render(sc, f'{OUT}/{name}-{part}-{pass_name}.png')
    z0, z1 = b['base'], b['level']
    p = lambda x, y, z: project(sc, cam, (x, y, z))
    meta[name] = dict(
        width=sc.render.resolution_x, height=sc.render.resolution_y, ml=spec['ml'],
        y0=p(0, 0, z0)[1], y1=p(0, 0, z1)[1],                       # surface centre at 0 ml and at nominal ml
        cx=p(0, 0, z1)[0], rx=p(b['ri'], 0, z1)[0] - p(0, 0, z1)[0],
        ry=p(0, -b['ri'], z1)[1] - p(0, 0, z1)[1],
        rim=p(0, -b['ro'], b['H'])[1], bottom=p(0, -b['ro'], 0)[1],
        left=p(-b['ro'], 0, b['H'] / 2)[0], right=p(b['ro'], 0, b['H'] / 2)[0])
with open(f'{OUT}/beakers.json', 'w') as f: json.dump(meta, f, indent=1)
print('DONE', json.dumps(meta))
