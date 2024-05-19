import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);


class FloorBoxController {
  _scene; // TODO: 何となくアンチパターンな気がする。どうなんだろう。
  _rows = [];
  _fallingRows = [];
  constructor() {
    this._rows.push(new FloorBoxRow());
  }

  initScene(scene) {
    this._rows.forEach(rowGroup => scene.add(rowGroup));
    this._scene = scene;
  }

  update() {
    this._rows.forEach(row => row.update());
    this._fallingRows.forEach(row => row.update());

    if (this._rows[this._rows.length - 1].position.z > 1) {
      const row = new FloorBoxRow();
      this._rows.push(row);
      this._scene.add(row);
    }
    if (this._rows[0].position.z > 5) {
      this._rows[0].setFalling(true);
      this._fallingRows.push(this._rows.shift());
    }
    this._fallingRows.forEach((row, index, arr) => {
      if (row.position.y < -20) {
        this._scene.remove(row);
        arr.splice(index, 1);
      }
    })
  }
}

const ROW_FALL_SPEED = 0.03;
const INIT_Z_POS = -3;
// @@@ Boxオブジェクトを纏める為用意。Groupってのも使えるらしい。
class FloorBoxRow extends THREE.Object3D {
  static BOX_PARAM = {
    material: {
      color: 0x3399ff
    }
  };
  _isFalling = false;
  _fallSpeed = ROW_FALL_SPEED;
  _boxArr = [];
  _floorMaterial;
  _boxCols = 6;
  _boxGeometryArr = [new THREE.BoxGeometry(1, 1, 1), new THREE.BoxGeometry(1, 1.2, 1), new THREE.BoxGeometry(1, 1.5, 1),];
  constructor() {
    super();
    this._floorMaterial = new THREE.MeshPhongMaterial(FloorBoxRow.BOX_PARAM.material);
    for (let i = 0; i < this._boxCols; ++i) {
      const idx = Math.floor(Math.random() * this._boxGeometryArr.length);
      const box = new FloorBox(this._boxGeometryArr[idx], this._floorMaterial, INIT_Z_POS);
      box.position.x = i - (this._boxCols - 1) / 2;
      this.add(box);
      this._boxArr.push(box);
    }
  }

  update() {
    this.position.z += 0.01;
    this._boxArr.forEach(b => b.update());
    if (this._isFalling) {
      this.position.y -= this._fallSpeed;
    }
  }

  setFalling(isFalling) {
    this._isFalling = true;
    this._boxArr.forEach(b => b.setFalling(isFalling));
  }
}

class FloorBox extends THREE.Mesh {
  _isFalling = false;
  _fallSpeed = Math.random() / 20;
  constructor(geometry, material, zPos) {
    super(geometry, material);
    this.receiveShadow = true;
    this.castShadow = true;
    this.position.z = zPos;
    this.scale.set(0.01, 0.01, 0.01);
    // @@@ 生成時アニメーションの為gsapを使用
    // TODO: 特定の大きさにしたい場合、updateよりは決めうちアニメーションの方が楽なんだろうか？それとも別の手段がある？要調査
    // gsap初めて使ったけどeaseとかでアニメーションの速度変更出来て面白い。多分もっと使いようがありそう。
    gsap.to(this.scale, { x: 1, y: 1, z: 1, duration: 1 });
  }

  setFalling(isFalling) {
    this._isFalling = isFalling;
  }

  update() {
    if (this._isFalling) {
      this.position.y -= this._fallSpeed;
    }
  }
}

class ThreeApp {
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 30.0,
    position: new THREE.Vector3(8.0, 6.0, 8.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };

  static RENDERER_PARAM = {
    clearColor: 0x000000,       // 画面をクリアする色
    width: window.innerWidth,   // レンダラーに設定する幅
    height: window.innerHeight, // レンダラーに設定する高さ
  };

  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.1,  // 光の強度
  };

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  ambientLight;     // 環境光（アンビエントライト）
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  floorBoxController; // 床に敷いているboxの制御 // 命名単語がいまいちかも

  constructor(wrapper) {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color, 0);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    // @@@ SpotLightの追加
    const spotLight = new THREE.SpotLight(0xffffff, 4);
    spotLight.position.set(0, 3, 0);
    this.scene.add(spotLight);
    spotLight.castShadow = true;

    // @@@ Box描画コントローラの追加（たぶんController以外の単語の方が使われそう？）
    this.floorBoxController = new FloorBoxController();
    this.floorBoxController.initScene(this.scene);

    // // 軸ヘルパー
    // const axesBarLength = 5.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

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
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    this.update();

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }

  update() {
    this.floorBoxController.update();
  }
}

