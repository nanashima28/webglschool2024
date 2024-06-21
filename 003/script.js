
// = 023 ======================================================================
// 注意：これはオマケのサンプルです！
// クォータニオンや、ベクトルの内積・外積などが登場しますので、かなり数学的に難
// しい内容となっています。このサンプルはあくまでもオマケです。
// 一見して意味がわからなくても気に病む必要はまったくありませんので、あまり過度
// に落ち込んだり心配したりしないようにしてください。
// このサンプルでは、人工衛星を三角錐で作られたロケットに置き換え、進行方向にき
// ちんと頭を向けるようにしています。
// 内積や外積といったベクトル演算は、実際にどのような使いみちがあるのかわかりに
// くかったりもするので、このサンプルを通じて雰囲気だけでも掴んでおくと、いつか
// 自分でなにか特殊な挙動を実現したい、となったときにヒントになるかもしれません。
// 内積・外積だけでもかなりいろんなことが実現できますので、絶対に損はしません。
// ============================================================================

// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
  app.init();
  app.render();
}, false);

class ThreeApp {
  /**
   * 地球の自転周期
   */
  static EARTH_ROTATE_SPEED = 0.005;
  /**
   * 太陽に掛けるスケール
   */
  static SUN_SCALE = 8;
  /**
   * 太陽の市
   */
  static SUN_POS_X = 40;
  /**
   * 星々
   */
  static STARS_PARAM = {
    count: 200,
    scale: 0.05,
    areaRadius: 25,
    colors: [0xAEE5D8, 0xE5D0E3, 0xDDFDFE]
  };
  /**
   * 惑星のスケール
   */
  static PLANET_SCALE = {
    marsScale: 0.5,
    mercuryScale: 1,
    venus_surfaceScale: 0.9
  }
  /**
   * 月に掛けるスケール
   */
  static MOON_SCALE = 0.27;
  /**
   * 月と地球の間の距離
   */
  static MOON_DISTANCE = 5.0;
  /**
   * 人工衛星の移動速度
   */
  static SATELLITE_SPEED = 0.05;
  /**
   * 人工衛星の曲がる力
   */
  static SATELLITE_TURN_SCALE = 0.1;
  /**
   * 飛行機の移動速度
   */
  static JET_SPEED = 0.05;
  /**
   * 飛行機の曲がる力
   */
  static JET_TURN_SCALE = 0.1;
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 100.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x00102E,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffcccc,
    intensity: 2.0,
    position: new THREE.Vector3(20.0, 0, 0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.8,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0x00102E,
    near: 5.0,
    far: 80.0,
  };

  wrapper;            // canvas の親要素
  renderer;           // レンダラ
  scene;              // シーン
  camera;             // カメラ
  directionalLight;   // 平行光源（ディレクショナルライト）
  ambientLight;       // 環境光（アンビエントライト）
  stars;      // 星々（ポイントライト配列）
  controls;           // オービットコントロール
  axesHelper;         // 軸ヘルパー
  isDown;             // キーの押下状態用フラグ
  clock;              // 時間管理用
  sphereGeometry;     // ジオメトリ
  coneGeometry;       // コーンジオメトリ @@@
  earth;              // 地球
  earthMaterial;      // 地球用マテリアル
  earthTexture;       // 地球用テクスチャ
  earthAxis;          // 地軸
  moon;               // 月
  moonMaterial;       // 月用マテリアル
  moonTexture;        // 月用テクスチャ
  satellite;          // 人工衛星
  satelliteMaterial;  // 人工衛星用マテリアル
  satelliteDirection; // 人工衛星の進行方向
  jet;                // 飛行機
  jetDirection;       // 飛行機の進行方向
  jetTurnDirectionByPointer // 飛行機の進行方向をマウスによって変更する方向
  sun;                // 太陽
  sunMaterial;        // 太陽用マテリアル
  sunTexture;         // 太陽用テクスチャ
  marsMaterial; // それぞれのマテリアル
  marsTexture; // それぞれのテクスチャ
  mercuryMaterial; // それぞれのマテリアル
  mercuryTexture; // それぞれのテクスチャ
  venus_surfaceMaterial; // それぞれのマテリアル
  venus_surfaceTexture; // それぞれのテクスチャ


  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener('keydown', (keyEvent) => {
      switch (keyEvent.key) {
        case ' ':
          this.isDown = true;
          break;
        default:
      }
    }, false);
    window.addEventListener('keyup', (keyEvent) => {
      this.isDown = false;
    }, false);

