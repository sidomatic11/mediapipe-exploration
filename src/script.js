import {
	FilesetResolver,
	PoseLandmarker,
	FaceLandmarker,
	HandLandmarker,
	DrawingUtils,
} from "@mediapipe/tasks-vision";
import landmarkerModelPath from "/models/face_landmarker.task?url";
import poseLandmarkerModelPath from "/models/pose_landmarker_lite.task?url";
import handLandmarkerModelPath from "/models/hand_landmarker.task?url";
// import wasm from "@mediapipe/tasks-vision/wasm";
import { updatePosition } from "./avatar.js";
import Stats from "stats.js";

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update } from "firebase/database";

let runningMode = "IMAGE";
let faceLandmarker;
let poseLandmarker;
let handLandmarker;

/* SECTION: Performance Monitoring */
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

/* SECTION: INITIALIZE DETECTOR */

async function initializeFaceLandmarker() {
	const vision = await FilesetResolver.forVisionTasks(
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
	);

	faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
		baseOptions: {
			modelAssetPath: landmarkerModelPath,
			delegate: "GPU",
		},
		outputFaceBlendshapes: true,
		outputFacialTransformationMatrixes: true,
		runningMode,
		numFaces: 1,
	});
}

async function initializePoseLandmarker() {
	const vision = await FilesetResolver.forVisionTasks(
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
	);
	poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
		baseOptions: {
			modelAssetPath: poseLandmarkerModelPath,
			delegate: "GPU",
		},
		runningMode: runningMode,
	});
}

initializePoseLandmarker().then(() => {
	initializeFaceLandmarker().then(() => {
		document.getElementById("loading").remove();
	});
});

/* SECTION: IMAGE DETECTION */

const imageInput = document.getElementById("imageInput");

if (imageInput) {
	imageInput.addEventListener("change", function () {
		const imageTag = document.getElementById("image1");
		const file = this.files[0];
		const reader = new FileReader();
		reader.onload = function (e) {
			imageTag.src = e.target.result;
			imageTag.onload = detectLandmarksInImage;
		};
		reader.readAsDataURL(file);
	});
}

function detectLandmarksInImage() {
	const image = document.getElementById("image1");
	const faceLandmarkerResult = faceLandmarker.detect(image);
	console.log(faceLandmarkerResult);

	let displayContainer = document.getElementById("detections-container");
	displayContainer.innerHTML = "";

	const canvas = document.createElement("canvas");
	canvas.setAttribute("class", "canvas");

	/* Canvas size = Actual image size, to match resolution */
	canvas.setAttribute("width", image.naturalWidth + "px");
	canvas.setAttribute("height", image.naturalHeight + "px");

	displayContainer.appendChild(canvas);

	/* Draw on canvas using DrawingUtils */
	const ctx = canvas.getContext("2d");
	const drawingUtils = new DrawingUtils(ctx);
	for (const landmarks of faceLandmarkerResult.faceLandmarks) {
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_TESSELATION,
			{ color: "#C0C0C070", lineWidth: 1 }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
			{ color: "#FF3030" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
			{ color: "#FF3030" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
			{ color: "#30FF30" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
			{ color: "#30FF30" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
			{ color: "#E0E0E0" }
		);
		drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
			color: "#E0E0E0",
		});
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
			{ color: "#FF3030" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
			{ color: "#30FF30" }
		);
	}
}

/* SECTION: VIDEO DETECTION */

let video = document.getElementById("webcam");
let enableWebcamButton;
let lastVideoTime = -1;
let liveView = document.getElementById("liveView");
let detectionData = {};

// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

if (hasGetUserMedia()) {
	enableWebcamButton = document.getElementById("webcamButton");
	// enableWebcamButton.addEventListener("click", enableCam);
	enableWebcamButton.addEventListener("click", enableCamForLandmarker);
} else {
	console.warn("getUserMedia() is not supported by your browser");
}

// let displayContainer = document.getElementById("video-detections-container");
const landmarksCanvas = document.querySelector("#landmarks-canvas");
const handLandmarksCanvas = document.querySelector("#hand-landmarks-canvas");

async function enableCamForLandmarker(event) {
	// Hide button
	enableWebcamButton.style.display = "none";

	// Set parameters for getUsermedia with mirrored video
	const constraints = {
		video: true,
		// video: { facingMode: "user" },
	};

	// Activate the webcam stream.
	navigator.mediaDevices
		.getUserMedia(constraints)
		.then(function (stream) {
			video.srcObject = stream;
			// video.style.transform = "scaleX(-1)"; // Mirror the video feed
			video.addEventListener("loadeddata", detectLandmarksInWebcam);
		})
		.catch((err) => {
			console.error(err);
		});
}

function makeVideoFullScreen() {
	/* make video full screen */
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	let videoAspectRatio = video.videoWidth / video.videoHeight;
	let videoHeight = 0;
	let videoWidth = 0;

	if (windowAspectRatio >= videoAspectRatio) {
		//when window width is greater
		videoHeight = window.innerHeight;
		videoWidth = window.innerHeight * videoAspectRatio;
	} else {
		//when window height is greater
		videoWidth = window.innerWidth;
		videoHeight = window.innerWidth / videoAspectRatio;
	}
	liveView.style.height = videoHeight + "px";
	liveView.style.width = videoWidth + "px";
	liveView.style.display = "block";
}

let poseDetections = {};

async function detectLandmarksInWebcam() {
	// if image mode is initialized, create a new classifier with video runningMode
	if (runningMode === "IMAGE") {
		runningMode = "VIDEO";
		await faceLandmarker.setOptions({ runningMode: "VIDEO" });
		await poseLandmarker.setOptions({ runningMode: "VIDEO" });
		// await handLandmarker.setOptions({ runningMode: "VIDEO" });

		/* Canvas size = Actual image size, to match resolution */
		landmarksCanvas.setAttribute("width", video.videoWidth + "px");
		landmarksCanvas.setAttribute("height", video.videoHeight + "px");
		handLandmarksCanvas.setAttribute("width", video.videoWidth + "px");
		handLandmarksCanvas.setAttribute("height", video.videoHeight + "px");

		makeVideoFullScreen();
	}

	let startTimeMs = performance.now();

	if (video.currentTime !== lastVideoTime) {
		lastVideoTime = video.currentTime;

		const detections = faceLandmarker.detectForVideo(video, startTimeMs);
		// const handDetections = handLandmarker.detectForVideo(video, startTimeMs);
		const poseDetections = poseLandmarker.detectForVideo(video, startTimeMs);
		// const poseDetections = {};
		// detectHandLandmarks(startTimeMs);

		// Save data for collection
		if (document.getElementById("collect-data").checked) {
			detectionData[Date.now()] = detections;
		}

		if (detections.faceLandmarks) {
			/* Update avatar */
			// if (document.getElementById("show-avatar").checked) {
			updatePosition(detections.faceLandmarks, {});
			// }

			/* Render detection */
			// const ctx = landmarksCanvas.getContext("2d");
			// ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); //clear canvas before redrawing
			// drawFaceLandmarksOnCanvas(detections.faceLandmarks, ctx);
		}

		// if (handDetections.landmarks) {
		// 	const ctx2 = handLandmarksCanvas.getContext("2d");
		// 	ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height); //clear canvas before redrawing
		// 	drawHandLandmarksOnCanvas(handDetections.landmarks, ctx2);
		// }

		if (poseDetections.landmarks) {
			const ctx2 = handLandmarksCanvas.getContext("2d");
			ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height); //clear canvas before redrawing
			drawPoseDetectionsOnCanvas(poseDetections, ctx2);
		}
	}

	stats.update();

	// Call this function again to keep predicting when the browser is ready
	window.requestAnimationFrame(detectLandmarksInWebcam);
}

