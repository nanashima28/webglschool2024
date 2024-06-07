
// = 016 ======================================================================
// １つ前のサンプルで見たようにエフェクトコンポーザーを使っている場合は、描画さ
// れる順番を管理しているのはエフェクトコンポーザーになります。
// さらに新しいパスをコンポーザーに追加する際には、その順序が非常に重要になりま
// すので、ここでドットスクリーンパスをさらに追加し、それらについてしっかりと理
// 解を深めておきましょう。
// ============================================================================

// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';
import { EffectComposer } from '../lib/EffectComposer.js';
import { RenderPass } from '../lib/RenderPass.js';
import { GlitchPass } from '../lib/GlitchPass.js';
// ポストプロセス用のファイルを追加 @@@
import { DotScreenPass } from '../lib/DotScreenPass.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);

class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 100.0,
    position: new THREE.Vector3(0.0, 0.5, 90.0),
    lookAt: new THREE.Vector3(0.0, 10.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0xe6e6e6,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.1,
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
    color: 0xe6e6e6,
    near: 5.0,
    far: 100.0,
  };

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  torusGeometry;    // トーラスジオメトリ
  torusArray;       // トーラスメッシュの配列
  planeGeometry;    // プレーンジオメトリ
  planeArray;       // プレーンメッシュの配列
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ
  group;            // グループ
  composer;         // エフェクトコンポーザー
  renderPass;       // レンダーパス
  glitchPass;       // グリッチパス
  dotScreenPass;    // ドットスクリーンパス @@@

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // フォグ
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


    // @@@ SpotLightの追加
    const spotLight = new THREE.SpotLight(0xffffff, 100);
    spotLight.position.set(-10, 30, 0);
    this.scene.add(spotLight);
    spotLight.castShadow = true;

    // // アンビエントライト（環境光）
    // this.ambientLight = new THREE.AmbientLight(
    //   ThreeApp.AMBIENT_LIGHT_PARAM.color,
    //   ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    // );
    // this.scene.add(this.ambientLight);

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

    // グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);


    this.floor = new THREE.Group();
    this.floor.position.set(0, -92, 0);


    this.lRotateTable1 = new RoundTableFans(5, 10);
    this.lRotateTable1.position.set(-40, 0, -20);
    this.lRotateTable2 = new RoundTableFans(5, 20);
    this.lRotateTable2.position.set(-40, 0, -20);
    this.lRotateTable3 = new RoundTableFans(5, 30);
    this.lRotateTable3.position.set(-40, 10, -20);

    this.rRotateTable1 = new RoundTableFans(5, 10);
    this.rRotateTable1.position.set(80, -30, -35);
    this.rRotateTable2 = new RoundTableFans(5, 30);
    this.rRotateTable2.position.set(80, -30, -35);
    
    this.cRotateTable = new RoundTableFans(2, 78);

    this.pRotateTable = new RoundTableFans(3, 78);
    this.rRotateTable2.position.set(80, 0, -35);

    this.floor.add(this.lRotateTable1);
    this.floor.add(this.lRotateTable2);
    this.floor.add(this.lRotateTable3);
    this.floor.add(this.rRotateTable1);
    this.floor.add(this.rRotateTable2);
    this.floor.add(this.cRotateTable);
    this.floor.add(this.pRotateTable)


    this.group.add(this.floor);


    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // コンポーザーの設定 @@@
    // 1. コンポーザーにレンダラを渡して初期化する
    this.composer = new EffectComposer(this.renderer);
    // 2. コンポーザーに、まず最初に「レンダーパス」を設定する
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // this のバインド
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

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

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    // this.controls.update();
    this.lRotateTable1.update();
    this.lRotateTable2.update();
    this.lRotateTable3.update();
    this.rRotateTable1.update();
    this.rRotateTable2.update();
    this.cRotateTable.update();
    this.pRotateTable.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      this.group.rotation.y += 0.05;
    }

    // レンダラーではなく、コンポーザーに対して描画を指示する
    this.composer.render();
  }
}

class RoundTableFans extends THREE.Group {
  rotateFans = [];
  funMinHeight = 45;
  rotateYSp = (Math.random() - 0.5) / 40;
  minFanCount = 5;

  constructor(count, radius) {
    super();
    const unit = 2 * Math.PI / count;
    for (let i = 0; i < count; i++) {
      const rotateFans = new RotateFans(this.minFanCount + Math.floor(Math.random() * 5));
      const x = radius * Math.cos(unit * i);
      const z = radius * Math.sin(unit * i);
      rotateFans.position.set(x, 0, z);
      this.add(rotateFans);
      this.rotateFans.push(rotateFans);
    }
  }

