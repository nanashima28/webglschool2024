
// = 010 ======================================================================
// 法線とライトベクトル（光の向き）の内積で照明効果を演出できることがわかりまし
// たが、１つ前のサンプルでは、対象となるジオメトリ（頂点）に対してモデル座標変
// 換が掛かっている場合問題が起こります。
// これは落ち着いて考えると当たり前なのですが、頂点がモデル座標変換されているこ
// とで「頂点の位置が変化」しているにもかかわらず、法線を一切変換していないため、
// もともと明るい場所は頂点が移動しても明るいまま、暗い場所は暗いままになってし
// まいます。
// これに対応するには、モデル座標変換のうち「回転の効果」のみを相殺することがで
// きる特殊な行列を生成し、法線を変換してやる必要があります。最初はこの感覚がと
// ても掴みにくく頭のなかでイメージしにくいのですが、法線を色として出力するなど
// してみると、意味がわかりやすいかもしれません。
// ============================================================================

import { WebGLUtility } from '../lib/webgl.js';
import { Vec3, Mat4 } from '../lib/math.js';
import { WebGLGeometry } from '../lib/geometry.js';
import { WebGLOrbitCamera } from '../lib/camera.js';
import { Pane } from '../lib/tweakpane-4.0.3.min.js';

window.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  app.init();
  const exReady = app.setupExtension();
  await app.load();
  app.setupGeometry();
  app.setupLocation();
  if (!exReady) return;
  app.start();

  // Tweakpane を使った GUI の設定
  const pane = new Pane();
  const parameter = {
    culling: true,
    depthTest: true,
    rotation: false,
  };
  // バックフェイスカリングの有効・無効
  pane.addBinding(parameter, 'culling')
    .on('change', (v) => {
      app.setCulling(v.value);
    });
  // 深度テストの有効・無効
  pane.addBinding(parameter, 'depthTest')
    .on('change', (v) => {
      app.setDepthTest(v.value);
    });
  // 回転の有無
  pane.addBinding(parameter, 'rotation')
    .on('change', (v) => {
      app.setRotation(v.value);
    });
}, false);

/**
 * アプリケーション管理クラス
 */
class App {
  canvas;            // WebGL で描画を行う canvas 要素
  gl;                // WebGLRenderingContext （WebGL コンテキスト）
  program;           // WebGLProgram （プログラムオブジェクト）
  attributeLocation; // attribute 変数のロケーション
  attributeStride;   // attribute 変数のストライド
  icosahedron20;     // 20面体のジオメトリ情報
  icosahedron20VBO;  // 20面体の頂点バッファ
  icosahedron20IBO;  // 20面体のインデックスバッファ
  uniformLocation;   // uniform 変数のロケーション
  startTime;         // レンダリング開始時のタイムスタンプ
  isRendering;       // レンダリングを行うかどうかのフラグ
  isRotation;        // オブジェクトを Y 軸回転させるかどうか
  camera;            // WebGLOrbitCamera のインスタンス

  constructor() {
    // this を固定するためのバインド処理
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * バックフェイスカリングを設定する
   * @param {boolean} flag - 設定する値
   */
  setCulling(flag) {
    const gl = this.gl;
    if (gl == null) { return; }
    if (flag === true) {
      gl.enable(gl.CULL_FACE);
    } else {
      gl.disable(gl.CULL_FACE);
    }
  }

  /**
   * 深度テストを設定する
   * @param {boolean} flag - 設定する値
   */
  setDepthTest(flag) {
    const gl = this.gl;
    if (gl == null) { return; }
    if (flag === true) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }
  }

  /**
   * isRotation を設定する
   * @param {boolean} flag - 設定する値
   */
  setRotation(flag) {
    this.isRotation = flag;
  }

