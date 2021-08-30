"use strict";

// Bind it as click to renderer.domElement
// truncated VRButton.js
// @param element the element to bind to, might be renderer.domElement or just document.body
// @param {callback} 


/**
 * 
 * @param {HTMLElement} element 
 * @param {Function} callback 
 */
async function XRButtonLite(element, callback) {

	if (!('xr' in navigator)) throw "No XR";
	if(!await navigator.xr.isSessionSupported( 'immersive-vr' )) throw "No immersive-vr";
		
	let currentSession = null;
	element.addEventListener("click", async () => {

		async function onSessionStarted( session ) {
			session.addEventListener( 'end', onSessionEnded );
			await renderer.xr.setSession( session );
			currentSession = session;
			callback && callback(currentSession);
		}

		function onSessionEnded( /*event*/ ) {
			currentSession.removeEventListener( 'end', onSessionEnded );
			currentSession = null;
			callback && callback(currentSession);
		}

		// WebXR's requestReferenceSpace only works if the corresponding feature
		// was requested at session creation time. For simplicity, just ask for
		// the interesting ones as optional features, but be aware that the
		// requestReferenceSpace call will fail if it turns out to be unavailable.
		// ('local' is always available for immersive sessions and doesn't need to
		// be requested separately.)

		console.log("currentsession", currentSession);

		if (!currentSession)
			await onSessionStarted(await navigator.xr.requestSession( 
				'immersive-vr', 
				{ optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking', 'layers' ] } 
			));
		else
			currentSession.end();
	})
}
