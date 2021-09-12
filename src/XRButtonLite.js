/**
 * This is a truncated VRButton.js from THREE.js
 * Bind it as click to renderer.domElement
 * @param {THREE.WebGLRenderer} renderer main renderer from THREE.js
 * @param {HTMLElement} element element the element to bind to, might be renderer.domElement or just document.body
 * @param {?Function} callback optional callback to be called when session starts (with the session as the argument) or ends (with null as the argument)
 */
export default async (renderer, element, callback) => {
	let currentSession = null;

	if (!('xr' in navigator)) throw "No XR support in browser.";
	if(!await navigator.xr.isSessionSupported( 'immersive-vr' )) throw "No immersive-vr. If you just connected your headset, refresh the page.";
		
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