  /**
   * 初期化処理を行う
   */
  init() {
    // canvas エレメントの取得と WebGL コンテキストの初期化
    this.canvas = document.getElementById('webgl-canvas');
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

    // カメラ制御用インスタンスを生成する
    const cameraOption = {
      distance: 5.0, // Z 軸上の初期位置までの距離
      min: 1.0,      // カメラが寄れる最小距離
      max: 10.0,     // カメラが離れられる最大距離
      move: 2.0,     // 右ボタンで平行移動する際の速度係数
    };
    this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

    // 最初に一度リサイズ処理を行っておく
    this.resize();

    // リサイズイベントの設定
    window.addEventListener('resize', this.resize, false);

    // バックフェイスカリングと深度テストは初期状態で有効
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  /**
   * リサイズ処理
   */
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * 各種リソースのロードを行う
   * @return {Promise}
   */
  load() {
    return new Promise(async (resolve, reject) => {
      const gl = this.gl;
      if (gl == null) {
        // もし WebGL コンテキストがない場合はエラーとして Promise を reject する
        const error = new Error('not initialized');
        reject(error);
      } else {
        // シェーダのソースコードを読み込みシェーダとプログラムオブジェクトを生成する
        const VSSource = await WebGLUtility.loadFile('./main.vert');
        const FSSource = await WebGLUtility.loadFile('./main.frag');
        const vertexShader = WebGLUtility.createShaderObject(gl, VSSource, gl.VERTEX_SHADER);
        const fragmentShader = WebGLUtility.createShaderObject(gl, FSSource, gl.FRAGMENT_SHADER);
        this.program = WebGLUtility.createProgramObject(gl, vertexShader, fragmentShader);
        // Promsie を解決
        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    // 20面体のジオメトリ情報を取得
    const rad = 1;
    const color = [1.0, 1.0, 1.0, 1.0];
    this.icosahedron20 = WebGLGeometry.icosahedron(rad, color)

    // VBO と IBO を生成する
    // 法線は頂点に対してある=>20面体だと球中心から頂点方向に向かう
    // 面を貼り合わせた方が適切な法線を出せそう。=> 012,123みたいなidxを使うと0の法線は両方で使うのか。
    this.icosahedron20VBO = [
      WebGLUtility.createVBO(this.gl, this.icosahedron20.position),
      WebGLUtility.createVBO(this.gl, this.icosahedron20.normal),
      WebGLUtility.createVBO(this.gl, this.icosahedron20.color),
    ];
    this.icosahedron20IBO = WebGLUtility.createIBO(this.gl, this.icosahedron20.index);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // attribute location の取得
    this.attributeLocation = [
      gl.getAttribLocation(this.program, 'position'),
      gl.getAttribLocation(this.program, 'normal'),
      gl.getAttribLocation(this.program, 'color'),
    ];
    // attribute のストライド
    this.attributeStride = [
      3,
      3,
      4,
    ];
    // uniform location の取得
    this.uniformLocation = {
      mvpMatrix: gl.getUniformLocation(this.program, 'mvpMatrix'),
      normalMatrix: gl.getUniformLocation(this.program, 'normalMatrix'),
      mMatrix: gl.getUniformLocation(this.program, 'mMatrix'),
      light: gl.getUniformLocation(this.program, 'light'),
      lightMMatrix: gl.getUniformLocation(this.program, 'lightMMatrix'),
    };
  }

  /**
   * webgl extensionの追加
   */
  setupExtension() {
    const gl = this.gl;
    if (!gl.getExtension('OES_standard_derivatives')) {
      console.log('OES_standard_derivatives is not supported');
      return false;
    }

    return true;
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色と深度を設定する
    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * 描画を開始する
   */
  start() {
    // レンダリング開始時のタイムスタンプを取得しておく
    this.startTime = Date.now();
    // レンダリングを行っているフラグを立てておく
    this.isRendering = true;
    // レンダリングの開始
    this.render();
  }

  /**
   * 描画を停止する
   */
  stop() {
    this.isRendering = false;
  }

  /**
   * レンダリングを行う
   */
  render() {
    const gl = this.gl;

    // レンダリングのフラグの状態を見て、requestAnimationFrame を呼ぶか決める
    if (this.isRendering === true) {
      requestAnimationFrame(this.render);
    }

    // 現在までの経過時間
    const nowTime = (Date.now() - this.startTime) * 0.001;

    // レンダリングのセットアップ
    this.setupRendering();

    // モデル座標変換行列（フラグが立っている場合だけ回転させる）
    const rotateAxis = Vec3.create(0.0, 1.0, 0.0);
    const m = this.isRotation === true ?
      Mat4.rotate(Mat4.identity(), nowTime, rotateAxis) :
      Mat4.identity();

    // ビュー・プロジェクション座標変換行列
    const v = this.camera.update();
    const fovy = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1
    const far = 10.0;
    const p = Mat4.perspective(fovy, aspect, near, far);

    // 行列を乗算して MVP 行列を生成する（掛ける順序に注意）
    const vp = Mat4.multiply(p, v);
    const mvp = Mat4.multiply(vp, m);

    // モデル座標変換行列の、逆転置行列を生成する @@@
    const normalMatrix = Mat4.transpose(Mat4.inverse(m));

    // モデル座業返還行列
    const mMatrix = m;

    // 遠くに於いたらほぼdirectional lightと同じ
    // const light = [100.0, 0.0, 0.0]
    const light = [2.0, 0.0, 2.0]
    const lightRotateAxis = Vec3.create(1.0, 1.0, 1.0);
    const lightMMatrix = Mat4.rotate(Mat4.identity(), nowTime / 2, lightRotateAxis);

    // プログラムオブジェクトを選択し uniform 変数を更新する @@@
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uniformLocation.mvpMatrix, false, mvp);
    gl.uniformMatrix4fv(this.uniformLocation.normalMatrix, false, normalMatrix);
    gl.uniformMatrix4fv(this.uniformLocation.mMatrix, false, mMatrix);
    gl.uniformMatrix4fv(this.uniformLocation.lightMMatrix, false, lightMMatrix);
    gl.uniform3fv(this.uniformLocation.light, light);

    // VBO と IBO を設定し、描画する
    WebGLUtility.enableBuffer(gl, this.icosahedron20VBO, this.attributeLocation, this.attributeStride, this.icosahedron20IBO);
    gl.drawElements(gl.TRIANGLES, this.icosahedron20.index.length, gl.UNSIGNED_SHORT, 0);
  }
}