async function detectHandLandmarks(startTimeMs) {
	poseDetections = poseLandmarker.detectForVideo(video, startTimeMs);
}

function drawHandLandmarksOnCanvas(handLandmarks, canvasContext) {
	const drawingUtils = new DrawingUtils(canvasContext);
	for (const landmarks of handLandmarks) {
		drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS);
	}
}

function drawFaceLandmarksOnCanvas(faceLandmarks, canvasContext) {
	/* Draw on canvas using DrawingUtils */
	const drawingUtils = new DrawingUtils(canvasContext);

	for (const landmarks of faceLandmarks) {
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_TESSELATION,
			{ color: "#C0C0C070", lineWidth: 1 }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
			{ color: "#FF3030" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
			{ color: "#FF3030" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
			{ color: "#30FF30" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
			{ color: "#30FF30" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
			{ color: "#E0E0E0" }
		);
		drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
			color: "#E0E0E0",
		});
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
			{ color: "#FF3030" }
		);
		drawingUtils.drawConnectors(
			landmarks,
			FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
			{ color: "#30FF30" }
		);
	}
}

function drawPoseDetectionsOnCanvas(poseDetections, canvasContext) {
	/* Draw on canvas using DrawingUtils */
	const drawingUtils = new DrawingUtils(canvasContext);

	for (const landmark of poseDetections.landmarks) {
		drawingUtils.drawLandmarks(landmark, {
			radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
		});
		drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
	}
}

//!SECTION - Firebase Setup

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyB1Q5GBROyPANkwPEJhW_e5xbjqEK00OTE",
	authDomain: "project-avatar-c5ff1.firebaseapp.com",
	databaseURL: "https://project-avatar-c5ff1-default-rtdb.firebaseio.com",
	projectId: "project-avatar-c5ff1",
	storageBucket: "project-avatar-c5ff1.appspot.com",
	messagingSenderId: "619120449553",
	appId: "1:619120449553:web:c525b308e7f2c18d77b9b0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Write data to Firebase
function writeData(data) {
	console.log("Sending to Firebase!");
	const db = getDatabase(app);
	const reference = ref(db);
	update(reference, data);
}

// Send data to Firebase every 5 seconds
function sendData() {
	if (document.getElementById("collect-data").checked) {
		console.log("Detection Data: ");
		console.log(detectionData);
		writeData(detectionData);
		detectionData = {};
	}
	setTimeout(sendData, 5000);
}

sendData();

var w;

function startWorker() {
	if (typeof Worker !== "undefined") {
		if (typeof w == "undefined") {
			w = new Worker("demo-worker.js");
		}
		w.onmessage = function (event) {
			// document.getElementById("result").innerHTML = event.data;
			console.log(event.data);
		};
	} else {
		// document.getElementById("result").innerHTML =
		// 	"Sorry! No Web Worker support.";
		console.log("No Web Worker support.");
	}
}

function stopWorker() {
	w.terminate();
	w = undefined;
}

// startWorker();
