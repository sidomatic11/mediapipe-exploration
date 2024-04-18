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
const light = new THREE.AmbientLight(0x404040); // soft white light
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.z = 10;
scene.add(directionalLight);

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

/* Resize based on webcam video size */
const resizeObserver = new ResizeObserver((event) => {
	canvasSize.width = canvas.width = event[0].target.clientWidth;
	canvasSize.height = canvas.height = event[0].target.clientHeight;
	camera.aspect = canvasSize.width / canvasSize.height;
	renderer.setSize(canvasSize.width, canvasSize.height);
	camera.updateProjectionMatrix();
});
resizeObserver.observe(document.getElementById("liveView"));

/* SECTION: Scene Objects */
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhongMaterial({
	color: 0xff0000,
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
// const plane = new THREE.Mesh(geometry, material);
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
// scene.add(eyeLeft);

const eyeRight = new THREE.Mesh(circleGeometry, circleMaterial);
const pupilRight = new THREE.Mesh(circleGeometry, pupilMaterial);
eyeRight.scale.x = 0.5;
eyeRight.scale.y = 0.6;
pupilRight.scale.x = 0.3;
pupilRight.scale.y = 0.3;
pupilRight.position.y = -0.5;
pupilRight.position.z = 0.1;
eyeRight.add(pupilRight);
// scene.add(eyeRight);

// Define the two points
const pointA = new THREE.Vector3(0, 0, 0);
const pointB = new THREE.Vector3(0, 0, 0);

// // Create a LineBasicMaterial (or LineDashedMaterial for dashed lines)
// const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });

// // Create a BufferGeometry and populate it with the points
// const lineGeometry = new THREE.BufferGeometry();
// lineGeometry.setFromPoints([pointA, pointB]);

// // Create a Line object from the geometry and material
// const line = new THREE.Line(lineGeometry, lineMaterial);

// // Add the line to the scene
// scene.add(line);

/* SECTION: Utility Functions */

const getVisibleHeightAtZDepth = (depth, camera) => {
	// compensate for cameras not positioned at z=0
	const cameraOffset = camera.position.z;
	if (depth < cameraOffset) depth -= cameraOffset;
	else depth += cameraOffset;

	// vertical fov in radians
	const vFOV = (camera.fov * Math.PI) / 180;

	// Math.abs to ensure the result is always positive
	return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const getVisibleWidthAtZDepth = (depth, camera) => {
	const height = getVisibleHeightAtZDepth(depth, camera);
	return height * camera.aspect;
};

/* SECTION: Animate */

function animate() {
	renderer.render(scene, camera);
	// requestAnimationFrame(animate);
}

let dataCapture = {};

export function updatePosition(landmarks) {
	let visibleHeight = getVisibleHeightAtZDepth(0, camera);
	let visibleWidth = getVisibleWidthAtZDepth(0, camera);

	if (landmarks[0]) {
		let leftEyePosition = landmarks[0][468];
		let rightEyePosition = landmarks[0][473];

		let newPointA = landmarks[0][10];
		let newPointB = landmarks[0][152];

		let centerPoint = landmarks[0][5];
		let lengthY = 0;

		let leftTragion = new THREE.Vector3(
			landmarks[0][127].x * visibleWidth - visibleWidth / 2,
			-landmarks[0][127].y * visibleHeight + visibleHeight / 2,
			0
		);

		let rightTragion = new THREE.Vector3(
			landmarks[0][356].x * visibleWidth - visibleWidth / 2,
			-landmarks[0][356].y * visibleHeight + visibleHeight / 2,
			0
		);

		let horizontalLength = leftTragion.distanceTo(rightTragion);

		eyeLeft.position.x = leftEyePosition.x * visibleWidth - visibleWidth / 2;
		eyeLeft.position.y = -leftEyePosition.y * visibleHeight + visibleHeight / 2;
		// console.log(leftEyePosition.z);

		eyeRight.position.x = rightEyePosition.x * visibleWidth - visibleWidth / 2;
		eyeRight.position.y =
			-rightEyePosition.y * visibleHeight + visibleHeight / 2;

		pointA.set(
			newPointA.x * visibleWidth - visibleWidth / 2,
			-newPointA.y * visibleHeight + visibleHeight / 2,
			0
		);
		pointB.set(
			newPointB.x * visibleWidth - visibleWidth / 2,
			-newPointB.y * visibleHeight + visibleHeight / 2,
			0
		);

		let pointC = new THREE.Vector3(pointB.x, pointA.y, 0);

		let lineLength = pointA.distanceTo(pointB);
		let oppositeSide = pointA.distanceTo(pointC);
		let rotationAngle = Math.asin(oppositeSide / lineLength);

		// setTimeout(() => {
		// console.log("Rotation Angle:", rotationAngle);
		// console.log("Point C X:", pointC.x, "Point C Y:", pointC.y);
		// }, 1000);
		if (pointA.x > pointB.x) {
			cube.rotation.z = -rotationAngle;
		} else {
			cube.rotation.z = rotationAngle;
		}

		if (document.getElementById("collect-data").checked) {
			dataCapture[Date.now()] = {
				pointA: {
					x: pointA.x,
					y: pointA.y,
				},
				pointB: {
					x: pointB.x,
					y: pointB.y,
				},
				calculatedPointC: {
					x: pointC.x,
					y: pointC.y,
				},
				angleInRadians: rotationAngle,
			};
		}

		lengthY = Math.abs(
			-newPointA.y * visibleHeight +
				visibleHeight / 2 -
				(-newPointB.y * visibleHeight + visibleHeight / 2)
		);
		cube.scale.y = lineLength;
		cube.scale.x = horizontalLength;
		cube.position.x = centerPoint.x * visibleWidth - visibleWidth / 2;
		cube.position.y = -centerPoint.y * visibleHeight + visibleHeight / 2;

		// line.geometry.setFromPoints([pointA, pointB]);
		// line.geometry.attributes.position.needsUpdate = true;
		animate();
	}
}

function logCoordinates(pointC, rotationAngle) {
	console.log("Rotation Angle:", rotationAngle);
	console.log("Point C X:", pointC.x, "Point C Y:", pointC.y);
	setTimeout(logCoordinates, 1000);
}

const checkbox = document.getElementById("collect-data");

checkbox.addEventListener("change", (event) => {
	if (event.target.checked) {
		console.log("Capturing data...");
	} else {
		console.log("Angle Data: ");
		console.log(dataCapture);
		dataCapture = {};
	}
});

// function sendData() {
// 	if (document.getElementById("collect-data").checked) {
// 		console.log("Angle Data: ");
// 		console.log(dataCapture);
// 		dataCapture = {};
// 	}
// 	setTimeout(sendData, 5000);
// }

// sendData();
