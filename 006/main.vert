// jsから送られてきた頂点に関する情報
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;

// jsから送られてきた汎用的な情報
uniform mat4 mvpMatrix;
uniform mat4 normalMatrix;
uniform mat4 mMatrix;
uniform vec3 light;
uniform mat4 lightMMatrix;

// シェーダ間でやり取りする変数
// 頂点について
varying vec4 vColor;
varying vec3 vPosition;
varying vec3 vNormal;
// lightについて
varying vec3 lightPosition;

// ライトベクトルはひとまず定数で定義する

void main() {
  
  lightPosition = (lightMMatrix * vec4(light, 1.0)).xyz;

  // 頂点の色を送る
  vColor = color;
  // mで変換した頂点の位置を送る
  vPosition = (mMatrix * vec4(position, 1.0)).xyz;
  // nで変換した頂点の法線を送る
  // normalMatrixをかけるのはvertex?frangment?行列だし補完されても動作する気がする… TODO: 確認
  // 頂点の数とピクセルの数ってどのくらい違うんだろうか。
  // vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;
  vNormal = normal;
  // MVP 行列と頂点座標を乗算してから出力する
  gl_Position = mvpMatrix * vec4(position, 1.0);
}

