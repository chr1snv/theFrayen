
//ICE - Interactive Connectivity Establishment
//for connections/communication between a peerServer and peers through WebRTC using
//STUN - Session Traversal Utilities for NAT
//(using server to establish route between peers through NAT (network address translation firewalls) )
//or
//TURN - Traversal Using Relay around NAT
//(routing from   peer <-> dedicated server <-> peer )

const NetworkGameModes = {
	GatheringPlayers	: 0,
	InProgress			: 1,
	Completed 			: 2,
	UnSynced			: 3
};
function intToNetworkGameMode(i){
	switch(i){
		case 0:
			return NetworkGameModes.GatheringPlayers;
		case 1:
			return NetworkGameModes.InProgress;
		case 2:
			return NetworkGameModes.Completed;
		default:
			return NetworkGameModes.UnSynced;
	}
}

function NetworkGame(){
	this.svrUid = 0;
	this.maxPlayers = 0;
	this.clientUids = [];
	this.status = NetworkGameModes.UnSynced;
}

function NetworkGame_Parse(game, parts, sIdx){
	game.svrUid = parseInt(parts[sIdx+1]);
	game.maxPlayers = parts[sIdx+2];
	let clientUidsStr = parts[sIdx+3];
	let clientUidsStrParts = clientUidsStr.split(',');
	game.clientUids = new Array(clientUidsStrParts[0]);
	for( let i = 1; i < clientUidsStrParts.length-1; ++i ){
		game.clientUids[i-1] = parseInt(clientUidsStrParts[i]);
	}
	game.status = intToNetworkGameMode( parseInt(parts[sIdx+4]) );
}

let localUid = null;
let maxServerPlayers = 0;
let networkGame = null;
function Server_startListening( numPlayersToWaitFor ){

	if( localUid == null )
		localUid = NewRandUID();

	sendWebsocketServerMessage( "serverStarted maxPlayers: " + numPlayersToWaitFor + " uid: " + localUid.val );

}
function Server_startGame(){
	sendWebsocketServerMessage( "svrStartGame " + localUid.val );
}

//join the first open game
function Client_joinGame(){
	if( localUid == null )
		localUid = NewRandUID();
	sendWebsocketServerMessage( "clientStarted uid: " + localUid.val );
}
function Client_boatPositionUpdate( boatHeading, boatMapPosition ){
	sendWebsocketServerMessage( "clnt bMPos " + boatMapPosition + " bHdg " + boatHeading );
}


const NetworkResponseTypes = {
	clientJoinedGame	: 0,
	svrGameCreated		: 1,
	gameInfo 			: 2,
	undefined			: 3
};


let srcWebSocketSvrUrl = "\u0013\u0018_FX[GQT^\u0012\u001b\u0002\u000cKIBD\u0014\n\r\u0004K\n\u0018_\t\u0007\r\u000fJ";
let webSocketUrlKey    = "dkeiw23498sxvc9010an";
let webSocketSvrUrl   = "";
for( let i = 0; i < srcWebSocketSvrUrl.length; ++i ){
	webSocketSvrUrl += String.fromCharCode( 
				srcWebSocketSvrUrl.charCodeAt(i) ^ 
				webSocketUrlKey.charCodeAt(i%webSocketUrlKey.length) );
}


let signalingWebSocket = null;
let queuedSignalingMessage = null;
function sendWebsocketServerMessage(signalingMessage){
	if( signalingWebSocket == null ){
		queuedSignalingMessage = signalingMessage;
		signalingWebSocket = new WebSocket(webSocketSvrUrl);
		
		signalingWebSocket.onopen = () => {
			console.log( "signalingWebSocket connection opened");
			signalingWebSocket.send( queuedSignalingMessage );
		}

		signalingWebSocket.onerror = (event) => {
			console.log("signalingWebSocket.onerror " + event);
		}

		signalingWebSocket.onclose = (event) => {
			console.log("signalingWebSocket.onclose code: " + event.code);
		}

		signalingWebSocket.onmessage = (event) => {
			let response = event.data;
			console.log("signalingWebSocket.onmessage " + response);
			//parts = response.split("action-");
			responseParts = response.split(" "); //parts[1]

			let networkResponseType = NetworkResponseTypes.undefined;
			     if( responseParts[0] == 'svr' )
				networkResponseType = NetworkResponseTypes.svrGameCreated;
			else if( responseParts[0] == 'clnt' )
				networkResponseType = NetworkResponseTypes.clientJoinedGame;
			else if( responseParts[0] == 'gmInf' )
				networkResponseType = NetworkResponseTypes.gameInfo;

			let i = 1;
			switch( networkResponseType ){
				case NetworkResponseTypes.clientJoinedGame:
					if( responseParts[i] == "joined" ){
						++i;
						let serverUid = responseParts[i];
						if( serverUid != -1 ){
							sgMode = SailModes.ClntWatingForStart;
						}
					}
					break;
				case NetworkResponseTypes.svrGameCreated:
					if( responseParts[i] == "newGameSvrId" ){
						++i;
						networkGame = new NetworkGame();
						NetworkGame_Parse(networkGame, responseParts, ++i)
						sgMode = SailModes.SvrWaitingForPlayers;
					}
					break;
				case NetworkResponseTypes.gameInfo:
					if( responseParts[1] == "joined" ){
						if( networkGame == null )
							networkGame = new NetworkGame();
						NetworkGame_Parse(networkGame, responseParts, 3);
					}else if( responseParts[1] == "gameStarted" ){
						RGTTA_Start(sceneTime);
						sgMode = SailModes.NetworkGameplay;
					}
			}
			
		}
	}else{
		if( signalingWebSocket.readyState == signalingWebSocket.OPEN ){
			signalingWebSocket.send(signalingMessage);
		}else{
			console.log( "signalingWebSocket not readyToSend readyState " + signalingWebSocket.readyState );
			queuedSignalingMessage = signalingMessage;
		}
	}


}
