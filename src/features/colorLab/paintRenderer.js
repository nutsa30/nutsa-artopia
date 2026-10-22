// Draws a PaintSurface as glossy wet paint on primed linen. WebGL2 does the
// lighting at screen resolution; without it a small 2D fallback is used.
// Nothing runs between frames: callers draw only when something changed.

const VERT = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv; out vec4 color;
uniform sampler2D albedo, shape;
uniform vec2 view, grid;
uniform float dpr;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Primed linen: alternating warp and weft threads with slubs.
vec3 linen(vec2 px) {
  vec2 q = px / (3.2 * dpr);
  vec2 cell = floor(q), f = fract(q);
  float over = mod(cell.x + cell.y, 2.);
  float slub = .75 + .25 * hash(vec2(cell.y, 3.)) * hash(vec2(floor(cell.x / 7.), cell.y));
  float slubY = .75 + .25 * hash(vec2(cell.x, 9.)) * hash(vec2(floor(cell.y / 7.), cell.x));
  float warp = sin(f.y * 3.14159) * slub, weft = sin(f.x * 3.14159) * slubY;
  float h = mix(warp, weft, over);
  vec2 n = mix(vec2(0., cos(f.y * 3.14159) * slub), vec2(cos(f.x * 3.14159) * slubY, 0.), over);
  return vec3(n * .32, h);
}
void main() {
  vec2 px = uv * view;
  vec4 a = texture(albedo, uv);
  vec4 s = texture(shape, uv);
  float cover = s.w;
  vec3 weave = linen(px);
  float grainy = hash(floor(px / dpr)) * .035;
  vec3 ground = vec3(.952, .936, .9) - grainy - (1. - weave.z) * .055;
  vec3 paint = cover > .001 ? a.rgb / max(a.a, .001) : ground;
  // Paint normals come from the simulated thickness and bristle relief; thin
  // paint still shows the weave underneath.
  float thin = 1. - smoothstep(.15, .95, cover);
  vec3 n = normalize(vec3(s.xy * vec2(-8., -8.) * (grid.x / 640.) + weave.xy * (.05 + .95 * thin), 1.));
  vec3 L = normalize(vec3(-.42, -.62, .66));
  vec3 V = vec3(0., 0., 1.);
  vec3 H = normalize(L + V);
  float diffuse = max(dot(n, L), 0.);
  vec3 base = mix(ground, paint, cover);
  vec3 lit = base * (.74 + .34 * diffuse);
  // Wet oil: a tight highlight, a broader sheen, and the studio window
  // reflected in the raised ridges. Bare canvas stays matte.
  float wet = smoothstep(.25, .9, cover);
  float ndh = max(dot(n, H), 0.);
  float spec = pow(ndh, 70.) * .75 + pow(ndh, 14.) * .14;
  vec3 r = reflect(-V, n);
  float window = smoothstep(.16, .2, -r.x) * smoothstep(.62, .58, -r.x) * smoothstep(.1, .14, -r.y) * smoothstep(.52, .48, -r.y);
  float fres = .04 + .5 * pow(1. - max(n.z, 0.), 3.);
  vec3 sheen = vec3(1., .985, .96) * (spec + window * .32 + fres * .25) * wet;
  color = vec4(lit + sheen, 1.);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader');
  return shader;
}

export function createRenderer(canvas, surface) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
  if (gl) {
    try { return glRenderer(gl, canvas, surface); } catch { /* fall through to 2D */ }
  }
  return flatRenderer(canvas, surface);
}

function glRenderer(gl, canvas, surface) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link');
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const W = surface.width, H = surface.height;
  const texture = (unit, internal, format, type, data) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, W, H, 0, format, type, data);
    return t;
  };
  const albedo = texture(0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, surface.albedo);
  const shape = texture(1, gl.RGBA16F, gl.RGBA, gl.FLOAT, surface.shape);
  gl.uniform1i(gl.getUniformLocation(program, 'albedo'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'shape'), 1);
  const view = gl.getUniformLocation(program, 'view'), gridAt = gl.getUniformLocation(program, 'grid'), dprAt = gl.getUniformLocation(program, 'dpr');
  gl.uniform2f(gridAt, W, H);
  return {
    kind: 'webgl2',
    draw(rect, dpr = 1) {
      if (rect) {
        const [x0, y0, x1, y1] = rect, w = x1 - x0 + 1, h = y1 - y0 + 1;
        gl.pixelStorei(gl.UNPACK_ROW_LENGTH, W); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, albedo);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, surface.albedo);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shape);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, w, h, gl.RGBA, gl.FLOAT, surface.shape);
        gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(view, canvas.width, canvas.height); gl.uniform1f(dprAt, dpr);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    destroy() { gl.deleteTexture(albedo); gl.deleteTexture(shape); gl.deleteBuffer(buffer); gl.deleteProgram(program); },
  };
}

function flatRenderer(canvas, surface) {
  const W = surface.width, H = surface.height;
  const offscreen = document.createElement('canvas'); offscreen.width = W; offscreen.height = H;
  const off = offscreen.getContext('2d'), image = off.createImageData(W, H), px = image.data;
  const ground = [243, 239, 230];
  return {
    kind: '2d',
    draw(rect) {
      if (rect) {
        for (let y = rect[1]; y <= rect[3]; y++) for (let x = rect[0]; x <= rect[2]; x++) {
          const o = (y * W + x) * 4, c = surface.albedo[o + 3] / 255;
          const nx = -surface.shape[o] * 10, ny = -surface.shape[o + 1] * 10, len = Math.hypot(nx, ny, 1);
          const d = Math.max(0, (-.42 * nx - .62 * ny + .66) / len / 0.9);
          const h = Math.max(0, (-.22 * nx - .33 * ny + .92) / len) ** 80 * c;
          for (let k = 0; k < 3; k++) px[o + k] = (ground[k] * (1 - c) + (c ? surface.albedo[o + k] : 0)) * (.78 + .26 * d) + 255 * h;
          px[o + 3] = 255;
        }
        off.putImageData(image, 0, 0, rect[0], rect[1], rect[2] - rect[0] + 1, rect[3] - rect[1] + 1);
      }
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
    },
    destroy() {},
  };
}
