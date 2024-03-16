import {
	FilesetResolver,
	PoseLandmarker,
	FaceLandmarker,
	DrawingUtils,
} from "@mediapipe/tasks-vision";
import landmarkerModelPath from "/models/face_landmarker.task?url";
import poseLandmarkerModelPath from "/models/pose_landmarker_lite.task?url";

let runningMode = "IMAGE";
let faceLandmarker;
let poseLandmarker;

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

let displayContainer = document.getElementById("video-detections-container");
const canvas = document.querySelector("#video-canvas");
// const canvas = document.createElement("canvas");
// canvas.setAttribute("class", "canvas");
// canvas.setAttribute("id", "video-canvas");
// displayContainer.appendChild(canvas);

async function enableCamForLandmarker(event) {
	// Hide button
	enableWebcamButton.style.display = "none";

	// Set parameters for getUsermedia
	const constraints = {
		video: true,
	};

	// Activate the webcam stream.
	navigator.mediaDevices
		.getUserMedia(constraints)
		.then(function (stream) {
			video.srcObject = stream;
			video.addEventListener("loadeddata", detectLandmarksInWebcam);
		})
		.catch((err) => {
			console.error(err);
		});
}

async function detectLandmarksInWebcam() {
	// if image mode is initialized, create a new classifier with video runningMode
	if (runningMode === "IMAGE") {
		runningMode = "VIDEO";
		await faceLandmarker.setOptions({ runningMode: "VIDEO" });
		await poseLandmarker.setOptions({ runningMode: "VIDEO" });
		/* Canvas size = Actual image size, to match resolution */
		canvas.setAttribute("width", video.videoWidth + "px");
		canvas.setAttribute("height", video.videoHeight + "px");
	}

	let startTimeMs = performance.now();

	// displayContainer.appendChild(canvas);

	// Detect faces using detectForVideo
	if (video.currentTime !== lastVideoTime) {
		lastVideoTime = video.currentTime;

		const detections = faceLandmarker.detectForVideo(video, startTimeMs);
		// const poseDetections = poseLandmarker.detectForVideo(video, startTimeMs);
		const poseDetections = {};

		if (document.getElementById("collect-data").checked) {
			detectionData[Date.now()] = detections;
		}

		/* Draw on canvas using DrawingUtils */
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); //clear canvas before redrawing
		const drawingUtils = new DrawingUtils(ctx);

		if (detections.faceLandmarks) {
			for (const landmarks of detections.faceLandmarks) {
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
				drawingUtils.drawConnectors(
					landmarks,
					FaceLandmarker.FACE_LANDMARKS_LIPS,
					{
						color: "#E0E0E0",
					}
				);
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

		if (poseDetections.landmarks) {
			for (const landmark of poseDetections.landmarks) {
				drawingUtils.drawLandmarks(landmark, {
					radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
				});
				drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
			}
		}
	}

	// Call this function again to keep predicting when the browser is ready
	window.requestAnimationFrame(detectLandmarksInWebcam);
}

function sendData() {
	if (document.getElementById("collect-data").checked) {
		console.log("Detection Data: ");
		console.log(detectionData);
		detectionData = {};
	}
	setTimeout(sendData, 5000);
}

sendData();
