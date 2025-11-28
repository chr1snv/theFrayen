//# sourceURL=NetworkCommunications/NetworkCommunicationsWebRTC.js
//this is not currently used (May 30th 2025) because using only a websocket is simpler / supported on more browsers

//ICE - Interactive Connectivity Establishment
//for connections/communication between a peerServer and peers through WebRTC using
//STUN - Session Traversal Utilities for NAT
//(using server to establish route between peers through NAT (network address translation firewalls) )
//or
//TURN - Traversal Using Relay around NAT
//(routing from   peer <-> dedicated server <-> peer )

function SVR_handleNegotiationNeededEvent(event){
	console.log( "negotiationNeededEvent" + event );
	svrConnection.createOffer()
		.then( //.then is an asyncronous wait for the create offer promise result
			function(offer){
				svrConnection.setLocalDescription( offer );
			} )
		.then (
			function(){
				sendSignalingWebsocketServerMessage(JSON.stringify({
					type: "sailGameData-offer",
					sdp: svrConnection.localDescription
				}))
			}
		)
		.catch( (err) => {
				console.log( 
					"negotiationNeededEvent createOffer or sendSignalingMessage error " + err );
			});
			
			
			
	/*
	svrConnection
	.createOffer()
	.then( (offer)=> svrConnection.setLocalDescription(offer) )
	.then( () => {
		sendToServer( {
			name: myUsername,
			target: targetUsername,
			//type:
		})
	})
	*/
}
function SVR_sendToOneUser( target, msgString ){
	connectionArray.find( (conn) => conn.username == target ).send(msgString);
}
function SVR_broadcastToClients( msgString ){
	for( let clientConnection in connectionArray ){
		clientConnection.send(msgString);
	}
}
function SVR_handleICEGatheringStateChangeEvent(event){
	console.log( "handleICEGatheringStateChangeEvent" + event );
}
function SVR_handleICECanidateEvent(event){
	console.log( "SVR_handleICECanidateEvent " + event );
	if( event.candidate ){
	}
	
}

function SVR_hangUpRTCConnection(){
}

function SVR_closeRTCConnection(){
}

function svr_handleSendChannelStatusChange(evt){
	console.log( "svr_handleSendChannelStatusChange " + evt );
}

let svrConnection = null;
let svrSendChannel = null;
function Server_startListening(){

	const configuraion = { 
		'iceServers': [
			{urls: 'stun:itemfactorystudio.com:3478'},
			{urls: 'turn:itemfactorystudio.com:3478', credential: 'key1', username: 'username1'}
					]
	}

	svrConnection = new RTCPeerConnection(configuraion);
	svrConnection.onicecanidate = SVR_handleICECanidateEvent;
	svrConnection.onnegotiationneeded = SVR_handleNegotiationNeededEvent;
	svrConnection.handleICEGatheringStateChangeEvent = SVR_handleICEGatheringStateChangeEvent;
	//svrConnection.
	/*
	signalingChannel.addEventListener('message', async message => {
		}
	});
	const offer = await svrConnection.createOffer();
	await 
	*/

	// Now create an offer to connect; this starts the process

	// Create the data channel and establish its event listeners
	svrSendChannel = svrConnection.createDataChannel("sendChannel");
	svrSendChannel.onopen = svr_handleSendChannelStatusChange;
	svrSendChannel.onclose = svr_handleSendChannelStatusChange;


    /*
    .then(offer => localConnection.setLocalDescription(offer))
    .then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
    .then(() => remoteConnection.createAnswer())
    .then(answer => remoteConnection.setLocalDescription(answer))
    .then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
    .catch(handleCreateDescriptionError);
    */
}

function sendConnectionNegotiationMessage(message){
	try{
		let httpRequest = new XMLHttpRequest();
		httpRequest.onreadystatechange = function(){
			if(httpRequest.readyState == 4){
				if(httpRequest.status == 200 || httpRequest.status == 0){
					callback(httpRequest.responseText, thisP); //callback
				}
				else{
					let fileParts = filename.split('.');
					let fileSuffix = fileParts[fileParts.length-1];

					if(!( fileSuffix == "hvtIPO" ||
						  fileSuffix == "hvtKeys" ||
						  fileSuffix == "hvtAnim") ){
						console.log( "Unable to open file of unknown type: " +  filename);
					}
				}
			}
		}
		httpRequest.open("GET", "http://itemfactorystudio.com:3479/"+message, true);
		httpRequest.overrideMimeType("text/plain;");
		httpRequest.send();
	}catch(err){
		return undefined;
	}
}


let signalingWebSocket = null;
let queuedSignalingMessage = null;
function sendSignalingWebsocketServerMessage(signalingMessage){
	if( signalingWebSocket == null ){
		queuedSignalingMessage = signalingMessage;
		signalingWebSocket = new WebSocket("ws://itemfactorystudio.com:3479");
		
		signalingWebSocket.onopen = () => {
			console.log( "signalingWebSocket connection opened");
			signalingWebSocket.send( queuedSignalingMessage );
		}
		
		signalingWebSocket.onmessage = (event) => {
			console.log("signalingWebSocket.onmessage " + event.data);
		}
	}
	else{
		if( signalingWebSocket.readyState == signalingWebSocket.OPEN ){
			signalingWebSocket.send(signalingMessage);
		}else{
			queuedSignalingMessage = signalingMessage;
		}
	}
	
	
}
