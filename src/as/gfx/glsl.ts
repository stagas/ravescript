import { VertOpts } from '~/as/assembly/gfx/sketch-shared.ts'

const hasBits = (varname: string, ...bits: number[]) =>
  /*glsl*/`(int(${varname}) & (${bits.join(' | ')})) != 0`

export const vertex = /*glsl*/`
#version 300 es
precision highp float;

in float a_quad;
in vec4 a_vert;
in vec4 a_style;

uniform float u_pr;
uniform vec2 u_screen;

out float v_opts;
out vec2 v_uv;
out vec2 v_size;
out vec2 v_color;

vec2 perp(vec2 v) {
  return vec2(-v.y, v.x);
}

void main() {
  vec2 a_color = a_style.xy;
  float a_opts = a_style.z;
  float a_lineWidth = a_style.w;

  vec2 pos = vec2(0.,0.);

  vec2 quad = vec2(
      mod(a_quad,  2.0),
    floor(a_quad / 2.0)
  );

  if (${hasBits('a_opts', VertOpts.Line)}) {
    vec2 a = a_vert.xy;
    vec2 b = a_vert.zw;
    vec2 v = b - a;

    float mag = length(v);
    float mag1 = 1.0 / mag;
    vec2 n = perp(v) * mag1;

    float lw = a_lineWidth;
    float lwh = lw * 0.5;

    mat3 transform = mat3(
      v.x,             v.y,             0.0,
      n.x * lw,        n.y * lw,        0.0,
      a.x - n.x * lwh, a.y - n.y * lwh, 1.0
    );

    pos = (transform * vec3(quad, 1.0)).xy * u_pr;
  }
  else {
    pos = ceil((a_vert.xy + a_vert.zw * quad) * u_pr);
  }

  pos /= u_screen * 0.5;
  pos -= 1.0;
  pos.y *= -1.0;

  gl_Position = vec4(pos, 0.0, 1.0);

  v_color = a_color;
}
`
export const fragment = /*glsl*/`
#version 300 es

precision highp float;

in vec2 v_color;
out vec4 fragColor;

vec3 intToRgb(int color) {
  int r = (color >> 16) & 0xFF;
  int g = (color >> 8) & 0xFF;
  int b = color & 0xFF;
  return vec3(float(r), float(g), float(b)) / 255.0;
}

void main() {
  vec3 color = intToRgb(int(v_color.x)).rgb;
  float alpha = v_color.y;
  fragColor = vec4(color, alpha);
}
`
