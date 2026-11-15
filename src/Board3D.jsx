import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  TorusGeometry,
  Vector2,
  WebGLRenderer,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const CELL_POSITIONS = Array.from({ length: 9 }, (_, index) => ({
  x: ((index % 3) - 1) * 1.8,
  z: (Math.floor(index / 3) - 1) * 1.8,
}));

export default function Board3D({
  squares,
  winningLine,
  onMove,
  statusText,
}) {
  const mountRef = useRef(null);
  const latestGameRef = useRef({ squares, winningLine, onMove, focusedIndex: 4 });
  const updateAppearanceRef = useRef(() => {});
  const [focusedIndex, setFocusedIndex] = useState(4);
  const [webglError, setWebglError] = useState(false);

  latestGameRef.current = { squares, winningLine, onMove, focusedIndex };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglError(true);
      return undefined;
    }

    setWebglError(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = "srgb";
    renderer.shadowMap.enabled = true;
    renderer.domElement.className = "board-canvas";
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "application");
    renderer.domElement.setAttribute("aria-label", "Three dimensional Tic-Tac-Toe board");
    renderer.domElement.setAttribute(
      "aria-describedby",
      "board-instructions board-status",
    );
    mount.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(6.7, 8.6, 9.2);
    camera.lookAt(0, 0, 0);

    scene.add(new AmbientLight(0xffffff, 1.25));
    const keyLight = new DirectionalLight(0xfff3dc, 3.2);
    keyLight.position.set(-4, 9, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    scene.add(keyLight);

    const board = new Mesh(
      new RoundedBoxGeometry(5.85, 0.42, 5.85, 5, 0.14),
      new MeshStandardMaterial({
        color: 0xe7dfd1,
        roughness: 0.74,
        metalness: 0.02,
      }),
    );
    board.position.y = -0.24;
    board.receiveShadow = true;
    scene.add(board);

    const tileGeometry = new RoundedBoxGeometry(1.68, 0.34, 1.68, 4, 0.12);
    const xMaterial = new MeshStandardMaterial({
      color: 0xe8876e,
      roughness: 0.34,
      metalness: 0.08,
    });
    const oMaterial = new MeshStandardMaterial({
      color: 0x79a88b,
      roughness: 0.34,
      metalness: 0.08,
    });
    const xBarGeometry = new BoxGeometry(0.17, 0.17, 1.12);
    const oGeometry = new TorusGeometry(0.48, 0.105, 18, 48);
    const tiles = [];
    const markGroups = [];

    CELL_POSITIONS.forEach(({ x, z }, index) => {
      const cell = new Group();
      cell.position.set(x, 0, z);

      const tile = new Mesh(
        tileGeometry,
        new MeshStandardMaterial({
          color: 0xf8f4ec,
          roughness: 0.48,
          metalness: 0.015,
        }),
      );
      tile.position.y = 0.015;
      tile.castShadow = true;
      tile.receiveShadow = true;
      tile.userData.index = index;
      cell.add(tile);
      tiles.push(tile);

      const xMark = new Group();
      xMark.position.y = 0.39;
      [-Math.PI / 4, Math.PI / 4].forEach((rotation) => {
        const bar = new Mesh(xBarGeometry, xMaterial);
        bar.rotation.y = rotation;
        bar.castShadow = true;
        xMark.add(bar);
      });

      const oMark = new Mesh(oGeometry, oMaterial);
      oMark.rotation.x = Math.PI / 2;
      oMark.position.y = 0.39;
      oMark.castShadow = true;

      const markGroup = new Group();
      markGroup.add(xMark, oMark);
      cell.add(markGroup);
      markGroups.push({ xMark, oMark });
      scene.add(cell);
    });

    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const canvas = renderer.domElement;
    let hoveredIndex = -1;
    let frameId;

    function updateTileAppearance() {
      const { squares: currentSquares, winningLine: currentWinningLine, focusedIndex: currentFocusedIndex } =
        latestGameRef.current;
      tiles.forEach((tile, index) => {
        const isWinning = currentWinningLine.includes(index);
        const isFocused = currentFocusedIndex === index;
        const isHovered = hoveredIndex === index;
        tile.material.color.setHex(
          isWinning ? 0xd9ead8 : isHovered || isFocused ? 0xfffcf5 : 0xf8f4ec,
        );
        tile.material.emissive.setHex(isWinning ? 0x5e9b69 : 0x000000);
        tile.material.emissiveIntensity = isWinning ? 0.16 : 0;
        tile.parent.scale.setScalar(isFocused ? 1.025 : isHovered ? 1.015 : 1);
      });

      markGroups.forEach(({ xMark, oMark }, index) => {
        xMark.visible = currentSquares[index] === "X";
        oMark.visible = currentSquares[index] === "O";
      });
    }
    updateAppearanceRef.current = updateTileAppearance;

    function getCellAt(event) {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(tiles, false)[0]?.object.userData.index ?? -1;
    }

    function handlePointerMove(event) {
      const nextIndex = getCellAt(event);
      if (nextIndex === hoveredIndex) return;
      hoveredIndex = nextIndex;
      canvas.style.cursor =
        nextIndex >= 0 && !latestGameRef.current.squares[nextIndex]
          ? "pointer"
          : "default";
      updateTileAppearance();
    }

    function handlePointerLeave() {
      hoveredIndex = -1;
      canvas.style.cursor = "default";
      updateTileAppearance();
    }

    function handlePointerDown(event) {
      const index = getCellAt(event);
      if (index >= 0) latestGameRef.current.onMove(index);
    }

    function handleKeyDown(event) {
      if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        setFocusedIndex(index);
        latestGameRef.current.onMove(index);
        event.preventDefault();
        return;
      }

      const currentIndex = latestGameRef.current.focusedIndex;
      const row = Math.floor(currentIndex / 3);
      const column = currentIndex % 3;
      const nextPosition = {
        ArrowUp: [Math.max(0, row - 1), column],
        ArrowDown: [Math.min(2, row + 1), column],
        ArrowLeft: [row, Math.max(0, column - 1)],
        ArrowRight: [row, Math.min(2, column + 1)],
      }[event.key];

      if (nextPosition) {
        setFocusedIndex(nextPosition[0] * 3 + nextPosition[1]);
        event.preventDefault();
      } else if (event.key === "Enter" || event.key === " ") {
        latestGameRef.current.onMove(currentIndex);
        event.preventDefault();
      }
    }

    function resize() {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("keydown", handleKeyDown);

    function render() {
      frameId = requestAnimationFrame(render);
      renderer.render(scene, camera);
    }
    render();
    updateTileAppearance();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("keydown", handleKeyDown);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      canvas.remove();
      updateAppearanceRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    updateAppearanceRef.current();
  }, [focusedIndex, squares, winningLine]);

  return (
    <div className="board-frame">
      <div className="board-scene" ref={mountRef} />
      {webglError && (
        <p className="webgl-error" role="alert">
          This browser could not start WebGL. Try enabling hardware acceleration
          or using a WebGL-capable browser.
        </p>
      )}
      <span className="visually-hidden" id="board-status" aria-live="polite">
        {statusText}
      </span>
    </div>
  );
}
