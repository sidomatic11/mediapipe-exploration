//TODO - remap coordinates to threejs canvas

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
camera.position.z = 10;

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
	canvasSize.width = canvas.width = event[0].target.clientWidth;
	canvasSize.height = canvas.height = event[0].target.clientHeight;
	camera.aspect = canvasSize.width / canvasSize.height;
	renderer.setSize(canvasSize.width, canvasSize.height);
	camera.updateProjectionMatrix();
	console.log("resize zala");
});

resizeObserver.observe(document.getElementById("liveView"));

/* SECTION: Scene Objects */
const geometry = new THREE.PlaneGeometry(1, 1);
const material = new THREE.MeshBasicMaterial({
	color: 0xff0000,
	side: THREE.DoubleSide,
});
const plane = new THREE.Mesh(geometry, material);
// scene.add(plane);

const circleGeometry = new THREE.CircleGeometry(1, 12);
const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const eyeLeft = new THREE.Mesh(circleGeometry, circleMaterial);
const pupilLeft = new THREE.Mesh(circleGeometry, pupilMaterial);
eyeLeft.scale.x = 0.5;
eyeLeft.scale.y = 0.6;
pupilLeft.scale.x = 0.3;
pupilLeft.scale.y = 0.3;
pupilLeft.position.y = -0.5;
pupilLeft.position.z = 0.1;
eyeLeft.add(pupilLeft);
scene.add(eyeLeft);
const eyeRight = new THREE.Mesh(circleGeometry, circleMaterial);
const pupilRight = new THREE.Mesh(circleGeometry, pupilMaterial);
eyeRight.scale.x = 0.5;
eyeRight.scale.y = 0.6;
pupilRight.scale.x = 0.3;
pupilRight.scale.y = 0.3;
pupilRight.position.y = -0.5;
pupilRight.position.z = 0.1;
eyeRight.add(pupilRight);
scene.add(eyeRight);

/* SECTION: Animate */

function animate() {
	renderer.render(scene, camera);
	// requestAnimationFrame(animate);
}

const visibleHeightAtZDepth = (depth, camera) => {
	// compensate for cameras not positioned at z=0
	const cameraOffset = camera.position.z;
	if (depth < cameraOffset) depth -= cameraOffset;
	else depth += cameraOffset;

	// vertical fov in radians
	const vFOV = (camera.fov * Math.PI) / 180;

	// Math.abs to ensure the result is always positive
	return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
	const height = visibleHeightAtZDepth(depth, camera);
	return height * camera.aspect;
};

// animate();

export function updatePosition(landmarks) {
	console.log("exported function called.");
	let visibleHeight = visibleHeightAtZDepth(0, camera);
	let visibleWidth = visibleWidthAtZDepth(0, camera);
	// plane.scale.y = visibleHeight - 1;
	// plane.scale.x = visibleWidth - 1;
	if (landmarks[0]) {
		let leftEyePosition = landmarks[0][468];
		let rightEyePosition = landmarks[0][473];
		// console.log("left eye");
		// console.log(leftEye);
		// console.log("right eye");
		// console.log(rightEye);
		eyeLeft.position.x = leftEyePosition.x * visibleWidth - visibleWidth / 2;
		eyeLeft.position.y = -leftEyePosition.y * visibleHeight + visibleHeight / 2;

		eyeRight.position.x = rightEyePosition.x * visibleWidth - visibleWidth / 2;
		eyeRight.position.y =
			-rightEyePosition.y * visibleHeight + visibleHeight / 2;
		// let zero = landmarks[0][0];
		// plane.position.x = zero.x * 5 - 2.5;
		// plane.position.y = -zero.y * 5 + 2.5;
		animate();
		//TODO - window/canvas dimensions, how do they map to coordinates?
		//TODO - maybe a plane with dimensions of canvas?
	}
}