  update() {
    this.rotateFans.forEach(fun => fun.update());
    this.rotateY(this.rotateYSp)
  }

}

class RotateFans extends THREE.Group {
  fans = [];
  funMinHeight = 85;
  rotateYSp = (Math.random() - 0.5) / 30;
  constructor(funcCount = 7, radius = 20) {
    super();
    const unit = 2 * Math.PI / funcCount;
    for (let i = 0; i < funcCount; i++) {
      const random = Math.floor(Math.random() * 25);
      const h = (this.funMinHeight + random);
      const fun = new Fan(h);
      const x = radius * Math.cos(unit * i);
      const z = radius * Math.sin(unit * i);
      fun.position.set(x, 0, z);
      this.add(fun);
      this.fans.push(fun);
    }
  }

  update() {
    this.fans.forEach(fun => fun.update());
    this.rotateY(this.rotateYSp)
  }

}

class Fan extends THREE.Group {
  blades = new THREE.Group();
  bladesAndPillar = new THREE.Group();
  bladesBase = new THREE.Group();
  bladeCount = 3;
  bladeTilt = 0.3;
  bladePillarLen = 1.2;
  bladeRotateY = 0.5;
  bladeMaterial = new THREE.MeshPhongMaterial({ color: 0x898989 });
  bladesRotate = -0.1;
  bladesBaseRotateY = 0.01;

  standHeight = 50;

  stand = new THREE.Group();


  constructor(standHeight = 50, scale = 1) {
    super();
    this.standHeight = standHeight;
    this.createBlades();
    this.add(this.bladesBase);
    this.createFanStand();
    this.add(this.stand);
    this.castShadow = true;
    this.receiveShadow = true;
    this.scale.x = scale;
    this.scale.y = scale;
    this.scale.z = scale;
  }

  createFanStand() {
    const sphereGeometry = new THREE.SphereGeometry(0.5);
    const sphereMesh = new THREE.Mesh(sphereGeometry, this.bladeMaterial);
    sphereMesh.position.set(0, this.standHeight, 0)
    this.stand.add(sphereMesh);

    const pillarGeometry = new THREE.CylinderGeometry(0.5, 1.5, this.standHeight);
    const pillarMesh = new THREE.Mesh(pillarGeometry, this.bladeMaterial);
    pillarMesh.position.set(0, this.standHeight / 2, 0);
    this.stand.add(pillarMesh);

    const baseGeometry = new THREE.CylinderGeometry(5, 5, 0.5);
    const baseMesh = new THREE.Mesh(baseGeometry, this.bladeMaterial);
    baseMesh.position.set(0, 0.5 / 2, 0);
    this.stand.add(baseMesh);
  }

  createBlades() {
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(-3, 5);
    bladeShape.bezierCurveTo(-4, 7, 4, 7, 3, 5);
    bladeShape.lineTo(3, 5);

    const bladeExtrudeSetting = {
      steps: 2,
      depth: 0.1,
      bevelEnabled: true,
    };
    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, bladeExtrudeSetting);

    const rad = 2 * Math.PI / this.bladeCount;

    this.blades = new THREE.Group();
    for (let i = 0; i < this.bladeCount; i++) {
      const bladeMesh = new THREE.Mesh(bladeGeometry, this.bladeMaterial);
      const twistBlade = new THREE.Group();
      bladeMesh.rotateY(this.bladeRotateY);
      twistBlade.add(bladeMesh);
      twistBlade.rotateZ(rad * i);
      this.blades.add(twistBlade);
    }
    // this.blades.rotateX(-this.bladeTilt);
    this.blades.position.set(0, 0, this.bladePillarLen);
    this.bladesAndPillar.add(this.blades);

    const bladePillarGeometry = new THREE.CylinderGeometry(0.7, 0.3, this.bladePillarLen + 0.7);
    const bladePillarMesh = new THREE.Mesh(bladePillarGeometry, this.bladeMaterial);
    bladePillarMesh.position.set(0, 0, this.bladePillarLen / 2);
    bladePillarMesh.rotateX(Math.PI / 2);

    this.bladesAndPillar.add(bladePillarMesh);

    this.bladesAndPillar.rotateX(-this.bladeTilt);
    this.bladesAndPillar.position.set(0, this.standHeight, 0);
    this.bladesBase.add(this.bladesAndPillar);
  }

  update() {
    this.blades.rotateZ(this.bladesRotate);
    this.bladesBase.rotateY(this.bladesBaseRotateY);
  }
}