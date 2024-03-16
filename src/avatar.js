import * as THREE from "three";

/* SECTION: Performance Monitoring */
// const stats = new Stats();
// stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild(stats.dom);

/* SECTION: Scene Setup */

const canvas = document.querySelector("#avatar-canvas");
const canvasSize = {
	width: canvas.width,
	height: canvas.height,
};

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
	45,
	canvasSize.width / canvasSize.height,
	1,
	100
);
camera.position.z = 20;

/* Lighting */

/* Renderer */
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
	alpha: true,
});
renderer.setSize(canvasSize.width, canvasSize.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); //makes edges smoother, max 2 to avoid performance issues

/* Handle Responsiveness and Full Screen */
window.addEventListener("resize", () => {
	// camera.aspect = window.innerWidth / window.innerHeight;
	// camera.updateProjectionMatrix();

	// renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); //repeated here to account for monitor change
});

const resizeObserver = new ResizeObserver((event) => {
	canvasSize.width = canvas.width = event[0].target.width;
	canvasSize.height = canvas.height = event[0].target.height;
	camera.aspect = canvasSize.width / canvasSize.height;
	renderer.setSize(canvasSize.width, canvasSize.height);
	camera.updateProjectionMatrix();
	console.log("resize zala");
});

resizeObserver.observe(document.getElementById("video-canvas"));

/* SECTION: Scene Objects */
const geometry = new THREE.PlaneGeometry(1, 1);
const material = new THREE.MeshBasicMaterial({
	color: 0xff0000,
	side: THREE.DoubleSide,
});
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

/* SECTION: Animate */

function animate() {
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}

// animate();

function updatePosition() {}
