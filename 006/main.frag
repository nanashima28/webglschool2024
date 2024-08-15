#extension GL_OES_standard_derivatives : enable

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
  // 光源との距離
  float diff = distance(vPosition, lightPosition);

  // スクリーン縦横方向のピクセルとのvPositionについて微分
  // dx, dyは微小区間だけれど、それはオブジェクトが置かれている空間ではなくピクセルなどのスクリーン平面
  // vPositionなどフラグメントシェーダーで取得できる（頂点シェーダーから線形補完された）値はイメージとしてスクリーンを規定とした関数f(x,y)の値、かな。
  // vPosition(x,y)=>(x,y,z)というスクリーン=>空間の位置情報という関数
  // vColor(x,y)=>(r,g,b,a)というスクリーン=>4次元の色情報という関数
  // とみなすと偏微分の意味が分かりやすい。
  // スクリーン上であろうと偏微分の値はは3次元空間の平面上にある二点の差分になって
  // dxとdyの単位が異なる可能性はあるけれど、少なくとも3次元空間にある平面上の2本のベクトル（しかも平行でない）を取れるから外積すれば法線が得られる、かな
  // スクリーンとなるとオブジェクト外のピクセルについてどうなるんだと思ったけど、mvpで変換した3頂点の内点だけ出てるのかな、エッジの部分どうしてるんだろうってのは宿題
  vec3 dxVPos = dFdx(vPosition.xyz);
  vec3 dyVPos = dFdy(vPosition.xyz);
  vec3 surfaceNorm = normalize(cross( dxVPos, dyVPos));

  vec3 fNormal = normalize((normalMatrix * vec4(vNormal, 0.0)).xyz);
  // ピクセルごとに変わる且つ頂点間でも大きな差が出るものについてはフラグメントシェーダーでやったほうがよいきがする
  // 今回だったら光の位置によってdの値が変わる => vColor*dが頂点間の線形補完だと潰れる可能性が有る
  // float d = - dot(fNormal, lightVec); // 課題用コード
  float d = - dot(surfaceNorm, lightVec); // 光の当たらない面は暗くなるが、これだけだと距離の考慮がない。光源に近いほど明るくなり、遠いほど暗くなるってのは作れない。
  d = d / pow((1.0 + diff), 2.0); // これで逆2乗で減衰する
  d = 2.0 * d; // ちょっと昏過ぎたので補正
  // gl_FragColor = vec4(normalize(vNormal), 1.0); // 法線ベクトル確認用
  // gl_FragColor = vec4(lightVec, 1.0); // 光方向確認用、これはこれでおもろい
  gl_FragColor = vec4(vColor.rgb * d, vColor.a);
}

