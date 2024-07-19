precision mediump float;

// 経過時間を uniform 変数（の浮動小数点）として受け取る
uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;

varying vec4 vColor;

void main() {
  // resolution: 画面縦横
  // gl_FragCoord.xy: たぶんピクセル座標？
  // 今回はいらないけど正規化, -1~1になるはず？
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

  // mouse
  vec2 m = vec2(mouse.x * 2.0 - 1.0, -mouse.y * 2.0 + 1.0);

  // diff
  float len = length(m - p);

  vec3 rgb = vColor.rgb - len;
  // フラグメントの色
  gl_FragColor = vec4(rgb, vColor.a);
}
