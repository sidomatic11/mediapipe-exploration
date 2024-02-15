import {
	FilesetResolver,
	FaceDetector,
	FaceLandmarker,
	DrawingUtils,
} from "@mediapipe/tasks-vision";
import blazeModelPath from "/models/blaze_face_short_range.tflite?url";
import landmarkerModelPath from "/models/face_landmarker.task?url";

let runningMode = "IMAGE";
let faceDetector;
let faceLandmarker;

/* SECTION: INITIALIZE DETECTOR */

async function initializeFaceDetector() {
	const vision = await FilesetResolver.forVisionTasks(
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
	);

	faceDetector = await FaceDetector.createFromOptions(vision, {
		baseOptions: {
			modelAssetPath: blazeModelPath,
		},
		runningMode: runningMode,
	});
}

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
		runningMode,
		numFaces: 1,
	});
}

initializeFaceDetector().then(() => {
	document.getElementById("loading").remove();
});

initializeFaceLandmarker();

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

function detectInImage() {
	const image = document.getElementById("image1");
	const faceDetectorResult = faceDetector.detect(image);
	console.log(faceDetectorResult);

	// draw the bounding box for each detection:
	let displayContainer = document.getElementById("detections-container");
	displayContainer.innerHTML = "";
	faceDetectorResult.detections.forEach(displayImageDetections, {
		image,
		displayContainer,
	});
}

function displayImageDetections(detection) {
	let boundingBox = detection.boundingBox;
	let keypoints = detection.keypoints;

	console.log(boundingBox);

	let ratio = this.image.height / this.image.naturalHeight; //since the image is scaled

	let boxLeft = boundingBox.originX * ratio;
	let boxTop = boundingBox.originY * ratio;
	let boxHeight = boundingBox.height * ratio;
	let boxWidth = boundingBox.width * ratio;

	const boundinBoxElement = document.createElement("div");
	boundinBoxElement.classList.add("bounding-box");
	boundinBoxElement.style =
		"left: " +
		boxLeft +
		"px;" +
		"top: " +
		boxTop +
		"px;" +
		"height: " +
		boxHeight +
		"px;" +
		"width: " +
		boxWidth +
		"px;";

	keypoints.forEach((keypoint) => {
		const keypointElement = document.createElement("div");
		keypointElement.classList.add("keypoint");
		keypointElement.style =
			"left: " +
			keypoint.x * this.image.width +
			"px;" +
			"top: " +
			keypoint.y * this.image.height +
			"px;";
		this.displayContainer.appendChild(keypointElement);
	});
	this.displayContainer.appendChild(boundinBoxElement);
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

// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

if (hasGetUserMedia()) {
	enableWebcamButton = document.getElementById("webcamButton");
	// enableWebcamButton.addEventListener("click", enableCam);
	enableWebcamButton.addEventListener("click", enableCamForLandmarker);
} else {
	console.warn("getUserMedia() is not supported by your browser");
}

async function enableCam(event) {
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
			video.addEventListener("loadeddata", detectInWebcam);
		})
		.catch((err) => {
			console.error(err);
		});
}

async function detectInWebcam() {
	// if image mode is initialized, create a new classifier with video runningMode
	if (runningMode === "IMAGE") {
		runningMode = "VIDEO";
		await faceDetector.setOptions({ runningMode: "VIDEO" });
	}

	let startTimeMs = performance.now();
	let displayContainer = liveView;

	// Detect faces using detectForVideo
	if (video.currentTime !== lastVideoTime) {
		lastVideoTime = video.currentTime;

		const detections = faceDetector.detectForVideo(
			video,
			startTimeMs
		).detections;

		detections.forEach(displayVideoDetections, {
			video,
			displayContainer,
		});
	}

	// Call this function again to keep predicting when the browser is ready
	window.requestAnimationFrame(detectInWebcam);
}

let children = [];

function displayVideoDetections(detection) {
	//remove any previous detections
	for (let child of children) {
		liveView.removeChild(child);
	}
	children.splice(0);

	let boundingBox = detection.boundingBox;
	let keypoints = detection.keypoints;
	let ratio = this.video.clientHeight / this.video.videoHeight;
	console.log(boundingBox);

	/* Display bounding box */
	const boundinBoxElement = document.createElement("div");
	boundinBoxElement.classList.add("bounding-box");
	boundinBoxElement.style =
		"left: " +
		boundingBox.originX * ratio +
		"px;" +
		"top: " +
		boundingBox.originY * ratio +
		"px;" +
		"height: " +
		boundingBox.height * ratio +
		"px;" +
		"width: " +
		boundingBox.width * ratio +
		"px;";
	liveView.appendChild(boundinBoxElement);
	children.push(boundinBoxElement);

	/* Display keypoints */
	keypoints.forEach((keypoint) => {
		const keypointElement = document.createElement("div");
		keypointElement.classList.add("keypoint");
		keypointElement.style =
			"left: " +
			keypoint.x * this.video.clientWidth +
			"px;" +
			"top: " +
			keypoint.y * this.video.clientHeight +
			"px;";
		liveView.appendChild(keypointElement);
		children.push(keypointElement);
	});
}

let displayContainer = document.getElementById("video-detections-container");
const canvas = document.createElement("canvas");
canvas.setAttribute("class", "canvas");
displayContainer.appendChild(canvas);

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

		if (detections.faceLandmarks) {
			/* Draw on canvas using DrawingUtils */
			const ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); //clear canvas before redrawing
			const drawingUtils = new DrawingUtils(ctx);

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
	}

	// Call this function again to keep predicting when the browser is ready
	window.requestAnimationFrame(detectLandmarksInWebcam);
}
