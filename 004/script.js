
// = 024 ======================================================================
// 3D model Credit "Pusheen - I'm busy" (https://skfb.ly/6SB7y) by porgy is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
// ============================================================================

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';
import { GLTFLoader } from '../lib/GLTFLoader.js'; // glTF のローダーを追加 @@@

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
  app.init();
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
    far: 50.0,
    position: new THREE.Vector3(0.0, 0.0, 6.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };

  static OFFSCREEN_CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0xffffff,
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
    color: 0x000000,
  };
  /**
   * レイが交差した際のマテリアル定義のための定数 @@@
   */
  static INTERSECTION_MATERIAL_PARAM = {
    color: 0x00ff00,
  };
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0xffffff,
    near: 15.0,
    far: 25.0,
  };

  static STAGE_PARAM = {
    size: 10,
  }

  static RENDER_TARGET_SIZE = 1024;

  wrapper;          // canvas の親要素
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  planeGeometry;    // トーラスジオメトリ
  stageArray;       // トーラスメッシュの配列
  gltf;          // テクスチャ
       // 素材Pathリスト
  gltfPathList = [
    {
      path: "./gltf/flying_bird.glb",
      scale: 3,
      bgColor: 0x000000,
      position: new THREE.Vector3(0, 2, 3),
      rotate: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, -1, 0).normalize(), Math.PI / 2)
    },
    {
      path: "./gltf/cat_rigged.glb",
      scale: 0.05,
      bgColor: 0x000000,
      position: new THREE.Vector3(0, 0, 0),
      rotate: new THREE.Quaternion(0, 0, 0, 0)
    },
  ]
  gltfDataList;      // gltfリスト
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ
  group;            // グループ
  raycaster;        // レイキャスター @@@
  clock;
  mixerArr;
  
  offscreenSceneArr;   // オフスクリーン用のシーン @@@
  offscreenCameraArr;  // オフスクリーン用のカメラ @@@
  planeArr;            // 板ポリゴン @@@
  renderTargetArr;     // オフスクリーン用のレンダーターゲット @@@
  blackColor;       // 背景色出し分けのため @@@
  whiteColor;       // 背景色出し分けのため @@@
  processingIdx = -1;

  
  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // this のバインド
    this.render = this.render.bind(this);

    // Raycaster のインスタンスを生成する @@@
    this.raycaster = new THREE.Raycaster();
    // マウスのクリックイベントの定義 @@@
    window.addEventListener('click', (mouseEvent) => {
      // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
      const x = mouseEvent.clientX / window.innerWidth * 2.0 - 1.0;
      const y = mouseEvent.clientY / window.innerHeight * 2.0 - 1.0;
      // スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
      const v = new THREE.Vector2(x, -y);
      // レイキャスターに正規化済みマウス座標とカメラを指定する
      this.raycaster.setFromCamera(v, this.camera);
      // scene に含まれるすべてのオブジェクト（ここでは Mesh）を対象にレイキャストする
      const intersects = this.raycaster.intersectObjects(this.planeArr);
      if(intersects.length > 0) {
        const id = intersects[0].object.uuid;
        const idx = this.planeArr.findIndex(p => p.uuid == id);
        this.processingIdx = idx;
      }

    }, false);

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
    
    // おふすくカメラ
    const tmpCamera = new THREE.PerspectiveCamera(
      ThreeApp.OFFSCREEN_CAMERA_PARAM.fovy,
      ThreeApp.OFFSCREEN_CAMERA_PARAM.aspect,
      ThreeApp.OFFSCREEN_CAMERA_PARAM.near,
      ThreeApp.OFFSCREEN_CAMERA_PARAM.far,
    );
    tmpCamera.position.copy(ThreeApp.OFFSCREEN_CAMERA_PARAM.position);
    tmpCamera.lookAt(ThreeApp.OFFSCREEN_CAMERA_PARAM.lookAt);

    // おふすく
    this.offscreenSceneArr = this.gltfPathList.map(p => new THREE.Scene());
    this.renderTargetArr = this.gltfPathList.map(p => new THREE.WebGLRenderTarget(ThreeApp.RENDER_TARGET_SIZE, ThreeApp.RENDER_TARGET_SIZE));
    this.offscreenCameraArr = this.gltfPathList.map(p => {
      const camera = tmpCamera.clone();
      camera.aspect = 1.0;
      camera.updateProjectionMatrix();
      return camera;
    });

    // レンダリング結果を可視化するのに、板ポリゴンを使う @@@
    const stageSize = ThreeApp.STAGE_PARAM.size;
    const planeGeometry = new THREE.PlaneGeometry(5.0, 5.0);
    this.planeArr = [];
    for (let idx = 0; idx < this.renderTargetArr.length; idx++) {
      const planeMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
      planeMaterial.map = this.renderTargetArr[idx].texture;
      const pl = new THREE.Mesh(planeGeometry, planeMaterial);
      pl.position.copy(new THREE.Vector3( stageSize * idx / 2 - stageSize / 4 , 0, 0))
      this.planeArr.push(pl);
    }

    this.planeArr.forEach(p => this.scene.add(p));

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

    this.offscreenSceneArr.forEach(offscreenScene => {
      const dirLight = this.directionalLight.clone();
      const ambLight = this.ambientLight.clone();
      offscreenScene.add(dirLight);
      offscreenScene.add(ambLight);
    });

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

    // stage
    this.planeGeometry = new THREE.PlaneGeometry(stageSize * 2, stageSize, 1, 1);
    this.stageArray = [];
    for (let idx = 0; idx < this.gltfPathList.length; idx++)  {
      const stage = new THREE.Group();
      const planeFloor = new THREE.Mesh(this.planeGeometry, this.material);
      planeFloor.rotateX(- Math.PI / 2);
      stage.add(planeFloor);
      const planeWall = new THREE.Mesh(this.planeGeometry, this.material);
      planeWall.position.set(0, stageSize / 2, - stageSize / 2);
      stage.add(planeWall);
      const scale = this.gltfPathList[idx].scale;
      this.gltfDataList[idx].scene.scale.set( scale, scale, scale);
      const positoin = this.gltfPathList[idx].position;
      this.gltfDataList[idx].scene.position.copy(positoin);
      this.gltfDataList[idx].scene.quaternion.premultiply(this.gltfPathList[idx].rotate);
      stage.add(this.gltfDataList[idx].scene);
      this.stageArray.push(stage);
      this.offscreenSceneArr[idx].add(stage);
    }

    // const stages = new THREE.Group();
    // this.stageArray.forEach((stage, index) => {
    //   const diff = stageSize * index + stageSize / 2;
    //   console.log(diff);
    //   stage.position.copy(new THREE.Vector3(diff, 0, 0));
    //   stages.add(stage);
    // });
    // stages.position.copy(new THREE.Vector3(- stageSize * this.gltfPathList.length / 2));
    // this.offscreenSceneArr[0].add(stages);

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.offscreenSceneArr[0].add(this.axesHelper);

    // アニメーション時間管理のための Clock オブジェクトを生成しておく @@@
    this.clock = new THREE.Clock();

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // キーの押下状態を保持するフラグ
    this.isDown = false;
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  async load() {
    this.gltfDataList = new Array(this.gltfPathList.length);
    const promises = [];
    this.actions = [];
    this.mixerArr = [];
    const loader = new GLTFLoader();
    this.gltfPathList.map(p => p.path).forEach((path) => {
      promises.push(
        new Promise((resolve) => {
          loader.load(path, (gltf) => {
            this.gltfDataList[this.gltfPathList.findIndex((p) => p.path == path)] = gltf;
            const mixer = new THREE.AnimationMixer(gltf.scene);
            const animations = gltf.animations;
            for(let i = 0; i < animations.length; ++i){
              const action = mixer.clipAction(animations[i]);
              action.setLoop(THREE.LoopRepeat);
              action.play();
              action.weight = i == 0 ? 1.0 : 0.0;
              this.actions.push(action);
            }
            this.mixerArr.push(mixer);
            resolve();
          });
        })
      );
    });
    return await Promise.all(promises);
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    // this.controls.update();

    const delta = this.clock.getDelta();
    if(this.processingIdx != -1) this.mixerArr[this.processingIdx].update(delta);

        // まず最初に、オフスクリーンレンダリングを行う @@@
    for (let idx = 0; idx < this.renderTargetArr.length ; idx++) {
      const renderTarget = this.renderTargetArr[idx];
      this.renderer.setRenderTarget(renderTarget);
      this.renderer.setSize(ThreeApp.RENDER_TARGET_SIZE, ThreeApp.RENDER_TARGET_SIZE);
      this.renderer.setClearColor(this.blackColor, 1.0);
      // オフスクリーン用のシーン（Duck が含まれるほう）を描画する
      this.renderer.render(this.offscreenSceneArr[idx], this.offscreenCameraArr[idx]);

      // 次に最終的な画面の出力用のシーンをレンダリングするため null を指定しもとに戻す @@@
      this.renderer.setRenderTarget(null);
      
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(this.whiteColor, 1.0);
    this.renderer.render(this.scene, this.camera);
  }
}