    // マウスカーソルの動きを検出できるようにする
    window.addEventListener('pointermove', (pointerEvent) => {
      // ポインター（マウスカーソル）のクライアント領域上の座標
      const pointerX = pointerEvent.clientX;
      const scaleX = pointerX / window.innerWidth * 2.0 - 1.0;
      // ベクトルを単位化する
      const vector = new THREE.Vector2(
        scaleX,
        0,
      );
      vector.normalize();
      // スケールを揃えた値を月の座標に割り当てる
      this.jetTurnDirectionByPointer = - scaleX * ThreeApp.JET_TURN_SCALE;
    }, false);

    // リサイズイベント
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      const earthPath = './earth.jpg';
      const moonPath = './moon.jpg';
      const sunPath = './sun.jpg';
      const marsPath = './mars.jpg';
      const mercuryPath = './mercury.jpg';
      const venus_surfacePath = './venus_surface.jpg';
      const loader = new THREE.TextureLoader();
      loader.load(earthPath, (earthTexture) => {
        // 地球用
        this.earthTexture = earthTexture;
        loader.load(moonPath, (moonTexture) => {
          // 月用
          this.moonTexture = moonTexture;
          loader.load(sunPath, (sunTexture) => {
            // 太陽用
            this.sunTexture = sunTexture;
            loader.load(marsPath, (marsTexture) => {
              // 火星用
              this.marsTexture = marsTexture;
                loader.load(mercuryPath, (mercuryTexture) => {
                // 水星用
                this.mercuryTexture = mercuryTexture;
                loader.load(venus_surfacePath, (venus_surfaceTexture) => {
                  // 金星用
                  this.venus_surfaceTexture = venus_surfaceTexture;
                  resolve();
              });
              });
            });
          });
        });
      });
    });
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    // 球体のジオメトリを生成
    this.sphereGeometry = new THREE.SphereGeometry(2, 32, 32);

    this.stars = [];
    const starMaterials = ThreeApp.STARS_PARAM.colors.map(c => new THREE.MeshPhongMaterial({ color: c }));
    const starArea = ThreeApp.STARS_PARAM.areaRadius;
    for (let i = 0; i < ThreeApp.STARS_PARAM.count; i++) {
      const star = new THREE.Mesh(this.sphereGeometry, starMaterials[i % starMaterials.length]);
      star.scale.setScalar(ThreeApp.STARS_PARAM.scale);
      const starPos = new THREE.Vector3((Math.random() - 0.5) * starArea / 2, (Math.random() - 0.5) * starArea / 2, (Math.random() - 0.5) * starArea / 2);
      const normalized = starPos.clone().normalize();
      star.position.copy(normalized.multiplyScalar(starArea / 2).add(starPos));
      this.stars.push(star);
      this.scene.add(star);
    }

    // 太陽のマテリアルとメッシュ
    this.sunMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.sunMaterial.map = this.sunTexture;
    this.sun = new THREE.Mesh(this.sphereGeometry, this.sunMaterial);
    // 太陽を大きくしてxの正の位置に移動
    this.sun.scale.setScalar(ThreeApp.SUN_SCALE);
    this.sun.position.set(ThreeApp.SUN_POS_X, 0.0, 0.0);
    this.scene.add(this.sun);

    this.mercuryMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.mercuryMaterial.map = this.mercuryTexture;
    this.mercury = new THREE.Mesh(this.sphereGeometry, this.mercuryMaterial);
    this.mercury.scale.setScalar(ThreeApp.PLANET_SCALE.mercuryScale);
    this.mercury.position.set(ThreeApp.SUN_POS_X / 2, 0, 0);
    this.scene.add(this.mercury);

    this.venus_surfaceMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.venus_surfaceMaterial.map = this.venus_surfaceTexture;
    this.venus_surface = new THREE.Mesh(this.sphereGeometry, this.venus_surfaceMaterial);
    this.venus_surface.scale.setScalar(ThreeApp.PLANET_SCALE.venus_surfaceScale);
    this.venus_surface.position.set(ThreeApp.SUN_POS_X / 4, 0 , 0);
    this.scene.add(this.venus_surface);

    this.marsMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.marsMaterial.map = this.marsTexture;
    this.mars = new THREE.Mesh(this.sphereGeometry, this.marsMaterial);
    this.mars.scale.setScalar(ThreeApp.PLANET_SCALE.marsScale);
    this.mars.position.set(-ThreeApp.SUN_POS_X / 2 , 0 , 0);
    this.scene.add(this.mars);


    // 地球のマテリアルとメッシュ
    this.earthMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.earthMaterial.map = this.earthTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    const earthBiasRad = 23.4 / 180 * Math.PI;
    this.earthAxis = new THREE.Vector3(Math.sin(earthBiasRad), Math.cos(earthBiasRad), 0);

    // 月のマテリアルとメッシュ
    this.moonMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.moonMaterial.map = this.moonTexture;
    this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);
    // 月はやや小さくして、さらに位置も動かす
    this.moon.scale.setScalar(ThreeApp.MOON_SCALE);
    this.moon.position.set(ThreeApp.MOON_DISTANCE, 0.0, 0.0);
    this.scene.add(this.moon);

    // コーンのジオメトリを生成 @@@
    this.coneGeometry = new THREE.ConeGeometry(0.2, 0.5, 32);
    // // 人工衛星のマテリアルとメッシュ
    // this.satelliteMaterial = new THREE.MeshPhongMaterial({ color: 0xff00dd });
    // this.satellite = new THREE.Mesh(this.coneGeometry, this.satelliteMaterial);
    // this.scene.add(this.satellite);
    // this.satellite.scale.setScalar(0.5);
    // // 人工衛星は北極の上あたりに配置し、初期状態は真上に向かって移動するようにしておく @@@
    // this.satellite.position.set(0.0, ThreeApp.MOON_DISTANCE, 0.0);
    // this.satelliteDirection = new THREE.Vector3(0.0, 1.0, 0.0).normalize();

    // 飛行機のマテリアルとメッシュ
    this.jetMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffdd });
    this.jet = new THREE.Mesh(this.coneGeometry, this.jetMaterial);
    this.scene.add(this.jet);
    this.jet.scale.setScalar(0.5);
    // 人工衛星は北極の上あたりに配置し、初期状態は真上に向かって移動するようにしておく @@@
    this.jet.position.set(0.0, - ThreeApp.MOON_DISTANCE / 2, 0.0);
    this.jet.rotateX(Math.PI / 2)
    this.jetDirection = new THREE.Vector3(0, 0.0, 1.0).normalize();
    this.jetTurnDirectionByPointer = 0;

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // Clock オブジェクトの生成
    this.clock = new THREE.Clock();
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // // フラグに応じてオブジェクトの状態を変化させる
    // if (this.isDown === true) {
    //   this.earth.rotation.y += 0.05;
    //   this.moon.rotation.y += 0.05;
    // }

    // // (A) 現在（前のフレームまで）の進行方向を変数に保持しておく @@@
    // const previousDirection = this.satelliteDirection.clone();
    // // (終点 - 始点) という計算を行うことで、２点間を結ぶベクトルを定義
    // const subVector = new THREE.Vector3().subVectors(this.moon.position, this.satellite.position);
    // // 長さに依存せず、向きだけを考えたい場合はベクトルを単位化する
    // subVector.normalize();
    // // 人工衛星の進行方向ベクトルに、向きベクトルを小さくスケールして加算する
    // this.satelliteDirection.add(subVector.multiplyScalar(ThreeApp.SATELLITE_TURN_SCALE));
    // // (B) 加算したことでベクトルの長さが変化するので、単位化してから人工衛星の座標に加算する
    // this.satelliteDirection.normalize();
    // const direction = this.satelliteDirection.clone();
    // this.satellite.position.add(direction.multiplyScalar(ThreeApp.SATELLITE_SPEED));

    // // (C) 変換前と変換後の２つのベクトルから外積で法線ベクトルを求める @@@
    // const normalAxis = new THREE.Vector3().crossVectors(previousDirection, this.satelliteDirection);
    // normalAxis.normalize();
    // // (D) 変換前と変換後のふたつのベクトルから内積でコサインを取り出す
    // const cos = previousDirection.dot(this.satelliteDirection);
    // // (D) コサインをラジアンに戻す
    // const radians = Math.acos(cos);
    // // 求めた法線ベクトルとラジアンからクォータニオンを定義
    // const qtn = new THREE.Quaternion().setFromAxisAngle(normalAxis, radians);
    // // 人工衛星の現在のクォータニオンに乗算する
    // this.satellite.quaternion.premultiply(qtn);


    // 新しいjetDirectionの算出
    {
      // 前の飛行機のpositionを保持
      const prevJetPos = this.jet.position.clone();
      const prevJetDirection = this.jetDirection.clone();

      // 飛行機の方向をマウスから取得した値で曲げる
      // 回転方向
      const subVector = new THREE.Vector3().subVectors(this.jet.position, this.earth.position).normalize();
      const pointerRad = Math.asin(this.jetTurnDirectionByPointer);
      const pointerQtn = new THREE.Quaternion().setFromAxisAngle(subVector, pointerRad);
      this.jetDirection.applyQuaternion(pointerQtn);

      // 新規directionから新しいpositionを取得
      const newPosition = (this.jet.position.clone().add(this.jetDirection.multiplyScalar(ThreeApp.JET_SPEED)).normalize()).multiplyScalar(ThreeApp.MOON_DISTANCE / 2);
      // 飛行機に新しいpositionを設定
      this.jet.position.copy(newPosition);
      // 新しいpos - 古いpos で新規のdirectionsを保存
      this.jetDirection = (new THREE.Vector3().subVectors(this.jet.position, prevJetPos)).normalize();

      // (C) 変換前と変換後の２つのベクトルから外積で法線ベクトルを求める @@@
      const normalAxis = new THREE.Vector3().crossVectors(prevJetDirection, this.jetDirection);
      normalAxis.normalize();
      // (D) 変換前と変換後のふたつのベクトルから内積でコサインを取り出す
      const cos = prevJetDirection.dot(this.jetDirection);
      // (D) コサインをラジアンに戻す
      const radians = Math.acos(cos);
      // 求めた法線ベクトルとラジアンからクォータニオンを定義
      const qtn = new THREE.Quaternion().setFromAxisAngle(normalAxis, radians);
      // 人工衛星の現在のクォータニオンに乗算する
      this.jet.quaternion.premultiply(qtn);
    }


    // 地軸の回転
    {
      // 前回のフレームからの経過時間の取得 @@@
      const time = this.clock.getElapsedTime();
      // 経過時間をそのままラジアンとしてサインとコサインを求める
      const sin = Math.sin(time);
      const cos = Math.cos(time);
      // 月の座標を（XZ 平面に水平に）動かす
      this.moon.position.set(
        cos * ThreeApp.MOON_DISTANCE,
        0.0,
        sin * ThreeApp.MOON_DISTANCE,
      );
      const qtn = new THREE.Quaternion().setFromAxisAngle(this.earthAxis, ThreeApp.EARTH_ROTATE_SPEED);
      this.earth.quaternion.premultiply(qtn);
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
