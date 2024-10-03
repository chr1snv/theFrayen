
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

function CliStatus(){
	this.uid             = -1;
	this.hdg             =  0;
	this.boatMapPosition = Vect_New(2);
	this.numWayps        =  0;
	this.distToNextWayp  = -1;
	this.updtCompTime    = -1;
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
	let numClients = clientUidsStrParts[0];
	while( game.clientUids.length < numClients )
		game.clientUids.push( new CliStatus() );
	for( let i = 1; i < clientUidsStrParts.length-1; ++i ){
		game.clientUids[i-1].uid = parseInt(clientUidsStrParts[i]);
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
const networkUpdateInterval = 0.25;
let lastNetworkUpdateTime = 0;
function Client_Update( boatHeading, boatMapPosition, wayps, distToNextWayP, completionTime ){
	if( sceneTime - lastNetworkUpdateTime > networkUpdateInterval ){
		lastNetworkUpdateTime = sceneTime;
		sendWebsocketServerMessage( "cliUpdS " + networkGame.svrUid + " " + localUid.val + 
									" " + boatHeading.toFixed(3)  +
									" " + boatMapPosition[0].toFixed(3) + " " + boatMapPosition[1].toFixed(3) +
									" " + wayps +
									" " + distToNextWayP.toFixed(3) +
									" " + completionTime.toFixed(3) );
	}
}


const NetworkResponseTypes = {
	clientJoinedGame	: 0,
	svrGameCreated		: 1,
	gameInfo 			: 2,
	undefined			: 4
};


let srcWebSocketSvrUrl = "\u0013\u0018\u0016SX\u001dZ@\\U\u0015\u0019\u0015\u0017VBHC\u0015\u001b\u0000\u0002\nG\u0014]^\u000e\n\u000cDA";
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
			let nAtElm = document.getElementById("networkAuthText");
			nAtElm.innerHTML = "multiplayer, certificate may need to be accepted - or server error";
			let nALElm = document.getElementById("networkAuthLink");
			let urlParts = webSocketSvrUrl.split("://");
			let url = "https://"+urlParts[1];
			nALElm.href = url;
			nALElm.text = url;
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

			//cliUpd 37831353 0.611000 -97.082000 -114.366000 1 98.160000 -1.000000

			let i = 1;
			switch( networkResponseType ){
				case NetworkResponseTypes.clientJoinedGame:
					if( responseParts[i] == "joined" ){
						++i;
						let serverUid = responseParts[i];
						if( serverUid != -1 ){
							sgMode = SailModes.ClntWatingForStart;
							lastNetworkUpdateTime = sceneTime;
						}
					}
					break;
				case NetworkResponseTypes.svrGameCreated:
					if( responseParts[i] == "newGameSvrId" ){
						++i;
						networkGame = new NetworkGame();
						NetworkGame_Parse(networkGame, responseParts, ++i)
						sgMode = SailModes.SvrWaitingForPlayers;
						lastNetworkUpdateTime = sceneTime;
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
					}else if( responseParts[1] == "cliUpd" ){
						let updtUid         = responseParts[2];
						let updtHdg         = responseParts[3];
						let updtX           = responseParts[4];
						let updtY           = responseParts[5];
						let udptNumB        = responseParts[6];
						let updtDistToNextB = responseParts[7];
						let updtCompTime    = responseParts[8];
					
						for( let i = 0; i < networkGame.clientUids.length; ++i ){
							let cliStatus = networkGame.clientUids[i];
							if( cliStatus.uid == updtUid ){
								cliStatus.hdg                =  updtUid;
								cliStatus.boatMapPosition[0] = updtX;
								cliStatus.boatMapPosition[1] = updtY;
								cliStatus.numWayps           =  udptNumB;
								cliStatus.distToNextWayp     = updtDistToNextB;
								cliStatus.updtCompTime       = updtCompTime;
								break;
							}
						}
					}
					break;
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
