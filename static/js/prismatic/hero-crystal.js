/* Title-only glass renderer. Samples analytical distances from our vector silhouette
   into a high precision texture, then shades a chamfered solid with entry/exit refraction.
   No assets, libraries, remote requests or idle animation loop. SVG is fallback. */
(() => {
  'use strict';
  window.VinlumeCrystal?.destroy();
  const heading = document.querySelector('.pn-cover .pn-wordmark');
  const canvas = heading?.querySelector('.pn-crystal-word');
  const silhouette = heading?.querySelector('#pn-letterform');
  if (!canvas || !silhouette || !window.ResizeObserver) return;
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true, antialias: false, premultipliedAlpha: false,
      powerPreference: 'low-power', preserveDrawingBuffer: true
    });
  } catch { canvas.dataset.pnRenderer = 'unavailable'; return; }
  if (!gl) { canvas.dataset.pnRenderer = 'unavailable'; return; }
  const resources = [];
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let observer;
  let request = 0;
  let lastDraw = -100;
  let disposed = false;
  let visible = true;
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || Boolean(window.VinlumeEffects?.reduced);
  let light = [.65, .35];
  let program;

  // Convert the existing M/L/H/V/Q/Z path to contours. Straight faces stay
  // analytically straight: no bitmap normals or pixel-grid highlights.
  function outline(path) {
    const tokens = path.match(/[MLHVQZ]|-?(?:\d*\.)?\d+/gi) || [];
    const contours = [];
    let points = [], x = 0, y = 0, command = '', i = 0;
    const number = () => Number(tokens[i++]);
    while (i < tokens.length) {
      if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
      if (command === 'M') { x = number(); y = number(); points = [[x, y]]; command = 'L'; }
      else if (command === 'L') { x = number(); y = number(); points.push([x, y]); }
      else if (command === 'H') { x = number(); points.push([x, y]); }
      else if (command === 'V') { y = number(); points.push([x, y]); }
      else if (command === 'Q') {
        const cx = number(), cy = number(), endX = number(), endY = number();
        for (let step = 1; step <= 10; step++) {
          const t = step / 10, u = 1 - t;
          points.push([u * u * x + 2 * u * t * cx + t * t * endX, u * u * y + 2 * u * t * cy + t * t * endY]);
        }
        x = endX; y = endY;
      } else if (command === 'Z') { contours.push(points); points = []; command = ''; }
      else throw new Error('Unsupported outline command');
    }
    if (contours.length !== 7) throw new Error('Incomplete word silhouette');
    return contours;
  }
  function makeTexture() {
    const width = 1152, height = 256;
    const contours = outline(silhouette.getAttribute('d'));
    const ranges = contours.map(points => [Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0]))]);
    const segments = contours.map(points => points.map((a, i) => {
      const b = points[(i + 1) % points.length];
      return [a[0], a[1], b[0] - a[0], b[1] - a[1], 1 / Math.max((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2, .0001)];
    }));
    const columns = Array.from({ length: width }, (_, x) => {
      const pixelX = (x + .5) * 1440 / width;
      let index = 0;
      while (index < ranges.length - 1 && pixelX >= (ranges[index][1] + ranges[index + 1][0]) / 2) index++;
      return segments[index];
    });
    const floatTexture = Boolean(gl.getExtension('OES_texture_float') && gl.getExtension('OES_texture_float_linear'));
    const data = floatTexture ? new Float32Array(width * height * 4) : new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const px = (x + .5) * 1440 / width, py = (y + .5) * 320 / height;
      let distance = 1e9, inside = false;
      for (const [ax, ay, dx, dy, inverseLength] of columns[x]) {
        const wx = px - ax, wy = py - ay;
        const t = Math.max(0, Math.min(1, (wx * dx + wy * dy) * inverseLength));
        distance = Math.min(distance, (wx - dx * t) ** 2 + (wy - dy * t) ** 2);
        if ((ay > py) !== (ay + dy > py) && px < ax + dx * (py - ay) / dy) inside = !inside;
      }
      const signed = Math.sqrt(distance) / 160 * (inside ? -1 : 1);
      const packed = Math.round(Math.max(0, Math.min(1, signed / 4 + .5)) * 16777215);
      const i = (y * width + x) * 4;
      if (floatTexture) { data[i] = signed; data[i + 3] = 1; }
      else {
        data[i] = packed >>> 16; data[i + 1] = (packed >>> 8) & 255;
        data[i + 2] = packed & 255; data[i + 3] = 255;
      }
    }
    const texture = gl.createTexture(); resources.push(['Texture', texture]);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, floatTexture ? gl.FLOAT : gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    canvas.dataset.pnPrecision = floatTexture ? 'float' : 'packed';
    return floatTexture;
  }
  const vertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() { v_uv = a_position * .5 + .5; gl_Position = vec4(a_position, 0., 1.); }
  `;
  const fragment = `
    precision highp float;
    uniform sampler2D u_shape;
    uniform float u_floatShape;
    uniform sampler2D u_environment;
    uniform float u_environmentReady;
    uniform vec2 u_light;
    varying vec2 v_uv;

    float textDistance(vec2 p) {
      vec2 uv = vec2(p.x / 9. + .5, .5 - p.y / 2.);
      vec2 bounded = clamp(uv, .001, .999);
      vec3 texel = texture2D(u_shape, bounded).rgb;
      float d = u_floatShape > .5 ? texel.r : dot(texel, vec3(16711680., 65280., 255.)) / 16777215. * 4. - 2.;
      return d + length((uv - bounded) * vec2(9., 2.));
    }
    float solid(vec3 p) {
      float outline = textDistance(p.xy);
      // Cut front planes are shallow facets, not a painted colour pattern.
      float facet = abs(sin((p.x + 4.5) * .75 + p.y * .22));
      float front = .27 - .018 * facet;
      float slab = max(p.z - front, -.24 - p.z);
      return max(max(outline, slab), (outline + slab + .09) * .7071068);
    }
    vec3 normalAt(vec3 p) {
      vec2 e = vec2(.009, 0.);
      return normalize(vec3(solid(p + e.xyy) - solid(p - e.xyy),
        solid(p + e.yxy) - solid(p - e.yxy), solid(p + e.yyx) - solid(p - e.yyx)));
    }
    float boxLight(vec2 p, vec2 centre, vec2 size, float softness) {
      vec2 q = abs(p - centre) - size;
      return 1. - smoothstep(-softness, softness, max(q.x, q.y));
    }
    vec3 opticalTint(float phase) {
      float cyanToBlue = .5 + .5 * sin(phase);
      float violet = .5 + .5 * sin(phase * .71 + 1.8);
      return mix(mix(vec3(.24, .82, .96), vec3(.28, .42, .98), cyanToBlue), vec3(.67, .34, .94), violet * .7);
    }
    vec3 studio(vec3 direction, vec3 position) {
      vec3 d = normalize(direction);
      vec3 colour = vec3(.014, .019, .029);
      vec2 plane = d.xy / (abs(d.z) + .22);
      vec2 lamp = vec2((u_light.x - .5) * 3.4, (.5 - u_light.y) * 2.);
      float key = boxLight(plane, lamp + vec2(-.6, .8), vec2(.75, .2), .16);
      float rim = boxLight(plane, lamp * -.5 + vec2(1.1, -.45), vec2(.13, 1.45), .12);
      float overhead = exp(-pow((d.y - .65) * 6., 2.));
      vec3 optic = opticalTint(dot(d, vec3(2.4, 1.7, 1.1)) + position.x * .34 + u_light.x * 2.1);
      colour += mix(vec3(.96, .98, 1.), optic, .44) * (key * 1.35 + rim * 1.05 + overhead * .36);
      // Light transmitted through a second, faceted optical volume behind the word.
      vec2 back = position.xy + d.xy * (1.6 / max(abs(d.z), .25));
      float face = smoothstep(-.2, .2, back.y + back.x * .32 - .05);
      vec2 environmentUV = clamp(vec2(back.x / 11. + .5, .5 - back.y / 5.), .002, .998);
      vec3 environment = texture2D(u_environment, environmentUV).rgb;
      colour += mix(vec3(.055, .075, .105), vec3(.15, .19, .25), face);
      colour += environment * u_environmentReady * .62;
      float caustic = exp(-pow((back.y - sin(back.x * .7) * .38) * 9., 2.));
      colour += mix(vec3(.58, .69, .82), optic, .55) * caustic * .5;
      colour += vec3(.13, .075, .23) * exp(-length(back - vec2(1.7, -.2)) * 1.8);
      vec2 reflectedPlane = vec2(back.x * .94 + back.y * .34, back.y * .94 - back.x * .34);
      float window = boxLight(reflectedPlane, vec2(-.7 + lamp.x * .22, .45), vec2(1.3, .07), .045);
      colour += mix(vec3(.85, .94, 1.), optic, .5) * window * 1.05;
      return colour;
    }
    void main() {
      vec2 view = (v_uv - .5) * vec2(9., 2.);
      vec3 rd = normalize(vec3(.09, -.14, -1.));
      vec3 ro = vec3(view - rd.xy * (4. / -rd.z), 4.);
      float t = 3.55;
      bool hit = false;
      for (int i = 0; i < 48; i++) {
        float distance = solid(ro + rd * t);
        if (distance < .0012) { hit = true; break; }
        t += max(distance * .85, .001);
        if (t > 4.6) break;
      }
      if (!hit) { gl_FragColor = vec4(0.); return; }
      vec3 p = ro + rd * t;
      vec3 n = normalAt(p);
      vec3 inside = refract(rd, n, 1. / 1.47);
      vec3 exitPoint = p + inside * .008;
      for (int i = 0; i < 22; i++) {
        float distance = solid(exitPoint);
        if (distance > .001) break;
        exitPoint += inside * max(abs(distance) * .85, .003);
      }
      vec3 exitNormal = normalAt(exitPoint);
      vec3 r = refract(inside, -exitNormal, 1.466);
      vec3 g = refract(inside, -exitNormal, 1.47);
      vec3 b = refract(inside, -exitNormal, 1.474);
      if (dot(r, r) < .01) r = reflect(inside, exitNormal);
      if (dot(b, b) < .01) b = reflect(inside, exitNormal);
      vec3 reflected = studio(reflect(rd, n), p);
      if (dot(g, g) < .01) g = reflect(inside, exitNormal);
      vec3 through = vec3(studio(r, exitPoint).r, studio(g, exitPoint).g, studio(b, exitPoint).b);
      float critical = 1. - 1.47 * 1.47 * (1. - pow(dot(inside, exitNormal), 2.));
      float exitTransmission = smoothstep(-.06, .08, critical);
      vec3 transmitted = mix(studio(reflect(inside, exitNormal), exitPoint) * .8, through, exitTransmission);
      float fresnel = .045 + .955 * pow(1. - max(dot(-rd, n), 0.), 5.);
      float thickness = length(exitPoint - p);
      vec3 absorption = exp(-vec3(.19, .065, .025) * thickness);
      vec3 colour = mix(transmitted * absorption, reflected, fresnel);
      vec3 lampPosition = vec3((u_light.x - .5) * 9., (.5 - u_light.y) * 2., 1.7);
      vec3 lamp = normalize(lampPosition - p);
      float localLight = exp(-dot(p.xy - lampPosition.xy, p.xy - lampPosition.xy) * .42);
      colour *= .72 + .55 * localLight;
      float glint = pow(max(dot(reflect(-lamp, n), -rd), 0.), 100.);
      vec3 iridescence = opticalTint(dot(n, lamp) * 5. + thickness * 4. + u_light.x * 1.8);
      float grazing = pow(1. - max(dot(-rd, n), 0.), .65);
      colour += iridescence * (.09 + .17 * grazing) * (.3 + localLight * .7);
      colour += mix(vec3(.94, .97, 1.), iridescence, .48) * glint * 2.3;
      colour = 1. - exp(-colour * 1.9);
      colour = pow(colour, vec3(.78));
      gl_FragColor = vec4(colour, 1.);
    }
  `;
  function shader(type, source) {
    const compiled = gl.createShader(type);
    resources.push(['Shader', compiled]);
    gl.shaderSource(compiled, source); gl.compileShader(compiled);
    if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(compiled) || 'Shader not supported');
    return compiled;
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(request);
    controller.abort(); observer?.disconnect();
    heading.classList.remove('pn-crystal-ready'); canvas.hidden = true;
    resources.forEach(([kind, resource]) => gl[`delete${kind}`](resource));
  }
  try {
    program = gl.createProgram(); resources.push(['Program', program]);
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('No glass program');
    gl.useProgram(program);
    const buffer = gl.createBuffer(); resources.push(['Buffer', buffer]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    const floating = makeTexture();
    gl.uniform1f(gl.getUniformLocation(program, 'u_floatShape'), floating ? 1 : 0);
    gl.uniform1i(gl.getUniformLocation(program, 'u_shape'), 0);
    const lightLocation = gl.getUniformLocation(program, 'u_light');
    const environmentLocation = gl.getUniformLocation(program, 'u_environmentReady');
    const environmentTexture = gl.createTexture(); resources.push(['Texture', environmentTexture]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, environmentTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, 'u_environment'), 1);
    gl.activeTexture(gl.TEXTURE0);
    const environmentImage = document.querySelector('.pn-cover .pn-hero-environment');
    function uploadEnvironment() {
      if (disposed || !environmentImage?.naturalWidth) return;
      try {
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, environmentTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, environmentImage);
        gl.uniform1f(environmentLocation, 1);
        canvas.dataset.pnEnvironment = 'ready';
        schedule();
      } catch { gl.uniform1f(environmentLocation, 0); }
      finally { gl.activeTexture(gl.TEXTURE0); }
    }
    environmentImage?.addEventListener('load', uploadEnvironment, options);
    if (environmentImage?.complete) uploadEnvironment();
    function draw(time) {
      request = 0;
      if (disposed || document.hidden || !visible) return;
      if (time - lastDraw < 32) { request = requestAnimationFrame(draw); return; }
      lastDraw = time;
      gl.uniform2f(lightLocation, ...light);
      canvas.dataset.pnLight = light.map(value => value.toFixed(3)).join(',');
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function schedule() { if (!disposed && visible && !request) request = requestAnimationFrame(draw); }
    function resize() {
      const measuredWidth = heading.getBoundingClientRect().width;
      const ratio = measuredWidth < 700 ? Math.min(Math.max(devicePixelRatio, 1.5), 2) : Math.min(devicePixelRatio, 1.25);
      const width = Math.min(1400, Math.round(measuredWidth * ratio));
      if (!width) return;
      canvas.width = width; canvas.height = Math.round(width * 320 / 1440);
      gl.viewport(0, 0, canvas.width, canvas.height); schedule();
    }
    observer = new ResizeObserver(resize); observer.observe(heading);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); destroy(); }, options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(request); request = 0; }
      else schedule();
    }, options);
    window.addEventListener('pagehide', () => { cancelAnimationFrame(request); request = 0; }, options);
    window.addEventListener('pageshow', schedule, options);
    window.VinlumeCrystal = Object.freeze({
      setLight(x, y) { if (!reduced) { light = [x, y]; schedule(); } },
      setVisible(value) { visible = Boolean(value); if (!visible) { cancelAnimationFrame(request); request = 0; } else schedule(); },
      reset() { light = [.65, .35]; schedule(); },
      setReduced(value) { reduced = Boolean(value); if (reduced) light = [.65, .35]; schedule(); },
      destroy
    });
    canvas.dataset.pnRenderer = 'ready'; canvas.hidden = false; heading.classList.add('pn-crystal-ready'); resize();
  } catch (error) {
    canvas.dataset.pnRenderer = error.message;
    // A complete readable SVG stays in place if any GPU feature is unavailable.
    destroy();
  }
})();
