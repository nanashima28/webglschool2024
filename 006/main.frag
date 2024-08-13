precision mediump float;

uniform mat4 normalMatrix;
varying vec4 vColor;
varying vec3 vPosition;
// 各ピクセルで法線を計算せずとも、頂点にもたせておけば補完される、はず
varying vec3 vNormal;

varying vec3 lightPosition;

void main() {
  // 光の進行方向
  vec3 lightVec = normalize(vPosition - lightPosition);

  vec3 fNormal = normalize((normalMatrix * vec4(vNormal, 0.0)).xyz);
  // ピクセルごとに変わる且つ頂点間でも大きな差が出るものについてはフラグメントシェーダーでやったほうがよいきがする
  // 今回だったら光の位置によってdの値が変わる => vColor*dが頂点間の線形補完だと潰れる可能性が有る
  float d = - dot(fNormal, lightVec);
  // gl_FragColor = vec4(normalize(vNormal), 1.0);
  // gl_FragColor = vec4(lightVec, 1.0);
  gl_FragColor = vec4(vColor.rgb * d, vColor.a);
}

