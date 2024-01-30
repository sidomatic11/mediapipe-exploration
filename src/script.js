import { FilesetResolver, FaceDetector } from "@mediapipe/tasks-vision";
import blazeModelPath from "/models/blaze_face_short_range.tflite?url";

let runningMode = "IMAGE";
let faceDetector;

//-----

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

function detectInImage() {
	const image = document.getElementById("image1");
	const faceDetectorResult = faceDetector.detect(image);
	console.log(faceDetectorResult);

	// draw the bounding box for each detection:
	let displayContainer = document.getElementById("detections-container");
	displayContainer.innerHTML = "";
	faceDetectorResult.detections.forEach(drawBoundingBoxes, {
		image,
		displayContainer,
	});
}

function drawBoundingBoxes(detection) {
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
			(keypoint.x * this.image.width - 3) +
			"px;" +
			"top: " +
			(keypoint.y * this.image.height - 3) +
			"px;";
		this.displayContainer.appendChild(keypointElement);
	});
	this.displayContainer.appendChild(boundinBoxElement);
}

// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
let video = document.getElementById("webcam");
let enableWebcamButton;

if (hasGetUserMedia()) {
	enableWebcamButton = document.getElementById("webcamButton");
	enableWebcamButton.addEventListener("click", enableCam);
} else {
	console.warn("getUserMedia() is not supported by your browser");
}

async function enableCam(event) {
	// if (!faceDetector) {
	// 	alert("Face Detector is still loading. Please try again..");
	// 	return;
	// }

	// Toggle button text
	enableWebcamButton.style.display = "none";

	// getUsermedia parameters
	const constraints = {
		video: true,
	};

	// Activate the webcam stream.
	navigator.mediaDevices
		.getUserMedia(constraints)
		.then(function (stream) {
			video.srcObject = stream;
			video.addEventListener("loadeddata", predictWebcam);
		})
		.catch((err) => {
			console.error(err);
		});
}

let lastVideoTime = -1;
let liveView = document.getElementById("liveView");
async function predictWebcam() {
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
	window.requestAnimationFrame(predictWebcam);
}

let children = [];

function displayVideoDetections(detection) {
	for (let child of children) {
		liveView.removeChild(child);
	}
	children.splice(0);

	let boundingBox = detection.boundingBox;
	let keypoints = detection.keypoints;
	console.log(boundingBox);

	const boundinBoxElement = document.createElement("div");
	boundinBoxElement.classList.add("bounding-box");
	boundinBoxElement.style =
		"left: " +
		boundingBox.originX +
		"px;" +
		"top: " +
		boundingBox.originY +
		"px;" +
		"height: " +
		boundingBox.height +
		"px;" +
		"width: " +
		boundingBox.width +
		"px;";
	liveView.appendChild(boundinBoxElement);
	keypoints.forEach((keypoint) => {
		const keypointElement = document.createElement("div");
		keypointElement.classList.add("keypoint");
		keypointElement.style =
			"left: " +
			(keypoint.x * this.video.clientWidth - 3) +
			"px;" +
			"top: " +
			(keypoint.y * this.video.clientHeight - 3) +
			"px;";
		liveView.appendChild(keypointElement);
		children.push(keypointElement);
	});
	children.push(boundinBoxElement);
}

// --------

const imageTag = document.getElementById("image1");
imageTag.addEventListener("click", detectInImage);
const imageInput = document.getElementById("imageInput");

imageInput.addEventListener("change", function () {
	const file = this.files[0];
	const reader = new FileReader();
	reader.onload = function (e) {
		imageTag.src = e.target.result;
		imageTag.onload = detectInImage;
	};
	reader.readAsDataURL(file);
});

function begin() {
	initializeFaceDetector().then(() => {
		document.getElementById("loading").remove();
	});
}

begin();
